import * as Crypto from "expo-crypto";
import nacl from "tweetnacl";
import {bytesToUtf8, utf8ToBytes} from "@noble/ciphers/utils.js";
import {
    base64ToBytes,
    bytesToBase64,
    decryptString,
    encryptString,
    type EncryptionKey,
} from "./e2ee";

nacl.setPRNG((target, length) => {
    const random = Crypto.getRandomBytes(length);
    for (let index = 0; index < length; index += 1) {
        target[index] = random[index];
    }
});

export type DmKeyPair = {
    publicKey: string;
    privateKey: Uint8Array;
};

type EncryptedDmPayload = {
    v: 1;
    alg: "nacl-box";
    nonce: string;
    ciphertext: string;
};

export function createDmKeyPair(encryptionKey: EncryptionKey): {
    publicKey: string;
    privateKeyEncrypted: string;
    keyPair: DmKeyPair;
} {
    const keyPair = nacl.box.keyPair();
    const publicKey = bytesToBase64(keyPair.publicKey);
    const privateKey = bytesToBase64(keyPair.secretKey);

    return {
        publicKey,
        privateKeyEncrypted: encryptString(encryptionKey, privateKey),
        keyPair: {
            publicKey,
            privateKey: keyPair.secretKey,
        },
    };
}

export function unlockDmKeyPair(
    encryptionKey: EncryptionKey,
    publicKey: string,
    privateKeyEncrypted: string,
): DmKeyPair {
    const privateKey = decryptString(encryptionKey, privateKeyEncrypted);
    return {
        publicKey,
        privateKey: base64ToBytes(privateKey),
    };
}

export function encryptDmBody(senderKeyPair: DmKeyPair, recipientPublicKey: string, body: string): string {
    const nonce = Crypto.getRandomBytes(nacl.box.nonceLength);
    const ciphertext = nacl.box(
        utf8ToBytes(body),
        nonce,
        base64ToBytes(recipientPublicKey),
        senderKeyPair.privateKey,
    );
    const payload: EncryptedDmPayload = {
        v: 1,
        alg: "nacl-box",
        nonce: bytesToBase64(nonce),
        ciphertext: bytesToBase64(ciphertext),
    };
    return JSON.stringify(payload);
}

export function decryptDmBody(
    recipientKeyPair: DmKeyPair,
    senderPublicKey: string,
    encryptedBody: string,
): string {
    const payload = JSON.parse(encryptedBody) as Partial<EncryptedDmPayload>;
    if (payload.v !== 1 || payload.alg !== "nacl-box" || !payload.nonce || !payload.ciphertext) {
        throw new Error("Unsupported encrypted message payload.");
    }

    const plaintext = nacl.box.open(
        base64ToBytes(payload.ciphertext),
        base64ToBytes(payload.nonce),
        base64ToBytes(senderPublicKey),
        recipientKeyPair.privateKey,
    );
    if (!plaintext) {
        throw new Error("Could not decrypt this message.");
    }
    return bytesToUtf8(plaintext);
}
