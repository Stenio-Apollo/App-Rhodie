import {stripDataUriPrefix} from "./base64";

export function dataUriMimeType(dataUri: string): string | null {
    return dataUri.match(/^data:([^;]+);base64,/)?.[1] ?? null;
}

function imageMimeTypeFromBase64(base64: string): string | null {
    if (base64.startsWith("/9j/")) return "image/jpeg";
    if (base64.startsWith("iVBORw0KGgo")) return "image/png";
    if (base64.startsWith("UklGR")) return "image/webp";
    return null;
}

export function normalizeImageDataUriMimeType(dataUri: string): string {
    if (!dataUri.startsWith("data:image/")) return dataUri;

    const commaIndex = dataUri.indexOf(",");
    if (commaIndex < 0) return dataUri;

    const base64 = stripDataUriPrefix(dataUri);
    const detectedMimeType = imageMimeTypeFromBase64(base64);
    if (!detectedMimeType || dataUriMimeType(dataUri) === detectedMimeType) return dataUri;

    return `data:${detectedMimeType};base64,${base64}`;
}
