"""WAV fixtures are generated in code so the suite needs no binary files."""

import struct

import numpy as np
import pytest

from hiddenwave.core.wav.wav_file import WavFile
from wav_factory import SAMPLE_RATE, build_wav, chunk, music_like


@pytest.fixture(scope="session")
def mono_wav() -> bytes:
    return build_wav(music_like(16000))


@pytest.fixture(scope="session")
def stereo_wav() -> bytes:
    return build_wav(music_like(12000, channels=2, seed=1), channels=2)


@pytest.fixture(scope="session")
def list_chunk_wav() -> bytes:
    # Chunk lẻ byte đứng trước data để kiểm tra pad byte.
    info = chunk(b"LIST", b"INFOISFT" + struct.pack("<I", 5) + b"test\x00")
    odd = chunk(b"junk", b"abc")
    return build_wav(
        music_like(10000, seed=2),
        chunks_before_data=(info, odd),
        chunks_after_data=(chunk(b"id3 ", b"tail"),),
    )


@pytest.fixture(scope="session")
def extensible_wav() -> bytes:
    return build_wav(music_like(9000, channels=2, seed=3), channels=2, extensible=True)


@pytest.fixture(scope="session")
def clipped_wav() -> bytes:
    """Hard-clipped audio: many samples sit exactly on +32767 / -32768."""
    signal = 60000 * np.sin(2 * np.pi * 50 * np.arange(12000) / SAMPLE_RATE)
    return build_wav(np.clip(signal, -32768, 32767))


@pytest.fixture(scope="session")
def silent_wav() -> bytes:
    return build_wav(np.zeros(6000, dtype=np.int16))


COVER_FIXTURES = ["mono_wav", "stereo_wav", "list_chunk_wav", "extensible_wav", "clipped_wav"]


@pytest.fixture(scope="session", params=COVER_FIXTURES)
def any_wav(request: pytest.FixtureRequest) -> bytes:
    return request.getfixturevalue(request.param)


@pytest.fixture(scope="session")
def all_covers(request: pytest.FixtureRequest) -> dict[str, WavFile]:
    return {name: WavFile.parse(request.getfixturevalue(name)) for name in COVER_FIXTURES}


@pytest.fixture(scope="session")
def mono_cover(mono_wav: bytes) -> WavFile:
    return WavFile.parse(mono_wav)
