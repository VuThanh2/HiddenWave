import struct

import numpy as np
import pytest

from hiddenwave.core.errors import InvalidWavError
from hiddenwave.core.models import AudioFormat
from hiddenwave.core.wav.wav_file import WavFile
from wav_factory import PCM_SUBFORMAT_GUID, build_wav, chunk, fmt_body


def riff(*chunks: bytes) -> bytes:
    body = b"WAVE" + b"".join(chunks)
    return b"RIFF" + struct.pack("<I", len(body)) + body


SAMPLES = np.array([0, 1, -1, 32767, -32768, 1234], dtype=np.int16)


class TestParsing:
    def test_reads_format_and_samples(self) -> None:
        wav = WavFile.parse(build_wav(SAMPLES, sample_rate=44100))

        assert wav.audio_format == AudioFormat(channels=1, sample_rate=44100)
        assert wav.sample_count == SAMPLES.size
        np.testing.assert_array_equal(wav.samples, SAMPLES)

    def test_stereo_frames_are_interleaved(self) -> None:
        wav = WavFile.parse(build_wav(SAMPLES, channels=2))

        assert wav.frame_count == 3
        np.testing.assert_array_equal(wav.frames[:, 0], SAMPLES[0::2])
        np.testing.assert_array_equal(wav.frames[:, 1], SAMPLES[1::2])

    def test_skips_chunks_before_data_including_pad_byte(self, list_chunk_wav: bytes) -> None:
        wav = WavFile.parse(list_chunk_wav)

        assert wav.sample_count == 10000

    def test_odd_chunk_pad_byte_is_honoured(self) -> None:
        raw = riff(
            chunk(b"fmt ", fmt_body(1)), chunk(b"odd ", b"x"), chunk(b"data", SAMPLES.tobytes())
        )

        np.testing.assert_array_equal(WavFile.parse(raw).samples, SAMPLES)

    def test_accepts_wave_format_extensible_pcm(self, extensible_wav: bytes) -> None:
        wav = WavFile.parse(extensible_wav)

        assert wav.audio_format.channels == 2

    def test_tolerates_wrong_riff_size(self) -> None:
        raw = bytearray(build_wav(SAMPLES))
        raw[4:8] = struct.pack("<I", 0xFFFFFFF0)

        assert WavFile.parse(bytes(raw)).sample_count == SAMPLES.size

    def test_ignores_broken_chunk_after_data(self) -> None:
        broken_tail = b"junk" + struct.pack("<I", 1000) + b"xx"

        raw = riff(chunk(b"fmt ", fmt_body(1)), chunk(b"data", SAMPLES.tobytes()), broken_tail)

        np.testing.assert_array_equal(WavFile.parse(raw).samples, SAMPLES)

    def test_ignores_incomplete_trailing_frame(self) -> None:
        raw = riff(chunk(b"fmt ", fmt_body(2)), chunk(b"data", SAMPLES[:5].tobytes()))

        assert WavFile.parse(raw).frame_count == 2


class TestRejection:
    @pytest.mark.parametrize(
        ("raw", "reason"),
        [
            (b"", "Not a RIFF/WAVE"),
            (b"ID3\x04\x00\x00\x00\x00\x00\x00" + b"\xff\xfb" * 100, "Not a RIFF/WAVE"),
            (b"RIFX" + b"\x00" * 40, "Not a RIFF/WAVE"),
            (riff(chunk(b"data", b"\x00\x00")), "Missing 'fmt '"),
            (riff(chunk(b"fmt ", fmt_body(1))), "Missing 'data'"),
            (riff(chunk(b"fmt ", b"\x01\x00"), chunk(b"data", b"")), "too short"),
            (riff(chunk(b"fmt ", fmt_body(1, bits=24)), chunk(b"data", b"")), "24-bit"),
            (riff(chunk(b"fmt ", fmt_body(1, bits=8)), chunk(b"data", b"")), "8-bit"),
            (
                riff(chunk(b"fmt ", fmt_body(1, bits=32, format_tag=3)), chunk(b"data", b"")),
                "IEEE float",
            ),
            (riff(chunk(b"fmt ", fmt_body(1, format_tag=0x55)), chunk(b"data", b"")), "MPEG"),
            (riff(chunk(b"fmt ", fmt_body(6)), chunk(b"data", b"")), "channel count"),
            (riff(chunk(b"fmt ", fmt_body(1, sample_rate=0)), chunk(b"data", b"")), "Sample rate"),
        ],
    )
    def test_rejects_with_reason(self, raw: bytes, reason: str) -> None:
        with pytest.raises(InvalidWavError, match=reason):
            WavFile.parse(raw)

    def test_rejects_truncated_data_chunk(self) -> None:
        raw = build_wav(SAMPLES)[:-4]

        with pytest.raises(InvalidWavError, match="truncated"):
            WavFile.parse(raw)

    def test_rejects_extensible_with_non_pcm_subformat(self) -> None:
        float_guid = b"\x03" + PCM_SUBFORMAT_GUID[1:]
        body = fmt_body(1, bits=32, extensible=True, subformat=float_guid)

        with pytest.raises(InvalidWavError, match="IEEE float"):
            WavFile.parse(riff(chunk(b"fmt ", body), chunk(b"data", b"")))

    def test_rejects_extensible_with_fewer_valid_bits(self) -> None:
        body = fmt_body(1, extensible=True, valid_bits=12)

        with pytest.raises(InvalidWavError, match="valid bits"):
            WavFile.parse(riff(chunk(b"fmt ", body), chunk(b"data", b"")))

    def test_rejects_inconsistent_block_align(self) -> None:
        body = bytearray(fmt_body(1))
        body[12:14] = struct.pack("<H", 4)

        with pytest.raises(InvalidWavError, match="block align"):
            WavFile.parse(riff(chunk(b"fmt ", bytes(body)), chunk(b"data", b"")))


class TestWithSamples:
    def test_changes_only_the_sample_bytes(self, list_chunk_wav: bytes) -> None:
        wav = WavFile.parse(list_chunk_wav)
        modified = wav.with_samples(wav.samples ^ 1)

        assert len(modified.raw) == len(wav.raw)
        changed = np.flatnonzero(
            np.frombuffer(modified.raw, np.uint8) != np.frombuffer(wav.raw, np.uint8)
        )
        data_start = list_chunk_wav.index(b"data") + 8
        assert changed.min() >= data_start
        assert changed.max() < data_start + wav.sample_count * 2

    def test_original_is_untouched(self, mono_cover: WavFile) -> None:
        before = mono_cover.raw
        mono_cover.with_samples(np.zeros(mono_cover.sample_count, dtype=np.int16))

        assert mono_cover.raw == before

    def test_samples_are_read_only(self, mono_cover: WavFile) -> None:
        with pytest.raises(ValueError):
            mono_cover.samples[0] = 1

    def test_rejects_wrong_length(self, mono_cover: WavFile) -> None:
        with pytest.raises(ValueError):
            mono_cover.with_samples(np.zeros(3, dtype=np.int16))
