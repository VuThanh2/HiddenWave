from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from hiddenwave.analysis.robustness import TranscoderUnavailableError, TranscodingError
from hiddenwave.core.errors import (
    AuthenticationFailedError,
    CapacityExceededError,
    HiddenWaveError,
    IncompatibleAudioError,
    InvalidInputError,
    InvalidWavError,
    MessageNotFoundError,
)


class UploadTooLargeError(HiddenWaveError):
    code = "upload_too_large"


_STATUS_BY_ERROR: dict[type[HiddenWaveError], int] = {
    InvalidWavError: status.HTTP_400_BAD_REQUEST,
    IncompatibleAudioError: status.HTTP_400_BAD_REQUEST,
    UploadTooLargeError: status.HTTP_413_CONTENT_TOO_LARGE,
    InvalidInputError: status.HTTP_422_UNPROCESSABLE_CONTENT,
    CapacityExceededError: status.HTTP_422_UNPROCESSABLE_CONTENT,
    MessageNotFoundError: status.HTTP_422_UNPROCESSABLE_CONTENT,
    AuthenticationFailedError: status.HTTP_422_UNPROCESSABLE_CONTENT,
    TranscoderUnavailableError: status.HTTP_503_SERVICE_UNAVAILABLE,
    TranscodingError: status.HTTP_502_BAD_GATEWAY,
}


def status_for(error: HiddenWaveError) -> int:
    for error_type, status_code in _STATUS_BY_ERROR.items():
        if isinstance(error, error_type):
            return status_code
    return status.HTTP_400_BAD_REQUEST


def validation_message(error: RequestValidationError) -> str:
    # Chỉ nêu tên field và lý do, không lặp lại giá trị gửi lên (có thể là passphrase).
    problems = []
    for detail in error.errors():
        field = ".".join(str(part) for part in detail["loc"] if part not in ("body", "query"))
        problems.append(f"{field}: {detail['msg']}" if field else detail["msg"])
    return "Invalid request: " + "; ".join(problems)


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(HiddenWaveError)
    def handle_domain_error(_: Request, error: HiddenWaveError) -> JSONResponse:
        return JSONResponse(
            status_code=status_for(error),
            content={"code": error.code, "message": str(error)},
        )

    # Lỗi validation của FastAPI dùng chung dạng {code, message} với lỗi domain.
    @app.exception_handler(RequestValidationError)
    def handle_validation_error(_: Request, error: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content={"code": InvalidInputError.code, "message": validation_message(error)},
        )
