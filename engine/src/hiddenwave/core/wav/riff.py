import struct
from collections.abc import Iterator
from dataclasses import dataclass

from hiddenwave.core.errors import InvalidWavError
from hiddenwave.core.models import AudioFormat

WAVE_FORMAT_PCM = 0x0001
WAVE_FORMAT_EXTENSIBLE = 0xFFFE
SUPPORTED_BITS_PER_SAMPLE = 16
SUPPORTED_CHANNELS = (1, 2)

# Phần đuôi chung của mọi GUID KSDATAFORMAT_SUBTYPE_*; 2 byte đầu là format tag.
_SUBFORMAT_GUID_TAIL = bytes.fromhex("000000001000800000aa00389b71")

_RIFF_HEADER_SIZE = 12
_CHUNK_HEADER_SIZE = 8
_FMT_BASE_SIZE = 16
_FMT_EXTENSIBLE_SIZE = 40

_FORMAT_NAMES = {
    0x0002: "Microsoft ADPCM",
    0x0003: "IEEE float",
    0x0006: "A-law",
    0x0007: "mu-law",
    0x0055: "MPEG Layer III",
}


@dataclass(frozen=True, slots=True)
class Chunk:
    chunk_id: bytes
    offset: int
    size: int


@dataclass(frozen=True, slots=True)
class WavLayout:
    audio_format: AudioFormat
    data_offset: int
    data_size: int


def parse_wav_layout(raw: bytes) -> WavLayout:
    end = _riff_end(raw)
    fmt_chunk: Chunk | None = None
    data_chunk: Chunk | None = None
    for chunk in iter_chunks(raw, end):
        if chunk.chunk_id == b"fmt " and fmt_chunk is None:
            fmt_chunk = chunk
        elif chunk.chunk_id == b"data" and data_chunk is None:
            data_chunk = chunk
        if fmt_chunk and data_chunk:
            # Chunk phía sau (metadata, rác) không ảnh hưởng tới việc nhúng nên không cần đọc.
            break

    if fmt_chunk is None:
        raise InvalidWavError("Missing 'fmt ' chunk")
    if data_chunk is None:
        raise InvalidWavError("Missing 'data' chunk")

    audio_format = parse_format(raw[fmt_chunk.offset : fmt_chunk.offset + fmt_chunk.size])
    return WavLayout(audio_format, data_chunk.offset, data_chunk.size)


def iter_chunks(raw: bytes, end: int) -> Iterator[Chunk]:
    position = _RIFF_HEADER_SIZE
    while position + _CHUNK_HEADER_SIZE <= end:
        chunk_id = raw[position : position + 4]
        (size,) = struct.unpack_from("<I", raw, position + 4)
        offset = position + _CHUNK_HEADER_SIZE
        if offset + size > end:
            raise InvalidWavError(f"Chunk {chunk_id!r} is truncated (file is corrupted)")
        yield Chunk(chunk_id, offset, size)
        position = offset + size + (size & 1)


def parse_format(body: bytes) -> AudioFormat:
    if len(body) < _FMT_BASE_SIZE:
        raise InvalidWavError("'fmt ' chunk is too short")

    format_tag, channels, sample_rate, _, block_align, bits = struct.unpack_from("<HHIIHH", body)
    valid_bits = bits
    if format_tag == WAVE_FORMAT_EXTENSIBLE:
        format_tag, valid_bits = _extensible_fields(body)
    if format_tag != WAVE_FORMAT_PCM:
        name = _FORMAT_NAMES.get(format_tag, f"format tag 0x{format_tag:04X}")
        raise InvalidWavError(f"Unsupported encoding: {name} (only integer PCM is supported)")
    if bits != SUPPORTED_BITS_PER_SAMPLE:
        raise InvalidWavError(f"Unsupported bit depth: {bits}-bit (only 16-bit PCM is supported)")
    if valid_bits != SUPPORTED_BITS_PER_SAMPLE:
        raise InvalidWavError(
            f"Unsupported valid bits per sample: {valid_bits} (only 16-bit PCM is supported)"
        )
    if channels not in SUPPORTED_CHANNELS:
        raise InvalidWavError(f"Unsupported channel count: {channels} (only mono or stereo)")
    if sample_rate == 0:
        raise InvalidWavError("Sample rate must be positive")

    audio_format = AudioFormat(channels=channels, sample_rate=sample_rate)
    if block_align != audio_format.block_align:
        raise InvalidWavError(
            f"Inconsistent block align: {block_align} (expected {audio_format.block_align})"
        )
    return audio_format


def _riff_end(raw: bytes) -> int:
    if len(raw) < _RIFF_HEADER_SIZE or raw[0:4] != b"RIFF" or raw[8:12] != b"WAVE":
        raise InvalidWavError("Not a RIFF/WAVE file")
    (riff_size,) = struct.unpack_from("<I", raw, 4)
    # Nhiều phần mềm ghi sai RIFF size; chỉ tin nó khi không vượt quá độ dài thực của file.
    return min(_CHUNK_HEADER_SIZE + riff_size, len(raw))


def _extensible_fields(body: bytes) -> tuple[int, int]:
    """Return (sub-format tag, valid bits per sample) of a WAVE_FORMAT_EXTENSIBLE header."""
    if len(body) < _FMT_EXTENSIBLE_SIZE:
        raise InvalidWavError("WAVE_FORMAT_EXTENSIBLE 'fmt ' chunk is too short")
    valid_bits, _, subformat = struct.unpack_from("<HI16s", body, 18)
    if subformat[2:] != _SUBFORMAT_GUID_TAIL:
        raise InvalidWavError("Unsupported WAVE_FORMAT_EXTENSIBLE sub-format")
    (subformat_tag,) = struct.unpack_from("<H", subformat)
    return subformat_tag, valid_bits
