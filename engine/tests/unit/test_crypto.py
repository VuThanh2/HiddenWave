import unicodedata

import pytest

from hiddenwave.core.crypto.cipher import TAG_SIZE, decrypt, encrypt
from hiddenwave.core.crypto.kdf import derive_keys
from hiddenwave.core.crypto.keystream import keystream, random_sort_keys
from hiddenwave.core.errors import AuthenticationFailedError

SALT = bytes(16)
NONCE = bytes(12)


class TestKeyDerivation:
    def test_known_vector(self) -> None:
        keys = derive_keys("mật khẩu", SALT)

        assert (
            keys.aes_key.hex() == "3ff6bab6600caf64576ad197e6f1ea3864e96b5ad175d60da23029440866f11d"
        )
        assert (
            keys.shuffle_seed.hex()
            == "b3fa5f1241a360510946f3c988ef00ba0cf4bbc76653c73c2d48ebf3fb09b148"
        )

    def test_aes_key_and_shuffle_seed_are_independent(self) -> None:
        keys = derive_keys("passphrase", SALT)

        assert keys.aes_key != keys.shuffle_seed

    def test_salt_changes_keys(self) -> None:
        assert derive_keys("passphrase", SALT) != derive_keys("passphrase", b"\x01" * 16)

    def test_unicode_normalization_form_does_not_matter(self) -> None:
        text = "mật khẩu"

        nfc = derive_keys(unicodedata.normalize("NFC", text), SALT)
        nfd = derive_keys(unicodedata.normalize("NFD", text), SALT)

        assert nfc == nfd

    def test_keys_are_not_exposed_in_repr(self) -> None:
        keys = derive_keys("passphrase", SALT)

        assert keys.aes_key.hex() not in repr(keys)

    def test_rejects_wrong_salt_size(self) -> None:
        with pytest.raises(ValueError):
            derive_keys("passphrase", b"short")


class TestCipher:
    key = bytes(32)

    def test_round_trip_appends_tag(self) -> None:
        ciphertext = encrypt(self.key, NONCE, b"secret")

        assert len(ciphertext) == len(b"secret") + TAG_SIZE
        assert decrypt(self.key, NONCE, ciphertext) == b"secret"

    def test_tampering_is_detected(self) -> None:
        ciphertext = bytearray(encrypt(self.key, NONCE, b"secret"))
        ciphertext[0] ^= 1

        with pytest.raises(AuthenticationFailedError):
            decrypt(self.key, NONCE, bytes(ciphertext))

    def test_wrong_key_is_detected(self) -> None:
        ciphertext = encrypt(self.key, NONCE, b"secret")

        with pytest.raises(AuthenticationFailedError):
            decrypt(b"\x01" * 32, NONCE, ciphertext)


class TestKeystream:
    def test_known_vector(self) -> None:
        assert keystream(bytes(range(32)), 16).hex() == "69f07c8840ce80024db30939882c3d5b"

    def test_prefix_is_stable(self) -> None:
        assert keystream(b"seed", 100)[:40] == keystream(b"seed", 40)

    def test_sort_keys_are_little_endian_uint64(self) -> None:
        keys = random_sort_keys(b"seed", 3)

        assert keys.size == 3
        assert int(keys[0]) == int.from_bytes(keystream(b"seed", 8), "little")
