"""Builders for synthetic WAV files, so the suite needs no binary fixtures."""

import struct

import numpy as np

SAMPLE_RATE = 8000
PCM_SUBFORMAT_GUID = bytes.fromhex("0100000000001000800000aa00389b71")


def chunk(chunk_id: bytes, body: bytes) -> bytes:
    padding = b"\x00" if len(body) % 2 else b""
    return chunk_id + struct.pack("<I", len(body)) + body + padding


def fmt_body(
    channels: int,
    sample_rate: int = SAMPLE_RATE,
    bits: int = 16,
    format_tag: int = 1,
    extensible: bool = False,
    valid_bits: int | None = None,
    subformat: bytes = PCM_SUBFORMAT_GUID,
) -> bytes:
    block_align = channels * bits // 8
    tag = 0xFFFE if extensible else format_tag
    body = struct.pack(
        "<HHIIHH", tag, channels, sample_rate, sample_rate * block_align, block_align, bits
    )
    if extensible:
        body += struct.pack("<HHI", 22, valid_bits or bits, 0) + subformat
    return body


def build_wav(
    samples: np.ndarray,
    channels: int = 1,
    sample_rate: int = SAMPLE_RATE,
    extensible: bool = False,
    chunks_before_data: tuple[bytes, ...] = (),
    chunks_after_data: tuple[bytes, ...] = (),
) -> bytes:
    data = np.asarray(samples).astype("<i2").tobytes()
    body = b"WAVE" + chunk(b"fmt ", fmt_body(channels, sample_rate, extensible=extensible))
    body += b"".join(chunks_before_data) + chunk(b"data", data) + b"".join(chunks_after_data)
    return b"RIFF" + struct.pack("<I", len(body)) + body


def music_like(frame_count: int, channels: int = 1, seed: int = 0) -> np.ndarray:
    """Tones + noise, with a stretch of digital silence like real recordings."""
    rng = np.random.default_rng(seed)
    t = np.arange(frame_count) / SAMPLE_RATE
    frames = []
    for channel in range(channels):
        tone = 5000 * np.sin(2 * np.pi * (220 + 110 * channel) * t) * np.sin(2 * np.pi * 0.7 * t)
        frames.append(tone + 800 * np.sin(2 * np.pi * 1250 * t) + rng.normal(0, 25, frame_count))
    signal = np.stack(frames, axis=1)
    signal[frame_count // 2 : frame_count // 2 + frame_count // 10] = 0
    return np.round(signal).astype(np.int16).reshape(-1)
