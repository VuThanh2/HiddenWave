"""`hiddenwave evaluate`: tables and figures for the report, regenerated from the cover files."""

import csv
import os
import secrets
from collections.abc import Sequence
from pathlib import Path

from hiddenwave.adapters.cli import figures
from hiddenwave.analysis.robustness import Transcoder, check_round_trip
from hiddenwave.analysis.sweep import (
    StegoAnalysis,
    SweepResult,
    payload_size_for_rate,
    run_sweep,
)
from hiddenwave.core.codec import StegoDecoder, StegoEncoder
from hiddenwave.core.models import StegoMode
from hiddenwave.core.wav.wav_file import WavFile

ROBUSTNESS_MESSAGE = "HiddenWave MP3 robustness test"
SWEEP_TABLE = "sweep.csv"
ROBUSTNESS_TABLE = "robustness.csv"


class Evaluation:
    def __init__(
        self,
        output: Path,
        rates: Sequence[float],
        include_rs: bool,
        transcoder: Transcoder | None,
    ) -> None:
        self._output = output
        self._rates = rates
        self._include_rs = include_rs
        self._transcoder = transcoder
        self._sweep_rows: list[dict[str, object]] = []
        self._robustness_rows: list[dict[str, object]] = []

    def add(self, path: Path) -> None:
        cover = WavFile.parse(path.read_bytes())
        self._output.mkdir(parents=True, exist_ok=True)

        result = run_sweep(cover, self._rates, include_rs=self._include_rs)
        self._sweep_rows.extend(_sweep_rows(path.name, result))
        self._plot(path.stem, cover, result)
        if self._transcoder is not None:
            self._robustness_rows.extend(self._robustness_rows_for(path.name, cover))

    def write_tables(self) -> list[Path]:
        written = []
        for name, rows in (
            (SWEEP_TABLE, self._sweep_rows),
            (ROBUSTNESS_TABLE, self._robustness_rows),
        ):
            if rows:
                written.append(_write_csv(self._output / name, rows))
        return written

    def _plot(self, stem: str, cover: WavFile, result: SweepResult) -> None:
        figures.plot_sweep(result, self._output / f"{stem}_sweep.png", stem)
        figures.plot_chi_square_windows(
            result,
            max(self._rates),
            cover.audio_format.samples_per_second,
            self._output / f"{stem}_chi_square_windows.png",
            stem,
        )
        full_capacity_stegos = {mode: _full_capacity_stego(cover, mode) for mode in StegoMode}
        figures.plot_difference(
            cover, full_capacity_stegos, self._output / f"{stem}_difference.png", stem
        )

    def _robustness_rows_for(self, file_name: str, cover: WavFile) -> list[dict[str, object]]:
        rows = []
        passphrase = secrets.token_hex(16)
        for mode in StegoMode:
            stego = StegoEncoder.for_mode(mode, passphrase).encode(cover, ROBUSTNESS_MESSAGE).stego
            outcome = check_round_trip(
                stego, StegoDecoder.for_mode(mode, passphrase), self._transcoder
            )
            rows.append(
                {
                    "file": file_name,
                    "mode": mode.value,
                    "recovered": outcome.recovered,
                    "failure_code": outcome.failure_code or "",
                    "lsb_agreement": outcome.lsb_agreement,
                    "samples_before": outcome.samples_before,
                    "samples_after": outcome.samples_after,
                }
            )
        return rows


def _full_capacity_stego(cover: WavFile, mode: StegoMode) -> WavFile:
    payload = os.urandom(payload_size_for_rate(mode, cover.sample_count, 1.0))
    encoder = StegoEncoder.for_mode(mode, secrets.token_hex(16))
    return encoder.encode_payload(cover, payload).stego


def _sweep_rows(file_name: str, result: SweepResult) -> list[dict[str, object]]:
    rows = [_analysis_row(file_name, "cover", 0.0, 0.0, 0, None, result.cover)]
    rows += [
        _analysis_row(
            file_name,
            point.mode.value,
            point.requested_rate,
            point.embedding_rate,
            point.payload_bytes,
            point.psnr_db,
            point.analysis,
        )
        for point in result.points
    ]
    return rows


def _analysis_row(
    file_name: str,
    mode: str,
    requested_rate: float,
    embedding_rate: float,
    payload_bytes: int,
    psnr_db: float | None,
    analysis: StegoAnalysis,
) -> dict[str, object]:
    return {
        "file": file_name,
        "mode": mode,
        "requested_rate": requested_rate,
        "embedding_rate": round(embedding_rate, 6),
        "payload_bytes": payload_bytes,
        "psnr_db": "" if psnr_db is None else round(psnr_db, 3),
        "chi2_statistic": analysis.chi_square.statistic,
        "chi2_dof": analysis.chi_square.degrees_of_freedom,
        "chi2_p_value": analysis.chi_square.p_value,
        "windows_detected_fraction": analysis.windows.detected_fraction,
        "rs_estimated_rate": "" if analysis.rs is None else analysis.rs.estimated_rate,
    }


def _write_csv(path: Path, rows: list[dict[str, object]]) -> Path:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    return path
