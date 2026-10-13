from pathlib import PurePath
from typing import Annotated
from urllib.parse import quote

from fastapi import APIRouter, File, Form, Response, UploadFile

from hiddenwave.adapters.api.dependencies import CoverWav, Settings, read_wav
from hiddenwave.adapters.api.schemas import AudioInfo, CapacityResponse
from hiddenwave.core.codec import StegoEncoder
from hiddenwave.core.models import StegoMode
from hiddenwave.core.schemes import capacity

router = APIRouter(tags=["encode"])

WAV_MEDIA_TYPE = "audio/wav"


@router.post("/capacity")
def get_capacity(cover: CoverWav) -> CapacityResponse:
    return CapacityResponse(
        audio=AudioInfo.of(cover),
        classic_bytes=capacity(StegoMode.CLASSIC, cover.sample_count),
        hardened_bytes=capacity(StegoMode.HARDENED, cover.sample_count),
    )


@router.post(
    "/encode",
    response_class=Response,
    responses={
        200: {"content": {WAV_MEDIA_TYPE: {"schema": {"type": "string", "format": "binary"}}}}
    },
)
def encode(
    cover: Annotated[UploadFile, File()],
    message: Annotated[str, Form()],
    mode: Annotated[StegoMode, Form()],
    settings: Settings,
    passphrase: Annotated[str | None, Form()] = None,
) -> Response:
    result = StegoEncoder.for_mode(mode, passphrase).encode(read_wav(cover, settings), message)
    return Response(
        content=result.stego.raw,
        media_type=WAV_MEDIA_TYPE,
        headers={
            "Content-Disposition": _attachment(_stego_filename(cover.filename)),
            "X-Payload-Bytes": str(result.payload_bytes),
            "X-Capacity-Bytes": str(result.capacity_bytes),
            "X-Embedded-Bits": str(result.embedded_bits),
            "X-Changed-Samples": str(result.changed_samples),
        },
    )


def _stego_filename(cover_filename: str | None) -> str:
    stem = PurePath(cover_filename or "cover.wav").stem or "cover"
    return f"{stem}.stego.wav"


def _attachment(filename: str) -> str:
    # filename* (RFC 5987) giữ được tên file tiếng Việt; filename thường là bản ASCII dự phòng.
    ascii_name = filename.encode("ascii", errors="replace").decode().replace('"', "")
    return f"attachment; filename=\"{ascii_name}\"; filename*=UTF-8''{quote(filename)}"
