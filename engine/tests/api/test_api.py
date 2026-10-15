import numpy as np
import pytest
from fastapi.testclient import TestClient

from hiddenwave import __version__
from hiddenwave.adapters.api.app import create_app
from hiddenwave.adapters.api.dependencies import ApiSettings
from hiddenwave.analysis.robustness import TranscoderUnavailableError
from hiddenwave.core.models import StegoMode
from hiddenwave.core.schemes import capacity
from hiddenwave.core.wav.wav_file import WavFile

PASSPHRASE = "api passphrase"
MESSAGE = "Xin chào từ HiddenWave"


class FakeTranscoder:
    def __init__(self, available: bool = True, destroy_lsb: bool = True) -> None:
        self._available = available
        self._destroy_lsb = destroy_lsb

    def is_available(self) -> bool:
        return self._available

    def round_trip(self, wav: bytes) -> bytes:
        if not self._available:
            raise TranscoderUnavailableError("FFmpeg is not installed")
        parsed = WavFile.parse(wav)
        noise = np.random.default_rng(0).integers(0, 2, parsed.sample_count, dtype=np.int16)
        samples = parsed.samples ^ noise if self._destroy_lsb else parsed.samples
        return parsed.with_samples(samples).raw


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app(transcoder=FakeTranscoder()))


def wav_file(field: str, raw: bytes, name: str = "cover.wav") -> dict:
    return {field: (name, raw, "audio/wav")}


def encode(client: TestClient, cover: bytes, mode: StegoMode, message: str = MESSAGE) -> bytes:
    data = {"message": message, "mode": mode.value, "passphrase": PASSPHRASE}
    response = client.post("/api/encode", files=wav_file("cover", cover), data=data)
    assert response.status_code == 200, response.text
    return response.content


def test_health_reports_version_and_ffmpeg(client: TestClient) -> None:
    response = client.get("/api/health")

    assert response.json() == {"version": __version__, "ffmpeg_available": True}


def test_capacity_for_both_modes(client: TestClient, stereo_wav: bytes) -> None:
    response = client.post("/api/capacity", files=wav_file("cover", stereo_wav))

    body = response.json()
    sample_count = body["audio"]["sample_count"]
    assert body["audio"]["channels"] == 2
    assert body["classic_bytes"] == capacity(StegoMode.CLASSIC, sample_count)
    assert body["hardened_bytes"] == capacity(StegoMode.HARDENED, sample_count)


@pytest.mark.parametrize("mode", list(StegoMode))
def test_encode_then_decode(client: TestClient, mono_wav: bytes, mode: StegoMode) -> None:
    stego = encode(client, mono_wav, mode)

    response = client.post(
        "/api/decode",
        files=wav_file("stego", stego),
        data={"mode": mode.value, "passphrase": PASSPHRASE},
    )

    assert response.status_code == 200
    assert response.json() == {"message": MESSAGE}


def test_encode_returns_wav_attachment_with_statistics(client: TestClient, mono_wav: bytes) -> None:
    response = client.post(
        "/api/encode",
        files=wav_file("cover", mono_wav, name="bài hát.wav"),
        data={"message": MESSAGE, "mode": "classic"},
    )

    assert response.headers["content-type"] == "audio/wav"
    assert (
        "filename*=UTF-8''b%C3%A0i%20h%C3%A1t.stego.wav" in response.headers["content-disposition"]
    )
    assert int(response.headers["x-payload-bytes"]) == len(MESSAGE.encode())
    assert int(response.headers["x-changed-samples"]) > 0
    assert len(response.content) == len(mono_wav)


@pytest.mark.parametrize(
    ("endpoint", "status", "code"),
    [
        ("/api/capacity", 400, "invalid_wav"),
        ("/api/analyze/rs", 400, "invalid_wav"),
    ],
)
def test_invalid_wav_is_rejected(client: TestClient, endpoint: str, status: int, code: str) -> None:
    field = "file" if "analyze" in endpoint else "cover"

    response = client.post(endpoint, files=wav_file(field, b"ID3 not really a wav"))

    assert response.status_code == status
    assert response.json()["code"] == code


def test_wrong_passphrase_is_rejected(client: TestClient, mono_wav: bytes) -> None:
    stego = encode(client, mono_wav, StegoMode.HARDENED)

    response = client.post(
        "/api/decode",
        files=wav_file("stego", stego),
        data={"mode": "hardened", "passphrase": "wrong"},
    )

    assert response.status_code == 422
    assert response.json()["code"] == "authentication_failed"


def test_hardened_without_passphrase_is_rejected(client: TestClient, mono_wav: bytes) -> None:
    response = client.post(
        "/api/encode", files=wav_file("cover", mono_wav), data={"message": "x", "mode": "hardened"}
    )

    assert response.status_code == 422
    assert response.json()["code"] == "invalid_input"


def test_capacity_exceeded(client: TestClient, mono_wav: bytes) -> None:
    response = client.post(
        "/api/encode",
        files=wav_file("cover", mono_wav),
        data={"message": "x" * 100_000, "mode": "classic"},
    )

    assert response.status_code == 422
    assert response.json()["code"] == "capacity_exceeded"


def test_upload_limit(mono_wav: bytes) -> None:
    client = TestClient(create_app(settings=ApiSettings(max_upload_bytes=1000)))

    response = client.post("/api/capacity", files=wav_file("cover", mono_wav))

    assert response.status_code == 413
    assert response.json()["code"] == "upload_too_large"


