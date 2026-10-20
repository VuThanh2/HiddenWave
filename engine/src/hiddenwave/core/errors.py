from typing import ClassVar


class HiddenWaveError(Exception):
    """Base class for every domain error; `code` is a stable identifier for adapters."""

    code: ClassVar[str] = "hiddenwave_error"


class InvalidWavError(HiddenWaveError):
    code = "invalid_wav"


class InvalidInputError(HiddenWaveError):
    code = "invalid_input"


class CapacityExceededError(HiddenWaveError):
    code = "capacity_exceeded"

    def __init__(self, required_bytes: int, capacity_bytes: int) -> None:
        super().__init__(
            f"Message needs {required_bytes} bytes but the cover can hold only "
            f"{capacity_bytes} bytes in this mode"
        )
        self.required_bytes = required_bytes
        self.capacity_bytes = capacity_bytes


class MessageNotFoundError(HiddenWaveError):
    code = "message_not_found"


_AUTHENTICATION_FAILED_MESSAGE = (
    "Authentication failed: wrong passphrase, modified file, or no hidden message"
)


class AuthenticationFailedError(HiddenWaveError):
    """Raised for every hardened-mode failure, so a wrong passphrase reveals nothing more."""

    code = "authentication_failed"

    def __init__(self, message: str = _AUTHENTICATION_FAILED_MESSAGE) -> None:
        super().__init__(message)


class IncompatibleAudioError(HiddenWaveError):
    code = "incompatible_audio"
