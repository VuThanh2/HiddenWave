import numpy as np
import pytest

from hiddenwave.adapters.ffmpeg.transcoder import FfmpegTranscoder
from hiddenwave.analysis.robustness import TranscoderUnavailableError, check_round_trip
from hiddenwave.core.codec import StegoDecoder, StegoEncoder
from hiddenwave.core.models import StegoMode
from hiddenwave.core.wav.wav_file import WavFile

transcoder = FfmpegTranscoder()
requires_ffmpeg = pytest.mark.skipif(not transcoder.is_available(), reason="FFmpeg not available")


@requires_ffmpeg
def test_round_trip_returns_pcm16_wav_with_same_format(stereo_wav: bytes) -> None:
    cover = WavFile.parse(stereo_wav)

    restored = WavFile.parse(transcoder.round_trip(cover.raw))

    assert restored.audio_format == cover.audio_format
    assert restored.sample_count > 0


@requires_ffmpeg
@pytest.mark.parametrize("mode", list(StegoMode))
def test_mp3_destroys_the_hidden_message(mono_wav: bytes, mode: StegoMode) -> None:
    stego = StegoEncoder.for_mode(mode, "pw").encode(WavFile.parse(mono_wav), "secret").stego

    result = check_round_trip(stego, StegoDecoder.for_mode(mode, "pw"), transcoder)

    assert not result.recovered
    assert result.lsb_agreement == pytest.approx(0.5, abs=0.1)


def test_missing_executable_is_reported(monkeypatch: pytest.MonkeyPatch) -> None:
    def no_bundled_binary() -> str:
        raise RuntimeError("no binary")

    monkeypatch.setattr("imageio_ffmpeg.get_ffmpeg_exe", no_bundled_binary)
    missing = FfmpegTranscoder(executable="ffmpeg-that-does-not-exist")

    assert not missing.is_available()
    with pytest.raises(TranscoderUnavailableError):
        missing.round_trip(np.zeros(4, dtype=np.uint8).tobytes())
