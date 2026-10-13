"""Stego frame layouts: which bits go to which samples, and how to read them back."""

import os
from typing import Protocol

import numpy as np

from hiddenwave.core.crypto.cipher import NONCE_SIZE, TAG_SIZE, decrypt, encrypt
from hiddenwave.core.crypto.kdf import SALT_SIZE, derive_keys
from hiddenwave.core.embedding.embedders import RandomBytes, extract_bits
from hiddenwave.core.embedding.framing import (
    LENGTH_FIELD_BITS,
    bits_to_bytes,
    bytes_to_bits,
    length_prefixed,
    read_length,
)
from hiddenwave.core.embedding.selectors import (
    KeyedShuffleSelector,
    SampleSelector,
    SequentialSelector,
)
from hiddenwave.core.errors import (
    AuthenticationFailedError,
    InvalidInputError,
    MessageNotFoundError,
)
from hiddenwave.core.models import StegoMode

HARDENED_HEADER_BITS = (SALT_SIZE + NONCE_SIZE) * 8


def classic_capacity(sample_count: int) -> int:
    return max(0, (sample_count - LENGTH_FIELD_BITS) // 8)


def hardened_capacity(sample_count: int) -> int:
    return max(0, (sample_count - HARDENED_HEADER_BITS - LENGTH_FIELD_BITS) // 8 - TAG_SIZE)


def capacity(mode: StegoMode, sample_count: int) -> int:
    match mode:
        case StegoMode.CLASSIC:
            return classic_capacity(sample_count)
        case StegoMode.HARDENED:
            return hardened_capacity(sample_count)


class StegoScheme(Protocol):
    @property
    def mode(self) -> StegoMode: ...

    def capacity(self, sample_count: int) -> int: ...

    def plan(self, payload: bytes, sample_count: int) -> tuple[np.ndarray, np.ndarray]:
        """Return (positions, bits) to embed; the caller has already checked capacity."""
        ...

    def extract(self, samples: np.ndarray) -> bytes: ...


class ClassicScheme:
    """32-bit length + raw payload, sequential from sample 0."""

    mode = StegoMode.CLASSIC

    def __init__(self, selector: SampleSelector | None = None) -> None:
        self._selector = selector or SequentialSelector()

    def capacity(self, sample_count: int) -> int:
        return classic_capacity(sample_count)

    def plan(self, payload: bytes, sample_count: int) -> tuple[np.ndarray, np.ndarray]:
        bits = length_prefixed(payload)
        return self._selector.select(0, sample_count, bits.size), bits

    def extract(self, samples: np.ndarray) -> bytes:
        sample_count = samples.size
        if sample_count < LENGTH_FIELD_BITS:
            raise MessageNotFoundError("File is too short to contain a hidden message")

        positions = self._selector.select(0, sample_count, LENGTH_FIELD_BITS)
        length = read_length(extract_bits(samples, positions))
        if not 0 < length <= self.capacity(sample_count):
            raise MessageNotFoundError("No hidden message found (invalid length field)")

        frame_bits = LENGTH_FIELD_BITS + length * 8
        positions = self._selector.select(0, sample_count, frame_bits)[LENGTH_FIELD_BITS:]
        return bits_to_bytes(extract_bits(samples, positions))


class HardenedScheme:
    """Public salt + nonce in samples [0, 224); length + AES-GCM ciphertext in keyed order."""

    mode = StegoMode.HARDENED

    def __init__(self, passphrase: str, random_bytes: RandomBytes = os.urandom) -> None:
        if not passphrase:
            raise InvalidInputError("Passphrase must not be empty in hardened mode")
        self._passphrase = passphrase
        self._random_bytes = random_bytes
        self._header_selector = SequentialSelector()

    def capacity(self, sample_count: int) -> int:
        return hardened_capacity(sample_count)

    def plan(self, payload: bytes, sample_count: int) -> tuple[np.ndarray, np.ndarray]:
        salt = self._random_bytes(SALT_SIZE)
        nonce = self._random_bytes(NONCE_SIZE)
        keys = derive_keys(self._passphrase, salt)

        header_bits = bytes_to_bits(salt + nonce)
        body_bits = length_prefixed(encrypt(keys.aes_key, nonce, payload))
        header_positions = self._header_selector.select(0, HARDENED_HEADER_BITS, header_bits.size)
        body_positions = KeyedShuffleSelector(keys.shuffle_seed).select(
            HARDENED_HEADER_BITS, sample_count, body_bits.size
        )
        return (
            np.concatenate((header_positions, body_positions)),
            np.concatenate((header_bits, body_bits)),
        )

    def extract(self, samples: np.ndarray) -> bytes:
        sample_count = samples.size
        if sample_count < HARDENED_HEADER_BITS + LENGTH_FIELD_BITS:
            raise AuthenticationFailedError()

        header_positions = self._header_selector.select(
            0, HARDENED_HEADER_BITS, HARDENED_HEADER_BITS
        )
        header = bits_to_bytes(extract_bits(samples, header_positions))
        salt, nonce = header[:SALT_SIZE], header[SALT_SIZE:]
        keys = derive_keys(self._passphrase, salt)
        selector = KeyedShuffleSelector(keys.shuffle_seed)

        length_positions = selector.select(HARDENED_HEADER_BITS, sample_count, LENGTH_FIELD_BITS)
        length = read_length(extract_bits(samples, length_positions))
        # Sai passphrase cho ra length rác; chặn trước để không đọc quá vùng chứa.
        if not TAG_SIZE < length <= self.capacity(sample_count) + TAG_SIZE:
            raise AuthenticationFailedError()

        frame_bits = LENGTH_FIELD_BITS + length * 8
        positions = selector.select(HARDENED_HEADER_BITS, sample_count, frame_bits)
        ciphertext = bits_to_bytes(extract_bits(samples, positions[LENGTH_FIELD_BITS:]))
        return decrypt(keys.aes_key, nonce, ciphertext)
