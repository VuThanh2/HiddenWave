from typing import Annotated

from fastapi import APIRouter, Form
from pydantic import Field

from hiddenwave.adapters.api.dependencies import AudioWav, CoverWav, StegoWav
from hiddenwave.adapters.api.schemas import (
    AudioInfo,
    ChiSquareModel,
    ChiSquareResponse,
    CompareResponse,
    DifferenceModel,
    DistortionModel,
    EnvelopeModel,
    RsResponse,
    SpectrogramModel,
    SweepResponse,
    WindowedChiSquareModel,
)
from hiddenwave.analysis.chi_square import chi_square_attack, sliding_chi_square
from hiddenwave.analysis.metrics import distortion_metrics, ensure_comparable
from hiddenwave.analysis.rs import rs_analysis
from hiddenwave.analysis.signal_views import difference, envelope, spectrogram
from hiddenwave.analysis.sweep import DEFAULT_RATES, default_window_size, run_sweep

router = APIRouter(prefix="/analyze", tags=["analyze"])

MIN_WINDOW_SIZE = 1024
MAX_SWEEP_RATES = 12

WindowSize = Annotated[int | None, Form(ge=MIN_WINDOW_SIZE)]
Rate = Annotated[float, Field(gt=0, le=1)]


@router.post("/compare")
def compare(cover: CoverWav, stego: StegoWav) -> CompareResponse:
    ensure_comparable(cover, stego)
    sample_rate = cover.audio_format.sample_rate
    return CompareResponse(
        audio=AudioInfo.of(cover),
        metrics=DistortionModel.of(distortion_metrics(cover.samples, stego.samples)),
        cover_waveform=EnvelopeModel.of(envelope(cover.frames, sample_rate)),
        stego_waveform=EnvelopeModel.of(envelope(stego.frames, sample_rate)),
        difference=DifferenceModel.of(difference(cover.frames, stego.frames, sample_rate)),
        cover_spectrogram=SpectrogramModel.of(spectrogram(cover.frames, sample_rate)),
        stego_spectrogram=SpectrogramModel.of(spectrogram(stego.frames, sample_rate)),
    )


@router.post("/chi-square")
def chi_square(
    file: AudioWav, window_size: WindowSize = None, step: WindowSize = None
) -> ChiSquareResponse:
    window_size = window_size or default_window_size(file)
    return ChiSquareResponse(
        whole_file=ChiSquareModel.of(chi_square_attack(file.samples)),
        windows=WindowedChiSquareModel.of(
            sliding_chi_square(file.samples, window_size, step),
            file.audio_format.samples_per_second,
        ),
    )


@router.post("/sweep")
def sweep(
    cover: CoverWav,
    rates: Annotated[list[Rate] | None, Form(min_length=1, max_length=MAX_SWEEP_RATES)] = None,
    window_size: WindowSize = None,
    include_rs: Annotated[bool, Form()] = True,
) -> SweepResponse:
    result = run_sweep(cover, rates or DEFAULT_RATES, window_size, include_rs)
    return SweepResponse.of(result, cover.audio_format.samples_per_second)


@router.post("/rs")
def rs(file: AudioWav) -> RsResponse:
    return RsResponse.of(rs_analysis(file.frames))
