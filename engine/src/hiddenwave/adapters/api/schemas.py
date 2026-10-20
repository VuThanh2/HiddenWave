"""HTTP DTOs. NaN/inf become null because JSON cannot represent them."""

from __future__ import annotations

import math

import numpy as np
from pydantic import BaseModel

from hiddenwave.analysis.chi_square import ChiSquareResult, WindowedChiSquare
from hiddenwave.analysis.metrics import DistortionMetrics
from hiddenwave.analysis.robustness import RobustnessResult
from hiddenwave.analysis.rs import RsCounts, RsResult
from hiddenwave.analysis.signal_views import DifferenceView, Envelope, Spectrogram
from hiddenwave.analysis.sweep import StegoAnalysis, SweepPoint, SweepResult
from hiddenwave.core.models import StegoMode
from hiddenwave.core.wav.wav_file import WavFile


def _finite(value: float) -> float | None:
    return value if math.isfinite(value) else None


def _rounded(values: np.ndarray, decimals: int) -> list:
    return np.round(values, decimals).tolist()


class ErrorResponse(BaseModel):
    code: str
    message: str


class HealthResponse(BaseModel):
    version: str
    ffmpeg_available: bool


class AudioInfo(BaseModel):
    channels: int
    sample_rate: int
    frame_count: int
    sample_count: int
    duration_seconds: float

    @classmethod
    def of(cls, wav: WavFile) -> AudioInfo:
        return cls(
            channels=wav.audio_format.channels,
            sample_rate=wav.audio_format.sample_rate,
            frame_count=wav.frame_count,
            sample_count=wav.sample_count,
            duration_seconds=wav.duration_seconds,
        )


class CapacityResponse(BaseModel):
    audio: AudioInfo
    classic_bytes: int
    hardened_bytes: int


class DecodeResponse(BaseModel):
    message: str


class DistortionModel(BaseModel):
    mse: float
    psnr_db: float | None
    changed_samples: int
    total_samples: int
    change_rate: float

    @classmethod
    def of(cls, metrics: DistortionMetrics) -> DistortionModel:
        return cls(
            mse=metrics.mse,
            psnr_db=_finite(metrics.psnr_db),
            changed_samples=metrics.changed_samples,
            total_samples=metrics.total_samples,
            change_rate=metrics.change_rate,
        )


class EnvelopeModel(BaseModel):
    times: list[float]
    minimum: list[list[int]]
    maximum: list[list[int]]

    @classmethod
    def of(cls, envelope: Envelope) -> EnvelopeModel:
        return cls(
            times=_rounded(envelope.times, 4),
            minimum=envelope.minimum.tolist(),
            maximum=envelope.maximum.tolist(),
        )


class DifferenceModel(BaseModel):
    envelope: EnvelopeModel
    minus_one: int
    zero: int
    plus_one: int
    other: int

    @classmethod
    def of(cls, view: DifferenceView) -> DifferenceModel:
        return cls(
            envelope=EnvelopeModel.of(view.envelope),
            minus_one=view.value_counts[-1],
            zero=view.value_counts[0],
            plus_one=view.value_counts[1],
            other=view.other_count,
        )


class SpectrogramModel(BaseModel):
    times: list[float]
    frequencies: list[float]
    power_db: list[list[float]]

    @classmethod
    def of(cls, spectrogram: Spectrogram) -> SpectrogramModel:
        return cls(
            times=_rounded(spectrogram.times, 3),
            frequencies=_rounded(spectrogram.frequencies, 1),
            power_db=_rounded(spectrogram.power_db, 1),
        )


class CompareResponse(BaseModel):
    audio: AudioInfo
    metrics: DistortionModel
    cover_waveform: EnvelopeModel
    stego_waveform: EnvelopeModel
    difference: DifferenceModel
    cover_spectrogram: SpectrogramModel
    stego_spectrogram: SpectrogramModel