def test_compare(client: TestClient, stereo_wav: bytes) -> None:
    stego = encode(client, stereo_wav, StegoMode.CLASSIC)

    response = client.post(
        "/api/analyze/compare",
        files={**wav_file("cover", stereo_wav), **wav_file("stego", stego)},
    )

    body = response.json()
    assert response.status_code == 200
    assert body["metrics"]["psnr_db"] > 90.31
    assert body["difference"]["other"] == 0
    assert len(body["cover_waveform"]["minimum"]) == 2
    assert len(body["stego_spectrogram"]["power_db"]) == len(
        body["stego_spectrogram"]["frequencies"]
    )


def test_compare_identical_files_has_null_psnr(client: TestClient, mono_wav: bytes) -> None:
    response = client.post(
        "/api/analyze/compare",
        files={**wav_file("cover", mono_wav), **wav_file("stego", mono_wav)},
    )

    assert response.json()["metrics"]["psnr_db"] is None


def test_compare_rejects_mismatched_files(
    client: TestClient, mono_wav: bytes, stereo_wav: bytes
) -> None:
    response = client.post(
        "/api/analyze/compare",
        files={**wav_file("cover", mono_wav), **wav_file("stego", stereo_wav)},
    )

    assert response.status_code == 400
    assert response.json()["code"] == "incompatible_audio"


def test_chi_square(client: TestClient, mono_wav: bytes) -> None:
    response = client.post(
        "/api/analyze/chi-square", files=wav_file("file", mono_wav), data={"window_size": "4000"}
    )

    body = response.json()
    assert body["windows"]["window_size"] == 4000
    assert len(body["windows"]["p_values"]) == len(body["windows"]["start_seconds"]) == 4
    assert body["windows"]["start_seconds"][1] == 0.5


def test_chi_square_rejects_tiny_window(client: TestClient, mono_wav: bytes) -> None:
    response = client.post(
        "/api/analyze/chi-square", files=wav_file("file", mono_wav), data={"window_size": "10"}
    )

    assert response.status_code == 422


def test_sweep(client: TestClient, mono_wav: bytes) -> None:
    response = client.post(
        "/api/analyze/sweep",
        files=wav_file("cover", mono_wav),
        data={"rates": ["0.5", "1"], "include_rs": "false"},
    )

    body = response.json()
    assert response.status_code == 200, response.text
    assert [(p["mode"], p["requested_rate"]) for p in body["points"]] == [
        ("classic", 0.5),
        ("hardened", 0.5),
        ("classic", 1.0),
        ("hardened", 1.0),
    ]
    assert body["cover"]["rs"] is None


def test_sweep_rejects_rate_out_of_range(client: TestClient, mono_wav: bytes) -> None:
    response = client.post(
        "/api/analyze/sweep", files=wav_file("cover", mono_wav), data={"rates": ["1.5"]}
    )

    assert response.status_code == 422


def test_rs(client: TestClient, mono_wav: bytes) -> None:
    response = client.post("/api/analyze/rs", files=wav_file("file", mono_wav))

    assert set(response.json()) == {"estimated_rate", "original", "flipped"}


@pytest.mark.parametrize("mode", list(StegoMode))
def test_mp3_robustness(client: TestClient, mono_wav: bytes, mode: StegoMode) -> None:
    stego = encode(client, mono_wav, mode)

    response = client.post(
        "/api/robustness/mp3",
        files=wav_file("stego", stego),
        data={"mode": mode.value, "passphrase": PASSPHRASE},
    )

    body = response.json()
    assert body["original_message"] == MESSAGE
    assert body["recovered"] is False
    assert body["failure_code"] is not None


def test_mp3_robustness_without_ffmpeg(mono_wav: bytes) -> None:
    client = TestClient(create_app(transcoder=FakeTranscoder(available=False)))
    stego = encode(client, mono_wav, StegoMode.CLASSIC)

    health = client.get("/api/health").json()
    response = client.post(
        "/api/robustness/mp3", files=wav_file("stego", stego), data={"mode": "classic"}
    )

    assert health["ffmpeg_available"] is False
    assert response.status_code == 503
    assert response.json()["code"] == "transcoder_unavailable"


def test_serves_client_build(tmp_path) -> None:
    (tmp_path / "index.html").write_text("<h1>HiddenWave</h1>")
    client = TestClient(create_app(client_dist=tmp_path))

    assert "HiddenWave" in client.get("/").text
    assert client.get("/api/health").status_code == 200


def test_empty_message_uses_error_shape(client: TestClient, mono_wav: bytes) -> None:
    response = client.post(
        "/api/encode", files=wav_file("cover", mono_wav), data={"message": "", "mode": "classic"}
    )

    assert response.status_code == 422
    assert response.json()["code"] == "invalid_input"
    assert "message" in response.json()["message"]


def test_validation_error_does_not_echo_input(client: TestClient, mono_wav: bytes) -> None:
    response = client.post(
        "/api/decode",
        files=wav_file("stego", mono_wav),
        data={"mode": "not-a-mode", "passphrase": PASSPHRASE},
    )

    assert response.status_code == 422
    assert set(response.json()) == {"code", "message"}
    assert response.json()["code"] == "invalid_input"
    assert "not-a-mode" not in response.text and PASSPHRASE not in response.text


def test_openapi_documents_error_shape(client: TestClient) -> None:
    schema = client.get("/openapi.json").json()
    responses = schema["paths"]["/api/encode"]["post"]["responses"]

    assert responses["422"]["content"]["application/json"]["schema"]["$ref"].endswith(
        "/ErrorResponse"
    )
    assert "HTTPValidationError" not in schema["components"]["schemas"]
