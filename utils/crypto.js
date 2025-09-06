// utils/crypto.js
// This file contains a set of robust and secure functions for encrypting and decrypting text.
//
// --- Algorithm Choice: AES-256-GCM ---
// We're using AES-256-GCM because it provides both confidentiality (encryption) and
// integrity/authenticity through its authentication tag. This is known as Authenticated
// Encryption with Associated Data (AEAD), which is the modern standard. It prevents
// common attacks like padding oracles and bit-flipping.

const crypto = require('crypto');

// --- Cryptographic Constants ---
const ENC_ALGO = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recommended IV size is 96 bits (12 bytes)
const AUTH_TAG_LENGTH = 16; // GCM uses a 128-bit (16-byte) authentication tag

// --- Secret Key Management ---
const CHAT_SECRET = process.env.CHAT_SECRET;
const CHAT_SALT = process.env.CHAT_SALT; // 1. Get the new salt from .env

// 2. Update the validation check to require both variables.
if (!CHAT_SECRET || CHAT_SECRET.length < 16 || !CHAT_SALT || CHAT_SALT.length < 16) {
  // Fail fast. We need both values to be strong.
  throw new Error(
    'FATAL ERROR: CHAT_SECRET and CHAT_SALT must both be set in .env and be at least 16 characters long.'
  );
}

// 3. Define parameters for our strong Key Derivation Function (KDF)
const KDF_ITERATIONS = 250000;  // High number of iterations to make it slow
const KEY_LENGTH_BYTES = 32;    // 32 bytes for AES-256
const KDF_DIGEST = 'sha512';    // Use a strong hash algorithm

// We use the synchronous version here, which is safe because this code
// only runs ONCE when the server starts. This derives a cryptographically
// secure 32-byte key from the secret.
console.log("Deriving encryption key... (this may take a moment on first start)");
const ENC_KEY = crypto.pbkdf2Sync(
  CHAT_SECRET,
  CHAT_SALT,
  KDF_ITERATIONS,
  KEY_LENGTH_BYTES,
  KDF_DIGEST
);
console.log("✅ Encryption key derived successfully.");


/**
 * Encrypts a UTF-8 string using AES-256-GCM.
 * The output is a compact, colon-separated string for easy storage.
 *
 * @param {string | any} plainText The text to encrypt.
 * @returns {string} The encrypted payload in the format: "ivHex:tagHex:cipherHex"
 */
function encrypt(plainText) {
  // Defensive coding: handle null, undefined, or non-string inputs gracefully.
  if (plainText === null || plainText === undefined) return '';
  const text = typeof plainText === 'string' ? plainText : String(plainText);

  // 1. Generate a new, random Initialization Vector (IV) for every encryption.
  // This is CRITICAL for security. Never reuse an IV with the same key.
  const iv = crypto.randomBytes(IV_LENGTH);

  // 2. Create the AES-256-GCM cipher instance.
  const cipher = crypto.createCipheriv(ENC_ALGO, ENC_KEY, iv, { authTagLength: AUTH_TAG_LENGTH });

  // 3. Encrypt the text.
  const ciphertext = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);

  // 4. Get the Authentication Tag. This tag is a MAC (Message Authentication Code)
  // that verifies the integrity of the data during decryption.
  const tag = cipher.getAuthTag();

  // 5. Combine everything into a single string for storage. We use hex encoding as it's URL-safe and easy to store.
  return `${iv.toString('hex')}:${tag.toString('hex')}:${ciphertext.toString('hex')}`;
}

/**
 * Decrypts a string that was encrypted by our `encrypt` function.
 * It's designed to be defensive and will throw a controlled error on any failure.
 *
 * @param {string} encText The "ivHex:tagHex:cipherHex" string.
 * @returns {string} The original plaintext.
 * @throws {Error} Throws a generic "Decryption failed" error if the payload is invalid,
 * tampered with, or if the key is wrong.
 */
function decrypt(encText) {
  // Defensive coding: handle empty or invalid inputs.
  if (encText === null || encText === undefined || encText === '') return '';
  if (typeof encText !== 'string') {
    // This should ideally never happen, but it's a good safeguard.
    throw new Error('Invalid encrypted value type');
  }

  const parts = encText.split(':');
  if (parts.length !== 3) {
    // If the format is wrong, it's not one of our encrypted strings.
    throw new Error('Invalid encrypted payload format');
  }

  const [ivHex, tagHex, cipherHex] = parts;
  try {
    // 1. Decode the hex parts back into buffers.
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const encrypted = Buffer.from(cipherHex, 'hex');

    // 2. Create the decipher instance.
    const decipher = crypto.createDecipheriv(ENC_ALGO, ENC_KEY, iv, { authTagLength: AUTH_TAG_LENGTH });

    // 3. Set the authentication tag. This is the crucial step for GCM.
    // If the tag doesn't match the ciphertext, the `final()` call below will throw an error.
    // This is how we know the data hasn't been tampered with.
    decipher.setAuthTag(tag);

    // 4. Decrypt the text.
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');

  } catch (err) {
    // IMPORTANT: We catch any cryptographic error and re-throw a generic one.
    // We do this to avoid leaking potentially useful information to an attacker
    // about *why* the decryption failed (e.g., "Invalid authentication tag").
    console.error("Decryption failed for a value. This is expected if an old key is used or if data is corrupt/tampered.", err.message);
    throw new Error('Decryption failed');
  }
}

/**
 * A non-cryptographic, quick check to see if a string *looks* like it might be
 * encrypted by our `encrypt` function. Useful for avoiding unnecessary decryption attempts.
 *
 * @param {string} value The string to check.
 * @returns {boolean} True if the format seems to match.
 */
function looksEncrypted(value) {
  if (typeof value !== 'string') return false;
  const parts = value.split(':');
  
  // A simple sanity check on the format and length of the hex parts.
  return (
    parts.length === 3 &&
    parts[0].length === IV_LENGTH * 2 && // Hex encoding is 2 chars per byte
    parts[1].length === AUTH_TAG_LENGTH * 2 &&
    /^[0-9a-f]+$/i.test(parts[0] + parts[1] + parts[2]) // Ensure all parts are valid hex
  );
}


// Export the functions for use in other parts of our application.
module.exports = { encrypt, decrypt, looksEncrypted };
