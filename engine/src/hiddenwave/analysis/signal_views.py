"""Chart-ready data: everything is reduced to a few thousand points before leaving the engine."""

from dataclasses import dataclass

import numpy as np
from scipy.signal import spectrogram as scipy_spectrogram

DEFAULT_ENVELOPE_BUCKETS = 2000
DEFAULT_FREQUENCY_BINS = 128
DEFAULT_TIME_BINS = 300
SPECTROGRAM_SEGMENT = 1024

_FULL_SCALE_POWER = 32768.0**2
_POWER_FLOOR = 1e-12


@dataclass(frozen=True, slots=True)
class Envelope:
    """Min/max per time bucket, shape (channel, bucket): keeps peaks that plain decimation loses."""

    times: np.ndarray
    minimum: np.ndarray
    maximum: np.ndarray


@dataclass(frozen=True, slots=True)
class DifferenceView:
    envelope: Envelope
    value_counts: dict[int, int]  # số mẫu có hiệu stego - cover bằng -1, 0, +1
    other_count: int


@dataclass(frozen=True, slots=True)
class Spectrogram:
    times: np.ndarray
    frequencies: np.ndarray
    power_db: np.ndarray  # dBFS, shape (frequency, time)


def envelope(
    frames: np.ndarray, sample_rate: int, buckets: int = DEFAULT_ENVELOPE_BUCKETS
) -> Envelope:
    starts = _bucket_starts(frames.shape[0], buckets)
    if starts.size == 0:
        empty = np.empty((frames.shape[1], 0), dtype=frames.dtype)
        return Envelope(np.empty(0), empty, empty)
    return Envelope(
        times=starts / sample_rate,
        minimum=np.minimum.reduceat(frames, starts, axis=0).T,
        maximum=np.maximum.reduceat(frames, starts, axis=0).T,
    )


def difference(
    cover_frames: np.ndarray,
    stego_frames: np.ndarray,
    sample_rate: int,
    buckets: int = DEFAULT_ENVELOPE_BUCKETS,
) -> DifferenceView:
    delta = stego_frames.astype(np.int32) - cover_frames.astype(np.int32)
    value_counts = {value: int(np.count_nonzero(delta == value)) for value in (-1, 0, 1)}
    return DifferenceView(
        envelope=envelope(delta, sample_rate, buckets),
        value_counts=value_counts,
        other_count=int(delta.size - sum(value_counts.values())),
    )


def spectrogram(
    frames: np.ndarray,
    sample_rate: int,
    frequency_bins: int = DEFAULT_FREQUENCY_BINS,
    time_bins: int = DEFAULT_TIME_BINS,
) -> Spectrogram:
    mono = frames.astype(np.float64).mean(axis=1)
    if mono.size < 2:
        return Spectrogram(np.empty(0), np.empty(0), np.empty((0, 0)))
    segment = min(SPECTROGRAM_SEGMENT, mono.size)
    frequencies, times, power = scipy_spectrogram(
        mono, fs=sample_rate, nperseg=segment, noverlap=segment // 2, scaling="spectrum"
    )

    frequency_starts = _bucket_starts(frequencies.size, frequency_bins)
    time_starts = _bucket_starts(times.size, time_bins)
    pooled = _mean_pool(_mean_pool(power, frequency_starts, axis=0), time_starts, axis=1)
    return Spectrogram(
        times=times[time_starts],
        frequencies=frequencies[frequency_starts],
        power_db=10 * np.log10(pooled / _FULL_SCALE_POWER + _POWER_FLOOR),
    )


def _bucket_starts(length: int, buckets: int) -> np.ndarray:
    if length == 0:
        return np.empty(0, dtype=np.intp)
    edges = np.linspace(0, length, min(buckets, length) + 1)[:-1]
    return np.unique(edges.astype(np.intp))


def _mean_pool(values: np.ndarray, starts: np.ndarray, axis: int) -> np.ndarray:
    # Lấy trung bình trên miền công suất (trước khi đổi sang dB) để không méo năng lượng.
    if starts.size == 0:
        return values
    sums = np.add.reduceat(values, starts, axis=axis)
    sizes = np.diff(np.append(starts, values.shape[axis]))
    shape = [1, 1]
    shape[axis] = sizes.size
    return sums / sizes.reshape(shape)
