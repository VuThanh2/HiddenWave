from dataclasses import dataclass
from typing import Protocol

import numpy as np

from hiddenwave.core.codec import StegoDecoder
from hiddenwave.core.errors import HiddenWaveError
from hiddenwave.core.wav.wav_file import WavFile


class TranscoderUnavailableError(HiddenWaveError):
    code = "transcoder_unavailable"


class TranscodingError(HiddenWaveError):
    code = "transcoding_failed"


class Transcoder(Protocol):
    def is_available(self) -> bool: ...

    def round_trip(self, wav: bytes) -> bytes:
        """Compress the WAV with a lossy codec and decode it back to PCM 16-bit WAV."""
        ...


@dataclass(frozen=True, slots=True)
class RobustnessResult:
    original_message: str
    recovered: bool
    recovered_message: str | None
    failure_code: str | None
    lsb_agreement: float  # ~0.5 nghĩa là LSB sau nén không còn liên quan gì tới bản gốc
    samples_before: int
    samples_after: int


def check_round_trip(
    stego: WavFile, decoder: StegoDecoder, transcoder: Transcoder
) -> RobustnessResult:
    """Decode before and after a lossy round trip; the stego must be decodable beforehand."""
    original_message = decoder.decode(stego)
    transcoded = WavFile.parse(transcoder.round_trip(stego.raw))

    recovered_message: str | None = None
    failure_code: str | None = None
    try:
        recovered_message = decoder.decode(transcoded)
    except HiddenWaveError as error:
        failure_code = error.code

    return RobustnessResult(
        original_message=original_message,
        recovered=recovered_message == original_message,
        recovered_message=recovered_message,
        failure_code=failure_code,
        lsb_agreement=_lsb_agreement(stego.samples, transcoded.samples),
        samples_before=stego.sample_count,
        samples_after=transcoded.sample_count,
    )


def _lsb_agreement(before: np.ndarray, after: np.ndarray) -> float:
    overlap = min(before.size, after.size)
    if overlap == 0:
        return float("nan")
    return float(np.mean((before[:overlap] & 1) == (after[:overlap] & 1)))
