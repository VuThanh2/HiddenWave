import hashlib

import numpy as np

_SORT_KEY_DTYPE = np.dtype("<u8")


def keystream(seed: bytes, size: int) -> bytes:
    """Deterministic pseudo-random bytes (SHAKE-256 XOF), identical on every platform."""
    return hashlib.shake_256(seed).digest(size)


def random_sort_keys(seed: bytes, count: int) -> np.ndarray:
    """One uniform 64-bit key per index, used to derive a keyed permutation."""
    return np.frombuffer(keystream(seed, count * _SORT_KEY_DTYPE.itemsize), dtype=_SORT_KEY_DTYPE)
