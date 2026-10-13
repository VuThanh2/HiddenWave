from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from hiddenwave.core.wav.wav_file import WavFile

BYTES_PER_SAMPLE = 2


class StegoMode(StrEnum):
    CLASSIC = "classic"
    HARDENED = "hardened"


@dataclass(frozen=True, slots=True)
class AudioFormat:
    channels: int
    sample_rate: int

    @property
    def block_align(self) -> int:
        return self.channels * BYTES_PER_SAMPLE

    @property
    def samples_per_second(self) -> int:
        return self.sample_rate * self.channels


@dataclass(frozen=True, slots=True)
class EncodeResult:
    stego: WavFile
    mode: StegoMode
    payload_bytes: int
    capacity_bytes: int
    embedded_bits: int
    changed_samples: int
