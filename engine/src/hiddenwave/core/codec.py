from __future__ import annotations

import numpy as np

from hiddenwave.core.embedding.embedders import Embedder, LsbMatching, LsbReplacement
from hiddenwave.core.errors import CapacityExceededError, InvalidInputError, MessageNotFoundError
from hiddenwave.core.models import EncodeResult, StegoMode
from hiddenwave.core.schemes import ClassicScheme, HardenedScheme, StegoScheme
from hiddenwave.core.wav.wav_file import WavFile


class StegoEncoder:
    def __init__(self, scheme: StegoScheme, embedder: Embedder) -> None:
        self._scheme = scheme
        self._embedder = embedder

    @classmethod
    def classic(cls) -> StegoEncoder:
        return cls(ClassicScheme(), LsbReplacement())

    @classmethod
    def hardened(cls, passphrase: str) -> StegoEncoder:
        return cls(HardenedScheme(passphrase), LsbMatching())

    @classmethod
    def for_mode(cls, mode: StegoMode, passphrase: str | None = None) -> StegoEncoder:
        match mode:
            case StegoMode.CLASSIC:
                return cls.classic()
            case StegoMode.HARDENED:
                return cls.hardened(passphrase or "")

    @property
    def mode(self) -> StegoMode:
        return self._scheme.mode

    def capacity(self, cover: WavFile) -> int:
        return self._scheme.capacity(cover.sample_count)

    def encode(self, cover: WavFile, message: str) -> EncodeResult:
        return self.encode_payload(cover, message.encode("utf-8"))

    def encode_payload(self, cover: WavFile, payload: bytes) -> EncodeResult:
        if not payload:
            raise InvalidInputError("Message must not be empty")
        capacity = self.capacity(cover)
        if len(payload) > capacity:
            raise CapacityExceededError(len(payload), capacity)

        positions, bits = self._scheme.plan(payload, cover.sample_count)
        stego_samples = self._embedder.embed(cover.samples, positions, bits)
        return EncodeResult(
            stego=cover.with_samples(stego_samples),
            mode=self.mode,
            payload_bytes=len(payload),
            capacity_bytes=capacity,
            embedded_bits=int(bits.size),
            changed_samples=int(np.count_nonzero(stego_samples != cover.samples)),
        )


class StegoDecoder:
    """Needs only the scheme: extraction (`y & 1`) is the same for both embedders."""

    def __init__(self, scheme: StegoScheme) -> None:
        self._scheme = scheme

    @classmethod
    def classic(cls) -> StegoDecoder:
        return cls(ClassicScheme())

    @classmethod
    def hardened(cls, passphrase: str) -> StegoDecoder:
        return cls(HardenedScheme(passphrase))

    @classmethod
    def for_mode(cls, mode: StegoMode, passphrase: str | None = None) -> StegoDecoder:
        match mode:
            case StegoMode.CLASSIC:
                return cls.classic()
            case StegoMode.HARDENED:
                return cls.hardened(passphrase or "")

    @property
    def mode(self) -> StegoMode:
        return self._scheme.mode

    def decode(self, stego: WavFile) -> str:
        payload = self.decode_payload(stego)
        try:
            return payload.decode("utf-8")
        except UnicodeDecodeError as error:
            raise MessageNotFoundError("No hidden message found (payload is not UTF-8)") from error

    def decode_payload(self, stego: WavFile) -> bytes:
        return self._scheme.extract(stego.samples)
