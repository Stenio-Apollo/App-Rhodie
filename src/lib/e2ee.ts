import * as Crypto from "expo-crypto";
import {gcm} from "@noble/ciphers/aes.js";
import {bytesToUtf8, utf8ToBytes} from "@noble/ciphers/utils.js";
import {pbkdf2Async} from "@noble/hashes/pbkdf2.js";
import {sha256} from "@noble/hashes/sha2.js";
import {hmac} from "@noble/hashes/hmac.js";

export const ENCRYPTION_VERSION = 1;
export const ENCRYPTION_KDF = "pbkdf2-sha256";
// Keep this mobile-friendly because PBKDF2 runs in the React Native JS runtime.
// Existing profiles keep their stored iteration count for compatibility.
export const ENCRYPTION_KDF_ITERATIONS = 20000;
export const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const VERIFIER_MESSAGE = "rhodie-e2ee-verifier-v1";

export type EncryptionProfile = {
    userId: string;
    salt: string;
    verifier: string;
    keyVerifier?: string | null;
    wrappedKey?: string | null;
    kdf: string;
    iterations: number;
    version: number;
};

export type EncryptionKey = {
    keyBytes: Uint8Array;
    profile: EncryptionProfile;
};

type EncryptedPayload = {
    v: number;
    alg: typeof ENCRYPTION_ALGORITHM;
    nonce: string;
    ciphertext: string;
};

type WrappedKeyPayload = EncryptedPayload;

type ProfileVerifierPayload = {
    v: 2;
    pinVerifier: string;
    keyVerifier: string;
    wrappedKey: string;
};

type CachedEncryptionKeyPayload = {
    v: number;
    userId: string;
    salt: string;
    verifier: string;
    keyVerifier?: string | null;
    wrappedKey?: string | null;
    kdf: string;
    iterations: number;
    keyBytes: string;
    cachedAt: string;
};

const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function bytesToBase64(bytes: Uint8Array): string {
    let output = "";
    let index = 0;
    for (; index + 2 < bytes.length; index += 3) {
        const value = (bytes[index] << 16) | (bytes[index + 1] << 8) | bytes[index + 2];
        output += BASE64_ALPHABET[(value >> 18) & 63];
        output += BASE64_ALPHABET[(value >> 12) & 63];
        output += BASE64_ALPHABET[(value >> 6) & 63];
        output += BASE64_ALPHABET[value & 63];
    }

    if (index < bytes.length) {
        let value = bytes[index] << 16;
        output += BASE64_ALPHABET[(value >> 18) & 63];
        if (index + 1 < bytes.length) {
            value |= bytes[index + 1] << 8;
            output += BASE64_ALPHABET[(value >> 12) & 63];
            output += BASE64_ALPHABET[(value >> 6) & 63];
            output += "=";
        } else {
            output += BASE64_ALPHABET[(value >> 12) & 63];
            output += "==";
        }
    }

    return output;
}

export function base64ToBytes(value: string): Uint8Array {
    const clean = value.replace(/\s/g, "");
    const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
    const length = Math.floor((clean.length * 3) / 4) - padding;
    const bytes = new Uint8Array(length);
    let byteIndex = 0;

    for (let index = 0; index < clean.length; index += 4) {
        const a = BASE64_ALPHABET.indexOf(clean[index]);
        const b = BASE64_ALPHABET.indexOf(clean[index + 1]);
        const c = clean[index + 2] === "=" ? 0 : BASE64_ALPHABET.indexOf(clean[index + 2]);
        const d = clean[index + 3] === "=" ? 0 : BASE64_ALPHABET.indexOf(clean[index + 3]);
        const chunk = (a << 18) | (b << 12) | (c << 6) | d;
        if (byteIndex < length) bytes[byteIndex++] = (chunk >> 16) & 255;
        if (byteIndex < length) bytes[byteIndex++] = (chunk >> 8) & 255;
        if (byteIndex < length) bytes[byteIndex++] = chunk & 255;
    }

    return bytes;
}

