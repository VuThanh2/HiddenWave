import os
from collections.abc import Callable
from typing import Protocol

import numpy as np

INT16_MIN = np.iinfo(np.int16).min
INT16_MAX = np.iinfo(np.int16).max

RandomBytes = Callable[[int], bytes]


class Embedder(Protocol):
    def embed(self, samples: np.ndarray, positions: np.ndarray, bits: np.ndarray) -> np.ndarray:
        """Return a new sample array whose LSB at each position equals the matching bit."""
        ...


def extract_bits(samples: np.ndarray, positions: np.ndarray) -> np.ndarray:
    """Identical for both embedders: the hidden bit is always the sample's LSB."""
    return (samples[positions] & 1).astype(np.uint8)


class LsbReplacement:
    def embed(self, samples: np.ndarray, positions: np.ndarray, bits: np.ndarray) -> np.ndarray:
        _check_shapes(positions, bits)
        stego = samples.astype(np.int16, copy=True)
        stego[positions] = (stego[positions] & ~np.int16(1)) | bits.astype(np.int16)
        return stego


class LsbMatching:
    """±1 embedding: matching samples stay untouched, the others move one step up or down."""

    def __init__(self, random_bytes: RandomBytes = os.urandom) -> None:
        self._random_bytes = random_bytes

    def embed(self, samples: np.ndarray, positions: np.ndarray, bits: np.ndarray) -> np.ndarray:
        _check_shapes(positions, bits)
        stego = samples.astype(np.int16, copy=True)
        mismatched = positions[(stego[positions] & 1) != bits]
        values = stego[mismatched].astype(np.int32)

        steps = np.where(self._random_signs(values.size), 1, -1)
        steps[values == INT16_MAX] = -1
        steps[values == INT16_MIN] = 1

        stego[mismatched] = (values + steps).astype(np.int16)
        return stego

    def _random_signs(self, count: int) -> np.ndarray:
        random = np.frombuffer(self._random_bytes((count + 7) // 8), dtype=np.uint8)
        return np.unpackbits(random, count=count).astype(bool)


def _check_shapes(positions: np.ndarray, bits: np.ndarray) -> None:
    if positions.shape != bits.shape:
        raise ValueError("Positions and bits must have the same shape")
