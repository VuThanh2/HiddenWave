import numpy as np
import pytest

from hiddenwave.core.codec import StegoDecoder, StegoEncoder
from hiddenwave.core.crypto.kdf import derive_keys
from hiddenwave.core.embedding.embedders import extract_bits
from hiddenwave.core.embedding.framing import bits_to_bytes
from hiddenwave.core.embedding.selectors import KeyedShuffleSelector
from hiddenwave.core.errors import (
    AuthenticationFailedError,
    CapacityExceededError,
    InvalidInputError,
    MessageNotFoundError,
)
from hiddenwave.core.models import StegoMode
from hiddenwave.core.schemes import HARDENED_HEADER_BITS, capacity
from hiddenwave.core.wav.wav_file import WavFile
from wav_factory import build_wav

PASSPHRASE = "correct horse battery staple"
MESSAGE = "Tin nhắn bí mật — HiddenWave 🎧"


def encoder_for(mode: StegoMode) -> StegoEncoder:
    return StegoEncoder.for_mode(mode, PASSPHRASE)


def decoder_for(mode: StegoMode) -> StegoDecoder:
    return StegoDecoder.for_mode(mode, PASSPHRASE)


def flip_lsb(wav: WavFile, position: int) -> WavFile:
    samples = wav.samples.copy()
    samples[position] ^= 1
    return wav.with_samples(samples)


