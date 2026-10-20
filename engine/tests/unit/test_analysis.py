import math
import os

import numpy as np
import pytest

from hiddenwave.analysis.chi_square import chi_square_attack, sliding_chi_square
from hiddenwave.analysis.metrics import distortion_metrics, ensure_comparable, psnr
from hiddenwave.analysis.robustness import check_round_trip
from hiddenwave.analysis.rs import rs_analysis
from hiddenwave.analysis.signal_views import difference, envelope, spectrogram
from hiddenwave.analysis.sweep import payload_size_for_rate, run_sweep
from hiddenwave.core.codec import StegoDecoder, StegoEncoder
from hiddenwave.core.errors import IncompatibleAudioError, InvalidWavError, MessageNotFoundError
from hiddenwave.core.models import StegoMode
from hiddenwave.core.schemes import capacity
from hiddenwave.core.wav.wav_file import WavFile
from wav_factory import build_wav

PASSPHRASE = "analysis"


def full_capacity_stego(cover: WavFile, mode: StegoMode) -> WavFile:
    payload = os.urandom(capacity(mode, cover.sample_count))
    return StegoEncoder.for_mode(mode, PASSPHRASE).encode_payload(cover, payload).stego


def smooth_cover(size: int = 60000, seed: int = 0) -> WavFile:
    """Low-amplitude smooth signal: RS and Chi-square behave as in the literature."""
    rng = np.random.default_rng(seed)
    t = np.arange(size) / 8000
    return WavFile.parse(
        build_wav(np.round(300 * np.sin(2 * np.pi * 50 * t) + rng.normal(0, 1.5, size)))
    )


class TestMetrics:
    @pytest.mark.parametrize("mode", list(StegoMode))
    def test_full_random_payload_matches_theory(self, mode: StegoMode, mono_cover: WavFile) -> None:
        stego = full_capacity_stego(mono_cover, mode)

        metrics = distortion_metrics(mono_cover.samples, stego.samples)

        assert metrics.psnr_db >= 90.31
        assert metrics.psnr_db == pytest.approx(93.3, abs=0.15)
        assert metrics.change_rate == pytest.approx(0.5, abs=0.02)

    def test_identical_signals_have_infinite_psnr(self, mono_cover: WavFile) -> None:
        metrics = distortion_metrics(mono_cover.samples, mono_cover.samples)

        assert metrics.mse == 0
        assert math.isinf(metrics.psnr_db)
        assert metrics.changed_samples == 0

    def test_psnr_uses_peak_32767(self) -> None:
        assert psnr(1.0) == pytest.approx(90.309, abs=1e-3)

    def test_incompatible_files_are_rejected(self, mono_cover: WavFile, stereo_wav: bytes) -> None:
        with pytest.raises(IncompatibleAudioError):
            ensure_comparable(mono_cover, WavFile.parse(stereo_wav))