export function createEncryptionSalt(): string {
    return bytesToBase64(Crypto.getRandomBytes(16));
}

async function deriveKeyBytes(passphrase: string, salt: string, iterations: number): Promise<Uint8Array> {
    return pbkdf2Async(sha256, passphrase, base64ToBytes(salt), {
        c: iterations,
        dkLen: 32,
        asyncTick: 10,
    });
}

function createVerifier(keyBytes: Uint8Array): string {
    return bytesToBase64(hmac(sha256, keyBytes, utf8ToBytes(VERIFIER_MESSAGE)));
}

export function serializeProfileVerifier(profile: EncryptionProfile): string {
    if (profile.version >= 2 && profile.keyVerifier && profile.wrappedKey) {
        const payload: ProfileVerifierPayload = {
            v: 2,
            pinVerifier: profile.verifier,
            keyVerifier: profile.keyVerifier,
            wrappedKey: profile.wrappedKey,
        };
        return JSON.stringify(payload);
    }

    return profile.verifier;
}

export function parseProfileVerifier(
    verifier: string,
    version: number,
    keyVerifier?: string | null,
    wrappedKey?: string | null,
): Pick<EncryptionProfile, "verifier" | "keyVerifier" | "wrappedKey"> {
    if (keyVerifier && wrappedKey) {
        return {verifier, keyVerifier, wrappedKey};
    }

    if (version >= 2) {
        try {
            const payload = JSON.parse(verifier) as Partial<ProfileVerifierPayload>;
            if (
                payload.v === 2 &&
                typeof payload.pinVerifier === "string" &&
                typeof payload.keyVerifier === "string" &&
                typeof payload.wrappedKey === "string"
            ) {
                return {
                    verifier: payload.pinVerifier,
                    keyVerifier: payload.keyVerifier,
                    wrappedKey: payload.wrappedKey,
                };
            }
        } catch {
            // Legacy verifier strings are not JSON.
        }
    }

    return {verifier, keyVerifier, wrappedKey};
}

function encryptBytes(keyBytes: Uint8Array, value: Uint8Array): WrappedKeyPayload {
    const nonce = Crypto.getRandomBytes(12);
    const ciphertext = gcm(keyBytes, nonce).encrypt(value);
    return {
        v: ENCRYPTION_VERSION,
        alg: ENCRYPTION_ALGORITHM,
        nonce: bytesToBase64(nonce),
        ciphertext: bytesToBase64(ciphertext),
    };
}

function decryptBytes(keyBytes: Uint8Array, encryptedValue: string): Uint8Array {
    const payload = JSON.parse(encryptedValue) as Partial<WrappedKeyPayload>;
    if (payload.v !== ENCRYPTION_VERSION || payload.alg !== ENCRYPTION_ALGORITHM || !payload.nonce || !payload.ciphertext) {
        throw new Error("Unsupported encrypted key payload.");
    }
    return gcm(keyBytes, base64ToBytes(payload.nonce)).decrypt(base64ToBytes(payload.ciphertext));
}

export async function createEncryptionProfileFromKey(
    userId: string,
    pin: string,
    keyBytes: Uint8Array,
): Promise<EncryptionKey> {
    const salt = createEncryptionSalt();
    const pinKeyBytes = await deriveKeyBytes(pin, salt, ENCRYPTION_KDF_ITERATIONS);
    const profile: EncryptionProfile = {
        userId,
        salt,
        verifier: createVerifier(pinKeyBytes),
        keyVerifier: createVerifier(keyBytes),
        wrappedKey: JSON.stringify(encryptBytes(pinKeyBytes, keyBytes)),
        kdf: ENCRYPTION_KDF,
        iterations: ENCRYPTION_KDF_ITERATIONS,
        version: 2,
    };
    return {keyBytes, profile};
}

export async function createEncryptionProfile(userId: string, pin: string): Promise<EncryptionKey> {
    return createEncryptionProfileFromKey(userId, pin, Crypto.getRandomBytes(32));
}

