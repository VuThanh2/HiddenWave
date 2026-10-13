from collections.abc import Callable
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, File, Request, UploadFile

from hiddenwave.adapters.api.errors import UploadTooLargeError
from hiddenwave.analysis.robustness import Transcoder
from hiddenwave.core.wav.wav_file import WavFile

DEFAULT_MAX_UPLOAD_BYTES = 128 * 1024 * 1024


@dataclass(frozen=True, slots=True)
class ApiSettings:
    max_upload_bytes: int = DEFAULT_MAX_UPLOAD_BYTES


def get_settings(request: Request) -> ApiSettings:
    return request.app.state.settings


def get_transcoder(request: Request) -> Transcoder:
    return request.app.state.transcoder


def read_wav(upload: UploadFile, settings: ApiSettings) -> WavFile:
    data = upload.file.read(settings.max_upload_bytes + 1)
    if len(data) > settings.max_upload_bytes:
        limit_mb = settings.max_upload_bytes // (1024 * 1024)
        raise UploadTooLargeError(f"Upload exceeds the {limit_mb} MB limit")
    return WavFile.parse(data)


def _wav_field(field_name: str) -> Callable[..., WavFile]:
    def dependency(
        upload: Annotated[UploadFile, File(alias=field_name)],
        settings: Annotated[ApiSettings, Depends(get_settings)],
    ) -> WavFile:
        return read_wav(upload, settings)

    return dependency


Settings = Annotated[ApiSettings, Depends(get_settings)]
TranscoderDependency = Annotated[Transcoder, Depends(get_transcoder)]
CoverWav = Annotated[WavFile, Depends(_wav_field("cover"))]
StegoWav = Annotated[WavFile, Depends(_wav_field("stego"))]
AudioWav = Annotated[WavFile, Depends(_wav_field("file"))]