@pytest.mark.parametrize("mode", list(StegoMode))
class TestRoundTrip:
    def test_message_survives_on_every_fixture(self, mode: StegoMode, any_wav: bytes) -> None:
        stego = encoder_for(mode).encode(WavFile.parse(any_wav), MESSAGE).stego

        assert decoder_for(mode).decode(WavFile.parse(stego.raw)) == MESSAGE

    def test_message_exactly_at_capacity(self, mode: StegoMode, stereo_wav: bytes) -> None:
        cover = WavFile.parse(stereo_wav)
        message = "x" * capacity(mode, cover.sample_count)

        stego = encoder_for(mode).encode(cover, message).stego

        assert decoder_for(mode).decode(stego) == message

    def test_one_byte_over_capacity_is_rejected(self, mode: StegoMode, mono_cover: WavFile) -> None:
        message = "x" * (capacity(mode, mono_cover.sample_count) + 1)

        with pytest.raises(CapacityExceededError) as error:
            encoder_for(mode).encode(mono_cover, message)
        assert error.value.capacity_bytes == capacity(mode, mono_cover.sample_count)

    def test_capacity_counts_utf8_bytes_not_characters(
        self, mode: StegoMode, mono_cover: WavFile
    ) -> None:
        message = "ệ" * (capacity(mode, mono_cover.sample_count) // 3 + 1)

        with pytest.raises(CapacityExceededError):
            encoder_for(mode).encode(mono_cover, message)

    def test_empty_message_is_rejected(self, mode: StegoMode, mono_cover: WavFile) -> None:
        with pytest.raises(InvalidInputError):
            encoder_for(mode).encode(mono_cover, "")

    def test_size_and_every_non_sample_byte_are_preserved(
        self, mode: StegoMode, list_chunk_wav: bytes
    ) -> None:
        cover = WavFile.parse(list_chunk_wav)
        stego = encoder_for(mode).encode(cover, MESSAGE).stego

        assert len(stego.raw) == len(cover.raw)
        data_start = list_chunk_wav.index(b"data") + 8
        data_end = data_start + cover.sample_count * 2
        assert stego.raw[:data_start] == cover.raw[:data_start]
        assert stego.raw[data_end:] == cover.raw[data_end:]

    def test_samples_change_by_at_most_one(self, mode: StegoMode, clipped_wav: bytes) -> None:
        cover = WavFile.parse(clipped_wav)
        payload = b"\xff\x00" * (capacity(mode, cover.sample_count) // 2)

        stego = encoder_for(mode).encode_payload(cover, payload).stego

        delta = stego.samples.astype(np.int32) - cover.samples
        assert set(np.unique(delta)) <= {-1, 0, 1}

    def test_result_reports_embedding_statistics(
        self, mode: StegoMode, mono_cover: WavFile
    ) -> None:
        result = encoder_for(mode).encode(mono_cover, MESSAGE)

        changed = np.count_nonzero(result.stego.samples != mono_cover.samples)
        assert result.changed_samples == changed
        assert result.embedded_bits >= len(MESSAGE.encode()) * 8
        assert result.payload_bytes == len(MESSAGE.encode())


class TestCapacity:
    def test_classic_formula(self) -> None:
        assert capacity(StegoMode.CLASSIC, 32 + 8 * 100 + 7) == 100

    def test_hardened_formula(self) -> None:
        assert capacity(StegoMode.HARDENED, 224 + 32 + 8 * 116 + 7) == 100

    @pytest.mark.parametrize("mode", list(StegoMode))
    def test_never_negative(self, mode: StegoMode) -> None:
        assert capacity(mode, 10) == 0


class TestClassic:
    def test_embeds_sequentially_from_sample_zero(self, mono_cover: WavFile) -> None:
        result = StegoEncoder.classic().encode(mono_cover, "A")

        changed = np.flatnonzero(result.stego.samples != mono_cover.samples)
        assert changed.max() < 32 + 8

    def test_cover_without_message_is_reported(self, mono_cover: WavFile) -> None:
        with pytest.raises(MessageNotFoundError):
            StegoDecoder.classic().decode(mono_cover)

    def test_silent_file_is_reported(self, silent_wav: bytes) -> None:
        with pytest.raises(MessageNotFoundError):
            StegoDecoder.classic().decode(WavFile.parse(silent_wav))

    def test_non_utf8_payload_is_reported(self, mono_cover: WavFile) -> None:
        stego = StegoEncoder.classic().encode_payload(mono_cover, b"\xff\xfe").stego

        with pytest.raises(MessageNotFoundError):
            StegoDecoder.classic().decode(stego)

    def test_file_shorter_than_length_field(self) -> None:
        with pytest.raises(MessageNotFoundError):
            StegoDecoder.classic().decode(WavFile.parse(build_wav(np.zeros(10))))


class TestHardened:
    def test_wrong_passphrase_is_rejected(self, mono_cover: WavFile) -> None:
        stego = StegoEncoder.hardened(PASSPHRASE).encode(mono_cover, MESSAGE).stego

        with pytest.raises(AuthenticationFailedError):
            StegoDecoder.hardened("wrong passphrase").decode(stego)

    def test_cover_without_message_is_rejected(self, mono_cover: WavFile) -> None:
        with pytest.raises(AuthenticationFailedError):
            StegoDecoder.hardened(PASSPHRASE).decode(mono_cover)

    def test_classic_stego_is_rejected(self, mono_cover: WavFile) -> None:
        stego = StegoEncoder.classic().encode(mono_cover, MESSAGE).stego

        with pytest.raises(AuthenticationFailedError):
            StegoDecoder.hardened(PASSPHRASE).decode(stego)

    def test_same_input_twice_gives_different_stego_files(self, mono_cover: WavFile) -> None:
        encoder = StegoEncoder.hardened(PASSPHRASE)

        first = encoder.encode(mono_cover, MESSAGE).stego
        second = encoder.encode(mono_cover, MESSAGE).stego

        assert first.raw != second.raw
        assert (
            first.samples[:HARDENED_HEADER_BITS].tobytes()
            != second.samples[:HARDENED_HEADER_BITS].tobytes()
        )

    @pytest.mark.parametrize("region", ["salt", "nonce", "length", "ciphertext", "tag"])
    def test_flipping_one_embedded_sample_is_detected(
        self, mono_cover: WavFile, region: str
    ) -> None:
        stego = StegoEncoder.hardened(PASSPHRASE).encode(mono_cover, MESSAGE).stego
        position = self._position_in(stego, region)

        with pytest.raises(AuthenticationFailedError):
            StegoDecoder.hardened(PASSPHRASE).decode(flip_lsb(stego, position))

    def test_samples_outside_the_embedding_region_do_not_matter(self, mono_cover: WavFile) -> None:
        stego = StegoEncoder.hardened(PASSPHRASE).encode(mono_cover, MESSAGE).stego
        used = set(self._body_positions(stego).tolist())
        unused = next(i for i in range(HARDENED_HEADER_BITS, stego.sample_count) if i not in used)

        assert StegoDecoder.hardened(PASSPHRASE).decode(flip_lsb(stego, unused)) == MESSAGE

    def test_embedding_is_spread_over_the_whole_file(self, mono_cover: WavFile) -> None:
        result = StegoEncoder.hardened(PASSPHRASE).encode(mono_cover, MESSAGE)

        changed = np.flatnonzero(result.stego.samples != mono_cover.samples)
        assert changed.max() > mono_cover.sample_count * 0.8

    def test_clipped_samples_never_overflow(self, clipped_wav: bytes) -> None:
        cover = WavFile.parse(clipped_wav)
        payload = bytes([0b01010101]) * capacity(StegoMode.HARDENED, cover.sample_count)

        stego = StegoEncoder.hardened(PASSPHRASE).encode_payload(cover, payload).stego

        delta = stego.samples.astype(np.int32) - cover.samples
        assert np.abs(delta).max() == 1
        assert StegoDecoder.hardened(PASSPHRASE).decode_payload(stego) == payload

    def test_empty_passphrase_is_rejected(self) -> None:
        with pytest.raises(InvalidInputError):
            StegoEncoder.hardened("")
        with pytest.raises(InvalidInputError):
            StegoDecoder.for_mode(StegoMode.HARDENED, None)

    def test_file_too_short_for_header(self) -> None:
        with pytest.raises(AuthenticationFailedError):
            StegoDecoder.hardened(PASSPHRASE).decode(WavFile.parse(build_wav(np.zeros(100))))

    def _body_positions(self, stego: WavFile) -> np.ndarray:
        salt = bits_to_bytes(extract_bits(stego.samples, np.arange(128)))
        seed = derive_keys(PASSPHRASE, salt).shuffle_seed
        body_bits = 32 + (len(MESSAGE.encode()) + 16) * 8
        return KeyedShuffleSelector(seed).select(
            HARDENED_HEADER_BITS, stego.sample_count, body_bits
        )

    def _position_in(self, stego: WavFile, region: str) -> int:
        if region == "salt":
            return 3
        if region == "nonce":
            return 200
        body = self._body_positions(stego)
        return int({"length": body[5], "ciphertext": body[40], "tag": body[-3]}[region])
