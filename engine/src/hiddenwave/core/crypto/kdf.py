import unicodedata
from dataclasses import dataclass

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt

SALT_SIZE = 16
KEY_SIZE = 32

# Tham số scrypt là một phần của định dạng stego: đổi giá trị sẽ làm hỏng file cũ.
SCRYPT_N = 2**17
SCRYPT_R = 8
SCRYPT_P = 1

_AES_KEY_INFO = b"hiddenwave/aes-256-gcm-key"
_SHUFFLE_SEED_INFO = b"hiddenwave/sample-shuffle-seed"


@dataclass(frozen=True, slots=True, repr=False)
class DerivedKeys:
    aes_key: bytes
    shuffle_seed: bytes


def derive_keys(passphrase: str, salt: bytes) -> DerivedKeys:
    if len(salt) != SALT_SIZE:
        raise ValueError(f"Salt must be {SALT_SIZE} bytes")
    master_key = Scrypt(salt=salt, length=KEY_SIZE, n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P).derive(
        _normalize(passphrase)
    )
    return DerivedKeys(
        aes_key=_expand(master_key, _AES_KEY_INFO),
        shuffle_seed=_expand(master_key, _SHUFFLE_SEED_INFO),
    )


def _normalize(passphrase: str) -> bytes:
    # Cùng một chuỗi tiếng Việt có thể được gõ ở dạng NFC hoặc NFD tùy hệ điều hành.
    return unicodedata.normalize("NFC", passphrase).encode("utf-8")


def _expand(master_key: bytes, info: bytes) -> bytes:
    return HKDF(algorithm=hashes.SHA256(), length=KEY_SIZE, salt=None, info=info).derive(master_key)
