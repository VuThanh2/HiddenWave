from __future__ import annotations

import numpy as np

from hiddenwave.core.models import BYTES_PER_SAMPLE, AudioFormat
from hiddenwave.core.wav.riff import WavLayout, parse_wav_layout

SAMPLE_DTYPE = np.dtype("<i2")


class WavFile:
    """Immutable PCM 16-bit WAV: samples are a read-only view over the original bytes."""

    def __init__(self, raw: bytes, layout: WavLayout) -> None:
        self._raw = raw
        self._layout = layout
        # Byte lẻ của frame cuối không đủ (nếu có) được bỏ qua và giữ nguyên khi ghi.
        self._frame_count = layout.data_size // layout.audio_format.block_align

    @classmethod
    def parse(cls, raw: bytes) -> WavFile:
        raw = bytes(raw)
        return cls(raw, parse_wav_layout(raw))

    @property
    def raw(self) -> bytes:
        return self._raw

    @property
    def audio_format(self) -> AudioFormat:
        return self._layout.audio_format

    @property
    def frame_count(self) -> int:
        return self._frame_count

    @property
    def sample_count(self) -> int:
        return self._frame_count * self.audio_format.channels

    @property
    def duration_seconds(self) -> float:
        return self._frame_count / self.audio_format.sample_rate

    @property
    def samples(self) -> np.ndarray:
        """Interleaved samples (L1 R1 L2 R2 ...) as a read-only int16 array."""
        return np.frombuffer(
            self._raw, dtype=SAMPLE_DTYPE, count=self.sample_count, offset=self._layout.data_offset
        )

    @property
    def frames(self) -> np.ndarray:
        """Samples reshaped to (frame, channel)."""
        return self.samples.reshape(self._frame_count, self.audio_format.channels)

    def with_samples(self, samples: np.ndarray) -> WavFile:
        """Return a copy where only the sample bytes differ; every other byte is preserved."""
        if samples.shape != (self.sample_count,):
            raise ValueError(
                f"Expected {self.sample_count} samples, got array of shape {samples.shape}"
            )
        start = self._layout.data_offset
        end = start + self.sample_count * BYTES_PER_SAMPLE
        buffer = bytearray(self._raw)
        buffer[start:end] = samples.astype(SAMPLE_DTYPE, copy=False).tobytes()
        return WavFile(bytes(buffer), self._layout)
