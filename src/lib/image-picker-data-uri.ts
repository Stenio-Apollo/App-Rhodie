import type * as ImagePicker from "expo-image-picker";

export function dataUriMimeType(dataUri: string): string | null {
    return dataUri.match(/^data:([^;]+);base64,/)?.[1] ?? null;
}

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
    const mimeType = asset.mimeType ?? fallbackMimeType;
    if (asset.base64) {
        return {
            dataUri: `data:${mimeType};base64,${asset.base64}`,
            mimeType,
        };
    }

    const response = await fetch(asset.uri);
    if (!response.ok) {
        throw new Error("The selected image could not be loaded.");
    }

    const dataUri = await blobToDataUri(await response.blob());
    return {
        dataUri,
        mimeType: dataUriMimeType(dataUri) ?? mimeType,
    };
}
