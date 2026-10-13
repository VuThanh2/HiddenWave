"""Encoder and decoder must agree on sample order and bit order for every input."""

from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from hiddenwave.core.codec import StegoDecoder, StegoEncoder
from hiddenwave.core.schemes import classic_capacity, hardened_capacity
from hiddenwave.core.wav.wav_file import WavFile

# Mỗi lần encode/decode hardened chạy scrypt (~0.4 s) nên giới hạn số ví dụ.
HARDENED_SETTINGS = settings(
    max_examples=15, deadline=None, suppress_health_check=[HealthCheck.too_slow]
)

messages = st.text(min_size=1, max_size=300).filter(lambda text: text.encode("utf-8"))
passphrases = st.text(min_size=1, max_size=40)


def draw_cover(data: st.DataObject, covers: dict[str, WavFile]) -> WavFile:
    return covers[data.draw(st.sampled_from(sorted(covers)), label="cover")]


@settings(max_examples=150, deadline=None)
@given(data=st.data(), message=messages)
def test_classic_round_trip(
    all_covers: dict[str, WavFile], data: st.DataObject, message: str
) -> None:
    stego = StegoEncoder.classic().encode(draw_cover(data, all_covers), message).stego

    assert StegoDecoder.classic().decode(stego) == message


@settings(max_examples=60, deadline=None)
@given(data=st.data())
def test_classic_round_trip_for_any_payload(
    all_covers: dict[str, WavFile], data: st.DataObject
) -> None:
    cover = draw_cover(data, all_covers)
    payload = data.draw(st.binary(min_size=1, max_size=classic_capacity(cover.sample_count)))

    stego = StegoEncoder.classic().encode_payload(cover, payload).stego

    assert StegoDecoder.classic().decode_payload(stego) == payload


@HARDENED_SETTINGS
@given(data=st.data(), message=messages, passphrase=passphrases)
def test_hardened_round_trip(
    all_covers: dict[str, WavFile], data: st.DataObject, message: str, passphrase: str
) -> None:
    stego = StegoEncoder.hardened(passphrase).encode(draw_cover(data, all_covers), message).stego

    assert StegoDecoder.hardened(passphrase).decode(stego) == message


@HARDENED_SETTINGS
@given(data=st.data())
def test_hardened_round_trip_for_any_payload(
    all_covers: dict[str, WavFile], data: st.DataObject
) -> None:
    cover = draw_cover(data, all_covers)
    payload = data.draw(st.binary(min_size=1, max_size=hardened_capacity(cover.sample_count)))

    stego = StegoEncoder.hardened("pw").encode_payload(cover, payload).stego

    assert StegoDecoder.hardened("pw").decode_payload(stego) == payload
