import math
from dataclasses import dataclass

import numpy as np

from hiddenwave.core.errors import IncompatibleAudioError
from hiddenwave.core.wav.wav_file import WavFile

PCM16_PEAK = 32767


@dataclass(frozen=True, slots=True)
class DistortionMetrics:
    mse: float
    psnr_db: float  # inf khi hai tín hiệu giống hệt nhau
    changed_samples: int
    total_samples: int

    @property
    def change_rate(self) -> float:
        return self.changed_samples / self.total_samples if self.total_samples else 0.0


def ensure_comparable(cover: WavFile, stego: WavFile) -> None:
    if cover.audio_format != stego.audio_format:
        raise IncompatibleAudioError(
            f"Audio formats differ: {cover.audio_format} vs {stego.audio_format}"
        )
    if cover.sample_count != stego.sample_count:
        raise IncompatibleAudioError(
            f"Sample counts differ: {cover.sample_count} vs {stego.sample_count}"
        )


def distortion_metrics(cover: np.ndarray, stego: np.ndarray) -> DistortionMetrics:
    if cover.shape != stego.shape:
        raise IncompatibleAudioError("Signals must have the same number of samples")

    difference = stego.astype(np.int64) - cover.astype(np.int64)
    mse = float(np.mean(np.square(difference))) if difference.size else 0.0
    return DistortionMetrics(
        mse=mse,
        psnr_db=psnr(mse),
        changed_samples=int(np.count_nonzero(difference)),
        total_samples=int(difference.size),
    )


def psnr(mse: float, peak: int = PCM16_PEAK) -> float:
    if mse == 0:
        return math.inf
    return 10 * math.log10(peak**2 / mse)
