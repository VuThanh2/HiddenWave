from typing import Annotated

from fastapi import APIRouter, Form

from hiddenwave.adapters.api.dependencies import StegoWav, TranscoderDependency
from hiddenwave.adapters.api.schemas import RobustnessResponse
from hiddenwave.analysis.robustness import check_round_trip
from hiddenwave.core.codec import StegoDecoder
from hiddenwave.core.models import StegoMode

router = APIRouter(prefix="/robustness", tags=["robustness"])


@router.post("/mp3")
def mp3_round_trip(
    stego: StegoWav,
    mode: Annotated[StegoMode, Form()],
    transcoder: TranscoderDependency,
    passphrase: Annotated[str | None, Form()] = None,
) -> RobustnessResponse:
    decoder = StegoDecoder.for_mode(mode, passphrase)
    return RobustnessResponse.of(check_round_trip(stego, decoder, transcoder))
