"""RS Analysis (Fridrich, Goljan, Du 2001) adapted to audio: groups of consecutive samples."""

import math
from collections.abc import Callable
from dataclasses import dataclass

import numpy as np

DEFAULT_MASK = (0, 1, 1, 0)
_EPSILON = 1e-12


@dataclass(frozen=True, slots=True)
class RsCounts:
    regular: float
    singular: float
    regular_negative: float
    singular_negative: float


@dataclass(frozen=True, slots=True)
class RsResult:
    estimated_rate: float  # tỉ lệ mẫu mang bit nhúng ước lượng; nan nếu phương trình vô nghiệm
    original: RsCounts
    flipped: RsCounts


def rs_analysis(frames: np.ndarray, mask: tuple[int, ...] = DEFAULT_MASK) -> RsResult:
    """`frames` is (frame, channel) or a 1-D mono signal."""
    groups = _channel_groups(frames, len(mask))
    mask_array = np.array(mask, dtype=bool)

    original = _rs_counts(groups, mask_array)
    flipped = _rs_counts(groups ^ 1, mask_array)
    return RsResult(_estimate_rate(original, flipped), original, flipped)


def _channel_groups(frames: np.ndarray, group_size: int) -> np.ndarray:
    # Nhóm không được vắt qua hai kênh: |L - R| không phản ánh độ mượt của tín hiệu.
    channels = frames.reshape(frames.shape[0], -1).T.astype(np.int32)
    group_count = channels.shape[1] // group_size
    usable = channels[:, : group_count * group_size]
    return usable.reshape(-1, group_size)


def _rs_counts(groups: np.ndarray, mask: np.ndarray) -> RsCounts:
    smoothness = _smoothness(groups)
    regular, singular = _classify(smoothness, _flip_masked(groups, mask, _flip_positive))
    regular_negative, singular_negative = _classify(
        smoothness, _flip_masked(groups, mask, _flip_negative)
    )
    return RsCounts(regular, singular, regular_negative, singular_negative)


def _smoothness(groups: np.ndarray) -> np.ndarray:
    return np.abs(np.diff(groups, axis=1)).sum(axis=1)


def _classify(smoothness: np.ndarray, flipped_groups: np.ndarray) -> tuple[float, float]:
    if smoothness.size == 0:
        return math.nan, math.nan
    flipped_smoothness = _smoothness(flipped_groups)
    return (
        float(np.mean(flipped_smoothness > smoothness)),
        float(np.mean(flipped_smoothness < smoothness)),
    )


def _flip_masked(
    groups: np.ndarray, mask: np.ndarray, flip: Callable[[np.ndarray], np.ndarray]
) -> np.ndarray:
    result = groups.copy()
    result[:, mask] = flip(groups[:, mask])
    return result


def _flip_positive(values: np.ndarray) -> np.ndarray:
    return values ^ 1  # F1: 2k <-> 2k+1


def _flip_negative(values: np.ndarray) -> np.ndarray:
    return ((values + 1) ^ 1) - 1  # F-1: 2k-1 <-> 2k


def _estimate_rate(original: RsCounts, flipped: RsCounts) -> float:
    d0 = original.regular - original.singular
    d1 = flipped.regular - flipped.singular
    d_negative0 = original.regular_negative - original.singular_negative
    d_negative1 = flipped.regular_negative - flipped.singular_negative

    a = 2 * (d1 + d0)
    b = d_negative0 - d_negative1 - d1 - 3 * d0
    c = d0 - d_negative0
    x = _smallest_root(a, b, c)
    if math.isnan(x) or abs(x - 0.5) < _EPSILON:
        return math.nan
    return x / (x - 0.5)


def _smallest_root(a: float, b: float, c: float) -> float:
    if abs(a) < _EPSILON:
        return -c / b if abs(b) >= _EPSILON else math.nan
    discriminant = b * b - 4 * a * c
    if discriminant < 0:
        return math.nan
    root = math.sqrt(discriminant)
    return min(((-b + root) / (2 * a), (-b - root) / (2 * a)), key=abs)