class TestChiSquare:
    def test_classic_full_embedding_is_detected_but_hardened_is_not(self) -> None:
        cover = smooth_cover()

        cover_p = chi_square_attack(cover.samples).p_value
        classic_p = chi_square_attack(full_capacity_stego(cover, StegoMode.CLASSIC).samples).p_value
        hardened_p = chi_square_attack(
            full_capacity_stego(cover, StegoMode.HARDENED).samples
        ).p_value

        assert cover_p < 0.05
        assert classic_p > 0.95
        assert hardened_p < 0.05

    def test_histogram_with_equal_pairs_gives_p_near_one(self) -> None:
        samples = np.repeat(np.arange(-50, 50, dtype=np.int16), 20)

        assert chi_square_attack(samples).p_value == pytest.approx(1.0)

    def test_too_few_categories_is_unreliable(self) -> None:
        result = chi_square_attack(np.zeros(1000, dtype=np.int16))

        assert math.isnan(result.p_value)
        assert not result.is_reliable
        assert not result.detects_embedding

    def test_sliding_windows_locate_sequential_embedding(self) -> None:
        cover = smooth_cover()
        message = os.urandom(capacity(StegoMode.CLASSIC, cover.sample_count) // 3)
        stego = StegoEncoder.classic().encode_payload(cover, message).stego

        windows = sliding_chi_square(stego.samples, window_size=10000)

        assert windows.starts.tolist() == list(range(0, 50001, 10000))
        assert windows.results[0].detects_embedding
        assert not windows.results[-1].detects_embedding


class TestRs:
    # RS có phương sai lớn trên tín hiệu ngắn; 400k mẫu cho sai số < 0.1 ổn định.
    cover_size = 400_000

    @pytest.mark.parametrize("rate", [0.25, 0.5, 0.75])
    def test_estimates_classic_embedding_rate(self, rate: float) -> None:
        cover = smooth_cover(self.cover_size)
        rng = np.random.default_rng(1)
        count = int(rate * cover.sample_count)
        # LSB replacement rải ngẫu nhiên trên toàn file, đúng giả định của RS.
        positions = rng.permutation(cover.sample_count)[:count]
        samples = cover.samples.copy()
        samples[positions] = (samples[positions] & ~1) | rng.integers(0, 2, count)

        assert rs_analysis(samples).estimated_rate == pytest.approx(rate, abs=0.1)

    def test_stereo_groups_stay_within_one_channel(self) -> None:
        rng = np.random.default_rng(3)
        t = np.arange(self.cover_size // 2) / 8000
        left = 300 * np.sin(2 * np.pi * 50 * t) + rng.normal(0, 1.5, t.size)
        right = 200 * np.sin(2 * np.pi * 80 * t + 1) + rng.normal(0, 1.5, t.size)
        frames = np.round(np.stack([left, right], axis=1)).astype(np.int16)
        count = frames.size // 2
        flat = frames.reshape(-1).copy()
        positions = rng.permutation(flat.size)[:count]
        flat[positions] = (flat[positions] & ~1) | rng.integers(0, 2, count)

        assert rs_analysis(frames).estimated_rate == pytest.approx(0, abs=0.05)
        assert rs_analysis(flat.reshape(-1, 2)).estimated_rate == pytest.approx(0.5, abs=0.1)

    def test_cover_estimate_is_near_zero(self) -> None:
        estimate = rs_analysis(smooth_cover(self.cover_size).samples).estimated_rate

        assert estimate == pytest.approx(0, abs=0.05)

    def test_hardened_embedding_is_not_flagged(self) -> None:
        stego = full_capacity_stego(smooth_cover(self.cover_size), StegoMode.HARDENED)

        assert abs(rs_analysis(stego.samples).estimated_rate) < 0.1


class TestSignalViews:
    def test_envelope_keeps_extremes_per_channel(self, stereo_wav: bytes) -> None:
        wav = WavFile.parse(stereo_wav)

        view = envelope(wav.frames, wav.audio_format.sample_rate, buckets=100)

        assert view.minimum.shape == view.maximum.shape == (2, 100)
        assert view.times.size == 100
        np.testing.assert_array_equal(view.maximum.max(axis=1), wav.frames.max(axis=0))
        np.testing.assert_array_equal(view.minimum.min(axis=1), wav.frames.min(axis=0))

    def test_envelope_of_short_signal_has_one_bucket_per_frame(self) -> None:
        frames = np.arange(10, dtype=np.int16).reshape(10, 1)

        assert envelope(frames, 8000, buckets=100).times.size == 10

    def test_difference_counts_values(self, mono_cover: WavFile) -> None:
        stego = full_capacity_stego(mono_cover, StegoMode.CLASSIC)

        view = difference(mono_cover.frames, stego.frames, 8000)

        assert sum(view.value_counts.values()) == mono_cover.sample_count
        assert view.other_count == 0

    def test_classic_difference_in_silence_is_zero_or_plus_one(self, silent_wav: bytes) -> None:
        cover = WavFile.parse(silent_wav)
        stego = full_capacity_stego(cover, StegoMode.CLASSIC)

        view = difference(cover.frames, stego.frames, 8000)

        assert view.value_counts[-1] == 0
        assert view.value_counts[1] > 0

    def test_spectrogram_is_downsampled(self, mono_cover: WavFile) -> None:
        view = spectrogram(mono_cover.frames, 8000, frequency_bins=64, time_bins=20)

        assert view.power_db.shape == (view.frequencies.size, view.times.size)
        assert view.power_db.shape[0] <= 64
        assert view.power_db.shape[1] <= 20
        assert np.isfinite(view.power_db).all()


class TestSweep:
    def test_points_for_each_rate_and_mode(self) -> None:
        cover = smooth_cover(30000)

        result = run_sweep(cover, rates=(0.25, 1.0), window_size=5000, include_rs=False)

        assert [(point.mode, point.requested_rate) for point in result.points] == [
            (StegoMode.CLASSIC, 0.25),
            (StegoMode.HARDENED, 0.25),
            (StegoMode.CLASSIC, 1.0),
            (StegoMode.HARDENED, 1.0),
        ]
        for point in result.points:
            assert point.embedding_rate == pytest.approx(point.requested_rate, abs=0.001)
            assert point.analysis.rs is None
        assert result.window_size == 5000

    def test_rejects_invalid_rate(self) -> None:
        with pytest.raises(ValueError):
            payload_size_for_rate(StegoMode.CLASSIC, 1000, 0)


class FakeTranscoder:
    def __init__(self, transform) -> None:
        self._transform = transform

    def is_available(self) -> bool:
        return True

    def round_trip(self, wav: bytes) -> bytes:
        parsed = WavFile.parse(wav)
        return parsed.with_samples(self._transform(parsed.samples)).raw


class TestRobustness:
    @pytest.mark.parametrize("mode", list(StegoMode))
    def test_lossless_round_trip_keeps_message(self, mode: StegoMode, mono_cover: WavFile) -> None:
        stego = StegoEncoder.for_mode(mode, PASSPHRASE).encode(mono_cover, "hello").stego

        result = check_round_trip(
            stego, StegoDecoder.for_mode(mode, PASSPHRASE), FakeTranscoder(lambda s: s)
        )

        assert result.recovered
        assert result.recovered_message == "hello"
        assert result.lsb_agreement == 1.0

    @pytest.mark.parametrize(
        ("mode", "failure"),
        [(StegoMode.CLASSIC, "message_not_found"), (StegoMode.HARDENED, "authentication_failed")],
    )
    def test_lossy_round_trip_destroys_message(
        self, mode: StegoMode, failure: str, mono_cover: WavFile
    ) -> None:
        stego = StegoEncoder.for_mode(mode, PASSPHRASE).encode(mono_cover, "hello").stego
        rng = np.random.default_rng(0)
        lossy = FakeTranscoder(lambda s: s ^ rng.integers(0, 2, s.size, dtype=np.int16))

        result = check_round_trip(stego, StegoDecoder.for_mode(mode, PASSPHRASE), lossy)

        assert not result.recovered
        assert result.failure_code == failure
        assert result.lsb_agreement == pytest.approx(0.5, abs=0.05)

    def test_stego_must_be_decodable_before_transcoding(self, mono_cover: WavFile) -> None:
        with pytest.raises(MessageNotFoundError):
            check_round_trip(mono_cover, StegoDecoder.classic(), FakeTranscoder(lambda s: s))

    def test_invalid_transcoder_output_is_reported(self, mono_cover: WavFile) -> None:
        stego = StegoEncoder.classic().encode(mono_cover, "hello").stego

        class BrokenTranscoder(FakeTranscoder):
            def round_trip(self, wav: bytes) -> bytes:
                return b"not a wav"

        with pytest.raises(InvalidWavError):
            check_round_trip(stego, StegoDecoder.classic(), BrokenTranscoder(None))
