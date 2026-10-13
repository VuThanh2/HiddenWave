import numpy as np

LENGTH_FIELD_BYTES = 4
LENGTH_FIELD_BITS = LENGTH_FIELD_BYTES * 8
MAX_FRAME_PAYLOAD = 2**LENGTH_FIELD_BITS - 1


def bytes_to_bits(data: bytes) -> np.ndarray:
    """MSB-first bits of `data` as a uint8 array of 0/1."""
    return np.unpackbits(np.frombuffer(data, dtype=np.uint8))


def bits_to_bytes(bits: np.ndarray) -> bytes:
    if bits.size % 8:
        raise ValueError("Bit count must be a multiple of 8")
    return np.packbits(bits.astype(np.uint8, copy=False)).tobytes()


def length_prefixed(payload: bytes) -> np.ndarray:
    """Bits of a 32-bit big-endian length field followed by the payload."""
    if len(payload) > MAX_FRAME_PAYLOAD:
        raise ValueError("Payload is too large for a 32-bit length field")
    return bytes_to_bits(len(payload).to_bytes(LENGTH_FIELD_BYTES, "big") + payload)


def read_length(bits: np.ndarray) -> int:
    if bits.size != LENGTH_FIELD_BITS:
        raise ValueError(f"Length field must be {LENGTH_FIELD_BITS} bits")
    return int.from_bytes(bits_to_bytes(bits), "big")
