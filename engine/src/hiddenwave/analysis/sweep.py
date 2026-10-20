"""Steganalysis of classic vs hardened mode across embedding rates."""

import os
import secrets
from collections.abc import Sequence
from dataclasses import dataclass

from hiddenwave.analysis.chi_square import (
    ChiSquareResult,
    WindowedChiSquare,
    chi_square_attack,
    sliding_chi_square,
)
from hiddenwave.analysis.metrics import distortion_metrics
from hiddenwave.analysis.rs import RsResult, rs_analysis
from hiddenwave.core.codec import StegoEncoder
from hiddenwave.core.crypto.cipher import TAG_SIZE
from hiddenwave.core.embedding.embedders import RandomBytes
from hiddenwave.core.embedding.framing import LENGTH_FIELD_BITS
from hiddenwave.core.models import StegoMode
from hiddenwave.core.schemes import HARDENED_HEADER_BITS, capacity
from hiddenwave.core.wav.wav_file import WavFile

DEFAULT_RATES = (0.05, 0.1, 0.25, 0.5, 0.75, 1.0)

_FRAME_OVERHEAD_BITS = {
    StegoMode.CLASSIC: LENGTH_FIELD_BITS,
    StegoMode.HARDENED: HARDENED_HEADER_BITS + LENGTH_FIELD_BITS + TAG_SIZE * 8,
}


@dataclass(frozen=True, slots=True)
class StegoAnalysis:
    chi_square: ChiSquareResult
    windows: WindowedChiSquare
    rs: RsResult | None


@dataclass(frozen=True, slots=True)
class SweepPoint:
    mode: StegoMode
    requested_rate: float
    embedding_rate: float  # tỉ lệ mẫu thực sự mang bit (kể cả header, length, tag)
    payload_bytes: int
    psnr_db: float
    analysis: StegoAnalysis


@dataclass(frozen=True, slots=True)
class SweepResult:
    window_size: int
    cover: StegoAnalysis
    points: tuple[SweepPoint, ...]


def default_window_size(wav: WavFile) -> int:
    """One second of interleaved samples."""
    return wav.audio_format.samples_per_second


def analyze(wav: WavFile, window_size: int, include_rs: bool = True) -> StegoAnalysis:
    samples = wav.samples
    return StegoAnalysis(
        chi_square=chi_square_attack(samples),
        windows=sliding_chi_square(samples, window_size),
        rs=rs_analysis(wav.frames) if include_rs else None,
    )


def payload_size_for_rate(mode: StegoMode, sample_count: int, rate: float) -> int:
    if not 0 < rate <= 1:
        raise ValueError(f"Embedding rate must be in (0, 1], got {rate}")
    payload_bits = int(rate * sample_count) - _FRAME_OVERHEAD_BITS[mode]
    return max(1, min(payload_bits // 8, capacity(mode, sample_count)))


def run_sweep(
    cover: WavFile,
    rates: Sequence[float] = DEFAULT_RATES,
    window_size: int | None = None,
    include_rs: bool = True,
    random_bytes: RandomBytes = os.urandom,
) -> SweepResult:
    """Embed random payloads (as random as ciphertext) at each rate with both modes."""
    window_size = window_size or default_window_size(cover)
    # Passphrase ngẫu nhiên: sweep chỉ đo dấu vết thống kê, không cần trích xuất lại.
    encoders = {
        StegoMode.CLASSIC: StegoEncoder.classic(),
        StegoMode.HARDENED: StegoEncoder.hardened(secrets.token_hex(16)),
    }

    points = []
    for rate in rates:
        for mode, encoder in encoders.items():
            payload = random_bytes(payload_size_for_rate(mode, cover.sample_count, rate))
            encoded = encoder.encode_payload(cover, payload)
            points.append(
                SweepPoint(
                    mode=mode,
                    requested_rate=rate,
                    embedding_rate=encoded.embedded_bits / cover.sample_count,
                    payload_bytes=encoded.payload_bytes,
                    psnr_db=distortion_metrics(cover.samples, encoded.stego.samples).psnr_db,
                    analysis=analyze(encoded.stego, window_size, include_rs),
                )
            )

    return SweepResult(window_size, analyze(cover, window_size, include_rs), tuple(points))