class ChiSquareModel(BaseModel):
    statistic: float | None
    degrees_of_freedom: int
    p_value: float | None

    @classmethod
    def of(cls, result: ChiSquareResult) -> ChiSquareModel:
        return cls(
            statistic=_finite(result.statistic),
            degrees_of_freedom=result.degrees_of_freedom,
            p_value=_finite(result.p_value),
        )


class WindowedChiSquareModel(BaseModel):
    window_size: int
    step: int
    start_seconds: list[float]
    p_values: list[float | None]
    detected_fraction: float | None

    @classmethod
    def of(cls, windows: WindowedChiSquare, samples_per_second: int) -> WindowedChiSquareModel:
        return cls(
            window_size=windows.window_size,
            step=windows.step,
            start_seconds=_rounded(windows.starts / samples_per_second, 3),
            p_values=[_finite(result.p_value) for result in windows.results],
            detected_fraction=_finite(windows.detected_fraction),
        )


class ChiSquareResponse(BaseModel):
    whole_file: ChiSquareModel
    windows: WindowedChiSquareModel


class RsCountsModel(BaseModel):
    regular: float | None
    singular: float | None
    regular_negative: float | None
    singular_negative: float | None

    @classmethod
    def of(cls, counts: RsCounts) -> RsCountsModel:
        return cls(
            regular=_finite(counts.regular),
            singular=_finite(counts.singular),
            regular_negative=_finite(counts.regular_negative),
            singular_negative=_finite(counts.singular_negative),
        )


class RsResponse(BaseModel):
    estimated_rate: float | None
    original: RsCountsModel
    flipped: RsCountsModel

    @classmethod
    def of(cls, result: RsResult) -> RsResponse:
        return cls(
            estimated_rate=_finite(result.estimated_rate),
            original=RsCountsModel.of(result.original),
            flipped=RsCountsModel.of(result.flipped),
        )


class StegoAnalysisModel(BaseModel):
    chi_square: ChiSquareModel
    windows: WindowedChiSquareModel
    rs: RsResponse | None

    @classmethod
    def of(cls, analysis: StegoAnalysis, samples_per_second: int) -> StegoAnalysisModel:
        return cls(
            chi_square=ChiSquareModel.of(analysis.chi_square),
            windows=WindowedChiSquareModel.of(analysis.windows, samples_per_second),
            rs=RsResponse.of(analysis.rs) if analysis.rs else None,
        )


class SweepPointModel(BaseModel):
    mode: StegoMode
    requested_rate: float
    embedding_rate: float
    payload_bytes: int
    psnr_db: float | None
    analysis: StegoAnalysisModel

    @classmethod
    def of(cls, point: SweepPoint, samples_per_second: int) -> SweepPointModel:
        return cls(
            mode=point.mode,
            requested_rate=point.requested_rate,
            embedding_rate=point.embedding_rate,
            payload_bytes=point.payload_bytes,
            psnr_db=_finite(point.psnr_db),
            analysis=StegoAnalysisModel.of(point.analysis, samples_per_second),
        )


class SweepResponse(BaseModel):
    window_size: int
    cover: StegoAnalysisModel
    points: list[SweepPointModel]

    @classmethod
    def of(cls, result: SweepResult, samples_per_second: int) -> SweepResponse:
        return cls(
            window_size=result.window_size,
            cover=StegoAnalysisModel.of(result.cover, samples_per_second),
            points=[SweepPointModel.of(point, samples_per_second) for point in result.points],
        )


class RobustnessResponse(BaseModel):
    original_message: str
    recovered: bool
    recovered_message: str | None
    failure_code: str | None
    lsb_agreement: float | None
    samples_before: int
    samples_after: int

    @classmethod
    def of(cls, result: RobustnessResult) -> RobustnessResponse:
        return cls(
            original_message=result.original_message,
            recovered=result.recovered,
            recovered_message=result.recovered_message,
            failure_code=result.failure_code,
            lsb_agreement=_finite(result.lsb_agreement),
            samples_before=result.samples_before,
            samples_after=result.samples_after,
        )
