from typing import Protocol

import numpy as np

from hiddenwave.core.crypto.keystream import random_sort_keys

_INDEX_DTYPE = np.int64


class SampleSelector(Protocol):
    def select(self, start: int, stop: int, count: int) -> np.ndarray:
        """Return `count` distinct sample indices in [start, stop), in embedding order.

        The result for a smaller `count` is always a prefix of the result for a larger one,
        so a decoder can read the length field first and the payload afterwards.
        """
        ...


class SequentialSelector:
    def select(self, start: int, stop: int, count: int) -> np.ndarray:
        _check_range(start, stop, count)
        return np.arange(start, start + count, dtype=_INDEX_DTYPE)


class KeyedShuffleSelector:
    """Keyed pseudo-random order of the samples in a range.

    Every index gets a 64-bit key from the keystream; the order is ascending (key, index).
    This is a uniform random permutation, computed vectorized in O(N + k log k) instead of
    an element-by-element Fisher-Yates loop, and it never depends on numpy's RNG.
    """

    def __init__(self, seed: bytes) -> None:
        self._seed = seed
        self._cached_keys: np.ndarray | None = None

    def select(self, start: int, stop: int, count: int) -> np.ndarray:
        _check_range(start, stop, count)
        return _smallest_key_order(self._keys(stop - start), count) + start

    def _keys(self, size: int) -> np.ndarray:
        if self._cached_keys is None or self._cached_keys.size != size:
            self._cached_keys = random_sort_keys(self._seed, size)
        return self._cached_keys


def _smallest_key_order(keys: np.ndarray, count: int) -> np.ndarray:
    if count == 0:
        return np.empty(0, dtype=_INDEX_DTYPE)
    if count < keys.size:
        kth_key = np.partition(keys, count - 1)[count - 1]
        below = np.flatnonzero(keys < kth_key)
        # Khóa trùng (xác suất ~N²/2⁶⁵) được phá thế cân bằng theo chỉ số để kết quả luôn tất định.
        ties = np.flatnonzero(keys == kth_key)[: count - below.size]
        candidates = np.concatenate((below, ties))
    else:
        candidates = np.arange(keys.size)
    order = candidates[np.argsort(keys[candidates], kind="stable")]
    return order.astype(_INDEX_DTYPE, copy=False)


def _check_range(start: int, stop: int, count: int) -> None:
    if not 0 <= start <= stop:
        raise ValueError(f"Invalid sample range [{start}, {stop})")
    if not 0 <= count <= stop - start:
        raise ValueError(f"Cannot select {count} samples from a range of {stop - start}")
