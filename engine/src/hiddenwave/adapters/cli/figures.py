"""Static figures for the report (matplotlib object API: no pyplot global state)."""

from collections.abc import Callable, Mapping
from pathlib import Path

import numpy as np
from matplotlib.axes import Axes
from matplotlib.figure import Figure

from hiddenwave.analysis.chi_square import DETECTION_P_VALUE
from hiddenwave.analysis.sweep import SweepPoint, SweepResult
from hiddenwave.core.models import StegoMode
from hiddenwave.core.wav.wav_file import WavFile

QUIET_SEGMENT_FRAMES = 400
_DPI = 150
_MODE_COLORS = {StegoMode.CLASSIC: "tab:red", StegoMode.HARDENED: "tab:blue"}
_COVER_COLOR = "tab:gray"


def plot_sweep(result: SweepResult, path: Path, title: str) -> None:
    include_rs = result.cover.rs is not None
    figure = Figure(figsize=(14 if include_rs else 10, 4), layout="constrained")
    axes = figure.subplots(1, 3 if include_rs else 2)
    figure.suptitle(title)

    chi_axis, window_axis = axes[0], axes[1]
    _plot_by_mode(chi_axis, result, lambda point: point.analysis.chi_square.p_value)
    chi_axis.axhline(result.cover.chi_square.p_value, color=_COVER_COLOR, ls="--", label="cover")
    chi_axis.set(title="Chi-square (whole file)", ylabel="p-value", ylim=(-0.05, 1.05))

    _plot_by_mode(window_axis, result, lambda point: point.analysis.windows.detected_fraction)
    window_axis.axhline(
        result.cover.windows.detected_fraction, color=_COVER_COLOR, ls="--", label="cover"
    )
    window_axis.set(
        title=f"Windows with p ≥ {DETECTION_P_VALUE}", ylabel="fraction", ylim=(-0.05, 1.05)
    )

    if include_rs:
        rs_axis = axes[2]
        _plot_by_mode(rs_axis, result, lambda point: point.analysis.rs.estimated_rate)
        rs_axis.plot([0, 1], [0, 1], color=_COVER_COLOR, ls=":", label="ideal")
        rs_axis.set(title="RS estimated rate", ylabel="estimate")

    for axis in axes:
        axis.set_xlabel("embedding rate")
        axis.grid(alpha=0.3)
        axis.legend()
    figure.savefig(path, dpi=_DPI)


def plot_chi_square_windows(
    result: SweepResult, rate: float, samples_per_second: int, path: Path, title: str
) -> None:
    figure = Figure(figsize=(10, 4), layout="constrained")
    axis = figure.subplots()
    axis.plot(
        result.cover.windows.starts / samples_per_second,
        result.cover.windows.p_values,
        color=_COVER_COLOR,
        ls="--",
        zorder=3,
        label="cover",
    )
    for point in result.points:
        if point.requested_rate == rate:
            windows = point.analysis.windows
            axis.plot(
                windows.starts / samples_per_second,
                windows.p_values,
                color=_MODE_COLORS[point.mode],
                label=point.mode.value,
            )
    axis.axhline(DETECTION_P_VALUE, color="black", ls=":", lw=0.8)
    axis.set(
        title=f"{title} — sliding Chi-square at embedding rate {rate:g}",
        xlabel="time (s)",
        ylabel="p-value",
        ylim=(-0.05, 1.05),
    )
    axis.grid(alpha=0.3)
    axis.legend()
    figure.savefig(path, dpi=_DPI)


def plot_difference(
    cover: WavFile, stegos: Mapping[StegoMode, WavFile], path: Path, title: str
) -> None:
    """Cover waveform and stego - cover in the quietest segment (reproduces report Figure 3)."""
    start = quietest_segment_start(cover.frames[:, 0], QUIET_SEGMENT_FRAMES)
    segment = slice(start, start + QUIET_SEGMENT_FRAMES)
    frame_index = np.arange(segment.start, segment.start + QUIET_SEGMENT_FRAMES)
    cover_segment = cover.frames[segment, 0].astype(np.int32)

    figure = Figure(figsize=(10, 2.2 * (len(stegos) + 1)), layout="constrained")
    axes = figure.subplots(len(stegos) + 1, 1, sharex=True)
    figure.suptitle(f"{title} — quietest {QUIET_SEGMENT_FRAMES} frames (channel 1)")

    axes[0].plot(frame_index, cover_segment, color=_COVER_COLOR, lw=0.8)
    axes[0].set(ylabel="cover")
    for axis, (mode, stego) in zip(axes[1:], stegos.items(), strict=True):
        delta = stego.frames[segment, 0].astype(np.int32) - cover_segment
        values = ", ".join(f"{value:+d}" if value else "0" for value in np.unique(delta))
        axis.stem(frame_index, delta, linefmt=_MODE_COLORS[mode], markerfmt=" ", basefmt=" ")
        axis.set(ylabel=f"{mode.value}\nstego - cover", ylim=(-1.5, 1.5), yticks=[-1, 0, 1])
        axis.set_title(f"values: {{{values}}}", fontsize=9, loc="right")
    axes[-1].set_xlabel("frame")
    for axis in axes:
        axis.grid(alpha=0.3)
    figure.savefig(path, dpi=_DPI)


def quietest_segment_start(signal: np.ndarray, length: int) -> int:
    if signal.size <= length:
        return 0
    cumulative = np.concatenate(([0], np.cumsum(np.abs(signal.astype(np.int64)))))
    return int(np.argmin(cumulative[length:] - cumulative[:-length]))


def _plot_by_mode(
    axis: Axes, result: SweepResult, metric: Callable[[SweepPoint], float | None]
) -> None:
    for mode, color in _MODE_COLORS.items():
        points = [point for point in result.points if point.mode is mode]
        axis.plot(
            [point.requested_rate for point in points],
            [metric(point) for point in points],
            marker="o",
            color=color,
            label=mode.value,
        )
