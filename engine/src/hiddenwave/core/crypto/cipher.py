from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from hiddenwave.core.errors import AuthenticationFailedError

NONCE_SIZE = 12
TAG_SIZE = 16


def encrypt(key: bytes, nonce: bytes, plaintext: bytes) -> bytes:
    """Return ciphertext with the 16-byte GCM tag appended."""
    return AESGCM(key).encrypt(nonce, plaintext, None)


def decrypt(key: bytes, nonce: bytes, ciphertext: bytes) -> bytes:
    try:
        return AESGCM(key).decrypt(nonce, ciphertext, None)
    except InvalidTag as error:
        raise AuthenticationFailedError() from error
