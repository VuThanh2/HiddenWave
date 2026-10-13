from fastapi import APIRouter

from hiddenwave import __version__
from hiddenwave.adapters.api.dependencies import TranscoderDependency
from hiddenwave.adapters.api.schemas import HealthResponse

router = APIRouter(tags=["system"])


@router.get("/health")
def health(transcoder: TranscoderDependency) -> HealthResponse:
    return HealthResponse(version=__version__, ffmpeg_available=transcoder.is_available())
