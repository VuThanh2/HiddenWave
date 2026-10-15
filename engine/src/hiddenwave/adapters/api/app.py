import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from hiddenwave import __version__
from hiddenwave.adapters.api.dependencies import ApiSettings
from hiddenwave.adapters.api.errors import register_error_handlers
from hiddenwave.adapters.api.routers import ROUTERS
from hiddenwave.adapters.api.schemas import ErrorResponse
from hiddenwave.adapters.ffmpeg.transcoder import FfmpegTranscoder
from hiddenwave.adapters.paths import CLIENT_DIST_DIR
from hiddenwave.analysis.robustness import Transcoder

API_PREFIX = "/api"
CLIENT_DIST_ENV = "HIDDENWAVE_CLIENT_DIST"
# Mọi lỗi (domain lẫn validation) đều trả về ErrorResponse; khai báo để OpenAPI đúng contract.
ERROR_RESPONSES = {status: {"model": ErrorResponse} for status in (400, 422)}


def default_client_dist() -> Path:
    configured = os.environ.get(CLIENT_DIST_ENV)
    return Path(configured) if configured else CLIENT_DIST_DIR


def create_app(
    *,
    settings: ApiSettings | None = None,
    transcoder: Transcoder | None = None,
    client_dist: Path | None = None,
) -> FastAPI:
    app = FastAPI(
        title="HiddenWave",
        version=__version__,
        # operationId gọn (encode, decode...) để openapi-typescript sinh tên dễ đọc.
        generate_unique_id_function=lambda route: route.name,
    )
    app.state.settings = settings or ApiSettings()
    app.state.transcoder = transcoder or FfmpegTranscoder()
    register_error_handlers(app)

    for router in ROUTERS:
        app.include_router(router, prefix=API_PREFIX, responses=ERROR_RESPONSES)

    if client_dist is not None and client_dist.is_dir():
        app.mount("/", StaticFiles(directory=client_dist, html=True), name="client")
    return app
