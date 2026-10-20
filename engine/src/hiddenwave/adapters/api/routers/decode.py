from typing import Annotated

from fastapi import APIRouter, Form

from hiddenwave.adapters.api.dependencies import StegoWav
from hiddenwave.adapters.api.schemas import DecodeResponse
from hiddenwave.core.codec import StegoDecoder
from hiddenwave.core.models import StegoMode

router = APIRouter(tags=["decode"])


@router.post("/decode")
def decode(
    stego: StegoWav,
    mode: Annotated[StegoMode, Form()],
    passphrase: Annotated[str | None, Form()] = None,
) -> DecodeResponse:
    return DecodeResponse(message=StegoDecoder.for_mode(mode, passphrase).decode(stego))
