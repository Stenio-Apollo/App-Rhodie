import type * as ImagePicker from "expo-image-picker";
import {dataUriMimeType, normalizeImageDataUriMimeType} from "./image-data-uri";

function blobToDataUri(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("The selected image could not be read."));
        reader.onloadend = () => {
            const result = reader.result;
            if (typeof result === "string" && result.startsWith("data:")) {
                resolve(result);
                return;
            }
            reject(new Error("The selected image could not be prepared."));
        };
        reader.readAsDataURL(blob);
    });
}

export async function imagePickerAssetToDataUri(
    asset: ImagePicker.ImagePickerAsset,
    fallbackMimeType = "image/jpeg",
): Promise<{ dataUri: string; mimeType: string }> {
    if (asset.base64) {
        // Expo native returns the base64 payload as JPEG image data, even when the
        // source asset was another image type. Keep the data URI/content type aligned.
        const mimeType = fallbackMimeType;
        return {
            dataUri: `data:${mimeType};base64,${asset.base64}`,
            mimeType,
        };
    }

    const mimeType = asset.mimeType ?? fallbackMimeType;
    const response = await fetch(asset.uri);
    if (!response.ok) {
        throw new Error("The selected image could not be loaded.");
    }

    const dataUri = normalizeImageDataUriMimeType(await blobToDataUri(await response.blob()));
    return {
        dataUri,
        mimeType: dataUriMimeType(dataUri) ?? mimeType,
    };
}
