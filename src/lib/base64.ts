const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function base64ToUint8Array(input: string): Uint8Array {
    const base64 = input.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
    if (!base64) return new Uint8Array();

    const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
    const byteLength = Math.floor((base64.length * 3) / 4) - padding;
    const bytes = new Uint8Array(byteLength);
    let byteIndex = 0;

    for (let index = 0; index < base64.length; index += 4) {
        const first = BASE64_ALPHABET.indexOf(base64[index]);
        const second = BASE64_ALPHABET.indexOf(base64[index + 1]);
        const third = base64[index + 2] === "=" ? 0 : BASE64_ALPHABET.indexOf(base64[index + 2]);
        const fourth = base64[index + 3] === "=" ? 0 : BASE64_ALPHABET.indexOf(base64[index + 3]);

        if (first < 0 || second < 0 || third < 0 || fourth < 0) {
            throw new Error("Invalid base64 data.");
        }

        if (byteIndex < byteLength) bytes[byteIndex++] = (first << 2) | (second >> 4);
        if (byteIndex < byteLength) bytes[byteIndex++] = ((second & 15) << 4) | (third >> 2);
        if (byteIndex < byteLength) bytes[byteIndex++] = ((third & 3) << 6) | fourth;
    }

    return bytes;
}
