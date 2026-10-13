import shutil
import subprocess
import tempfile
from pathlib import Path

import imageio_ffmpeg

from hiddenwave.analysis.robustness import TranscoderUnavailableError, TranscodingError

DEFAULT_BITRATE = "128k"
_TIMEOUT_SECONDS = 120


class FfmpegTranscoder:
    """WAV -> MP3 -> WAV (PCM 16-bit) round trip through the ffmpeg binary."""

    def __init__(self, bitrate: str = DEFAULT_BITRATE, executable: str = "ffmpeg") -> None:
        self._bitrate = bitrate
        self._executable = executable

    def is_available(self) -> bool:
        return self._resolve_executable() is not None

    def round_trip(self, wav: bytes) -> bytes:
        executable = self._resolve_executable()
        if executable is None:
            raise TranscoderUnavailableError("FFmpeg is not available on this machine")

        with tempfile.TemporaryDirectory(prefix="hiddenwave-") as workdir:
            source = Path(workdir, "source.wav")
            compressed = Path(workdir, "compressed.mp3")
            restored = Path(workdir, "restored.wav")
            source.write_bytes(wav)

            self._run(executable, source, compressed, "-c:a", "libmp3lame", "-b:a", self._bitrate)
            self._run(executable, compressed, restored, "-c:a", "pcm_s16le")
            return restored.read_bytes()

    def _resolve_executable(self) -> str | None:
        # Ưu tiên FFmpeg cài trên máy; không có thì dùng bản tĩnh đi kèm package imageio-ffmpeg.
        installed = shutil.which(self._executable)
        if installed is not None:
            return installed
        try:
            return imageio_ffmpeg.get_ffmpeg_exe()
        except RuntimeError:
            return None

    def _run(self, executable: str, source: Path, target: Path, *codec_options: str) -> None:
        command = [
            executable, "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
            "-i", str(source), *codec_options, "-map_metadata", "-1", str(target),
        ]  # fmt: skip
        try:
            subprocess.run(command, check=True, capture_output=True, timeout=_TIMEOUT_SECONDS)
        except subprocess.CalledProcessError as error:
            detail = error.stderr.decode("utf-8", errors="replace").strip()
            raise TranscodingError(f"FFmpeg failed: {detail or error}") from error
        except subprocess.TimeoutExpired as error:
            raise TranscodingError("FFmpeg timed out") from error
