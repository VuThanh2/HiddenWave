import numpy as np
import pytest

from hiddenwave.core.embedding.embedders import (
    INT16_MAX,
    INT16_MIN,
    LsbMatching,
    LsbReplacement,
    extract_bits,
)
from hiddenwave.core.embedding.framing import (
    bits_to_bytes,
    bytes_to_bits,
    length_prefixed,
    read_length,
)
from hiddenwave.core.embedding.selectors import KeyedShuffleSelector, SequentialSelector

SEED = bytes(range(32))


class TestFraming:
    def test_bits_are_msb_first(self) -> None:
        np.testing.assert_array_equal(
            bytes_to_bits(b"\x80\x01"), [1, 0, 0, 0, 0, 0, 0, 0] + [0] * 7 + [1]
        )

    def test_bits_round_trip(self) -> None:
        data = bytes(range(256))
        assert bits_to_bytes(bytes_to_bits(data)) == data

    def test_length_prefix_is_32_bit_big_endian(self) -> None:
        bits = length_prefixed(b"hi")

        assert bits.size == 32 + 16
        assert read_length(bits[:32]) == 2
        assert bits_to_bytes(bits[:32]) == b"\x00\x00\x00\x02"

    def test_rejects_partial_byte(self) -> None:
        with pytest.raises(ValueError):
            bits_to_bytes(np.ones(7, dtype=np.uint8))


class TestSequentialSelector:
    def test_selects_from_start(self) -> None:
        np.testing.assert_array_equal(SequentialSelector().select(5, 100, 4), [5, 6, 7, 8])

    def test_rejects_count_larger_than_range(self) -> None:
        with pytest.raises(ValueError):
            SequentialSelector().select(0, 10, 11)


class TestKeyedShuffleSelector:
    def test_order_is_reproducible_across_machines_and_versions(self) -> None:
        # Giá trị cố định: nếu đổi, file stego cũ sẽ không decode được nữa.
        order = KeyedShuffleSelector(SEED).select(224, 1224, 12)

        assert order.tolist() == [418, 1027, 1208, 684, 941, 248, 1165, 344, 388, 1115, 887, 587]

    def test_positions_are_distinct_and_in_range(self) -> None:
        order = KeyedShuffleSelector(SEED).select(224, 5000, 3000)

        assert np.unique(order).size == order.size
        assert order.min() >= 224
        assert order.max() < 5000

    @pytest.mark.parametrize("prefix", [0, 1, 32, 777, 4776])
    def test_smaller_count_is_prefix_of_larger(self, prefix: int) -> None:
        full = KeyedShuffleSelector(SEED).select(224, 5000, 4776)

        np.testing.assert_array_equal(
            KeyedShuffleSelector(SEED).select(224, 5000, prefix), full[:prefix]
        )

    def test_full_range_is_a_permutation(self) -> None:
        order = KeyedShuffleSelector(SEED).select(0, 1000, 1000)

        np.testing.assert_array_equal(np.sort(order), np.arange(1000))

    def test_different_seeds_give_different_orders(self) -> None:
        first = KeyedShuffleSelector(SEED).select(0, 10000, 64)
        second = KeyedShuffleSelector(bytes(32)).select(0, 10000, 64)

        assert not np.array_equal(first, second)

    def test_order_is_not_sequential(self) -> None:
        order = KeyedShuffleSelector(SEED).select(0, 100000, 1000)

        assert np.count_nonzero(np.diff(order) == 1) < 10
        assert order.max() > 90000


class TestEmbedders:
    samples = np.array([0, 1, 2, 3, -1, -2, INT16_MAX, INT16_MIN], dtype=np.int16)
    positions = np.arange(8)

    @pytest.mark.parametrize("embedder", [LsbReplacement(), LsbMatching()])
    @pytest.mark.parametrize("bit", [0, 1])
    def test_lsb_carries_the_bit(self, embedder, bit: int) -> None:
        bits = np.full(8, bit, dtype=np.uint8)

        stego = embedder.embed(self.samples, self.positions, bits)

        np.testing.assert_array_equal(extract_bits(stego, self.positions), bits)
        assert np.abs(stego.astype(np.int32) - self.samples).max() <= 1

    @pytest.mark.parametrize("embedder", [LsbReplacement(), LsbMatching()])
    def test_untouched_positions_are_preserved(self, embedder) -> None:
        stego = embedder.embed(self.samples, np.array([1, 3]), np.array([0, 0], dtype=np.uint8))

        np.testing.assert_array_equal(np.delete(stego, [1, 3]), np.delete(self.samples, [1, 3]))

    def test_replacement_only_moves_within_pair(self) -> None:
        stego = LsbReplacement().embed(self.samples, self.positions, np.ones(8, dtype=np.uint8))

        np.testing.assert_array_equal(stego >> 1, self.samples >> 1)

    def test_matching_keeps_samples_whose_lsb_already_matches(self) -> None:
        bits = (self.samples & 1).astype(np.uint8)

        stego = LsbMatching().embed(self.samples, self.positions, bits)

        np.testing.assert_array_equal(stego, self.samples)

    @pytest.mark.parametrize("direction", [b"\x00", b"\xff"])
    def test_matching_is_forced_inward_at_the_boundaries(self, direction: bytes) -> None:
        samples = np.array([INT16_MAX, INT16_MIN], dtype=np.int16)
        embedder = LsbMatching(random_bytes=lambda size: direction * size)

        stego = embedder.embed(samples, np.arange(2), np.array([0, 1], dtype=np.uint8))

        np.testing.assert_array_equal(stego, [INT16_MAX - 1, INT16_MIN + 1])

    def test_matching_direction_comes_from_random_source(self) -> None:
        samples = np.array([10, 10], dtype=np.int16)

        up = LsbMatching(random_bytes=lambda size: b"\xff" * size)
        down = LsbMatching(random_bytes=lambda size: b"\x00" * size)
        bits = np.ones(2, dtype=np.uint8)

        np.testing.assert_array_equal(up.embed(samples, np.arange(2), bits), [11, 11])
        np.testing.assert_array_equal(down.embed(samples, np.arange(2), bits), [9, 9])

    def test_input_array_is_not_modified(self) -> None:
        samples = self.samples.copy()

        LsbMatching().embed(samples, self.positions, np.ones(8, dtype=np.uint8))

        np.testing.assert_array_equal(samples, self.samples)