export async function unlockEncryptionProfile(profile: EncryptionProfile, pin: string): Promise<EncryptionKey> {
    const pinKeyBytes = await deriveKeyBytes(pin, profile.salt, profile.iterations);

    if (profile.version >= 2 && profile.wrappedKey) {
        if (createVerifier(pinKeyBytes) !== profile.verifier) {
            throw new Error("That PIN did not unlock your encrypted data.");
        }

        const keyBytes = decryptBytes(pinKeyBytes, profile.wrappedKey);
        if (profile.keyVerifier && createVerifier(keyBytes) !== profile.keyVerifier) {
            throw new Error("That PIN did not unlock your encrypted data.");
        }
        return {keyBytes, profile};
    }

    if (createVerifier(pinKeyBytes) !== profile.verifier) {
        throw new Error("That passphrase did not unlock your encrypted data.");
    }
    return {keyBytes: pinKeyBytes, profile};
}

export function serializeEncryptionKeyForDevice(key: EncryptionKey): string {
    const payload: CachedEncryptionKeyPayload = {
        v: ENCRYPTION_VERSION,
        userId: key.profile.userId,
        salt: key.profile.salt,
        verifier: key.profile.verifier,
        keyVerifier: key.profile.keyVerifier,
        wrappedKey: key.profile.wrappedKey,
        kdf: key.profile.kdf,
        iterations: key.profile.iterations,
        keyBytes: bytesToBase64(key.keyBytes),
        cachedAt: new Date().toISOString(),
    };
    return JSON.stringify(payload);
}

export function restoreEncryptionKeyFromDeviceCache(profile: EncryptionProfile, raw: string): EncryptionKey | null {
    try {
        const payload = JSON.parse(raw) as Partial<CachedEncryptionKeyPayload>;
        const cachedKeyBytes = typeof payload.keyBytes === "string" ? payload.keyBytes : null;
        const matchesProfile =
            payload.v === ENCRYPTION_VERSION &&
            payload.userId === profile.userId &&
            payload.kdf === profile.kdf &&
            cachedKeyBytes !== null;
        if (!matchesProfile) return null;

        const keyBytes = base64ToBytes(cachedKeyBytes);
        const expectedKeyVerifier = profile.keyVerifier ?? profile.verifier;
        if (createVerifier(keyBytes) !== expectedKeyVerifier) return null;
        return {keyBytes, profile};
    } catch {
        return null;
    }
}

export function encryptString(key: EncryptionKey, value: string): string {
    const nonce = Crypto.getRandomBytes(12);
    const ciphertext = gcm(key.keyBytes, nonce).encrypt(utf8ToBytes(value));
    const payload: EncryptedPayload = {
        v: ENCRYPTION_VERSION,
        alg: ENCRYPTION_ALGORITHM,
        nonce: bytesToBase64(nonce),
        ciphertext: bytesToBase64(ciphertext),
    };
    return JSON.stringify(payload);
}

export function decryptString(key: EncryptionKey, encryptedValue: string): string {
    const payload = JSON.parse(encryptedValue) as Partial<EncryptedPayload>;
    if (payload.v !== ENCRYPTION_VERSION || payload.alg !== ENCRYPTION_ALGORITHM || !payload.nonce || !payload.ciphertext) {
        throw new Error("Unsupported encrypted payload.");
    }
    const plaintext = gcm(key.keyBytes, base64ToBytes(payload.nonce)).decrypt(base64ToBytes(payload.ciphertext));
    return bytesToUtf8(plaintext);
}

export function looksEncrypted(value: string | null | undefined): boolean {
    if (!value) return false;
    try {
        const payload = JSON.parse(value) as Partial<EncryptedPayload>;
        return payload.v === ENCRYPTION_VERSION && payload.alg === ENCRYPTION_ALGORITHM && typeof payload.ciphertext === "string";
    } catch {
        return false;
    }
}

export function encryptedPlaceholder(label = "encrypted"): string {
    return `[${label}]`;
}
