"""Westfeld-Pfitzmann Chi-square attack on pairs of values (2k, 2k+1)."""

import math
from dataclasses import dataclass

import numpy as np
from scipy.stats import chi2

# Một cặp giá trị chỉ được tính khi tần suất kỳ vọng đủ lớn để xấp xỉ Chi-square còn đúng.
DEFAULT_MIN_EXPECTED = 5.0
DETECTION_P_VALUE = 0.95

_VALUE_OFFSET = 32768
_VALUE_COUNT = 65536


@dataclass(frozen=True, slots=True)
class ChiSquareResult:
    statistic: float
    degrees_of_freedom: int
    p_value: float  # nan khi không đủ cặp giá trị để kiểm định: kết quả không đáng tin

    @property
    def is_reliable(self) -> bool:
        return not math.isnan(self.p_value)

    @property
    def detects_embedding(self) -> bool:
        return self.is_reliable and self.p_value >= DETECTION_P_VALUE


@dataclass(frozen=True, slots=True)
class WindowedChiSquare:
    window_size: int
    step: int
    starts: np.ndarray
    results: tuple[ChiSquareResult, ...]

    @property
    def p_values(self) -> np.ndarray:
        return np.array([result.p_value for result in self.results])

    @property
    def detected_fraction(self) -> float:
        reliable = [result for result in self.results if result.is_reliable]
        if not reliable:
            return math.nan
        return sum(result.detects_embedding for result in reliable) / len(reliable)


def chi_square_attack(
    samples: np.ndarray, min_expected: float = DEFAULT_MIN_EXPECTED
) -> ChiSquareResult:
    histogram = np.bincount(samples.astype(np.int32) + _VALUE_OFFSET, minlength=_VALUE_COUNT)
    observed = histogram[0::2].astype(np.float64)
    expected = (observed + histogram[1::2]) / 2

    used = expected >= min_expected
    degrees_of_freedom = int(np.count_nonzero(used)) - 1
    if degrees_of_freedom < 1:
        return ChiSquareResult(statistic=math.nan, degrees_of_freedom=0, p_value=math.nan)

    statistic = float(np.sum((observed[used] - expected[used]) ** 2 / expected[used]))
    p_value = float(chi2.sf(statistic, degrees_of_freedom))
    return ChiSquareResult(statistic, degrees_of_freedom, p_value)


def sliding_chi_square(
    samples: np.ndarray,
    window_size: int,
    step: int | None = None,
    min_expected: float = DEFAULT_MIN_EXPECTED,
) -> WindowedChiSquare:
    step = step or window_size
    if window_size < 1 or step < 1:
        raise ValueError("Window size and step must be positive")

    last_start = max(samples.size - window_size, 0)
    starts = np.arange(0, last_start + 1, step)
    results = tuple(
        chi_square_attack(samples[start : start + window_size], min_expected) for start in starts
    )
    return WindowedChiSquare(window_size, step, starts, results)
