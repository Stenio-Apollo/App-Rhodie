import * as ImagePicker from "expo-image-picker";
import {supabase} from "./supabase";
import {base64ToArrayBuffer, stripDataUriPrefix} from "./base64";
import {imagePickerAssetToDataUri} from "./image-picker-data-uri";

function extensionFromMimeType(mimeType: string | null | undefined): string {
    const normalizedMimeType = mimeType?.toLowerCase();
    if (normalizedMimeType === "image/png") return "png";
    if (normalizedMimeType === "image/webp") return "webp";
    if (normalizedMimeType === "image/jpeg" || normalizedMimeType === "image/jpg") return "jpg";
    return "jpg";
}

function extensionFromAsset(asset: ImagePicker.ImagePickerAsset, mimeType?: string): string {
    const mimeExtension = extensionFromMimeType(mimeType ?? asset.mimeType);
    if (mimeExtension !== "jpg" || mimeType || asset.mimeType) return mimeExtension;
    const fileName = asset.fileName ?? asset.uri;
    const match = fileName.match(/\.([a-z0-9]+)(?:\?|#|$)/i);
    const extension = match?.[1]?.toLowerCase();
    if (extension === "png" || extension === "webp") return extension;
    return "jpg";
}

function contentTypeFromExtension(extension: string): string {
    if (extension === "png") return "image/png";
    if (extension === "webp") return "image/webp";
    return "image/jpeg";
}

export async function pickAndUploadProfileAvatar(userId: string): Promise<string | null> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
        throw new Error("Allow photo access to choose a profile picture.");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.82,
        base64: true,
    });

    if (result.canceled || result.assets.length === 0) return null;

    const asset = result.assets[0];
    const {dataUri, mimeType} = await imagePickerAssetToDataUri(asset, "image/jpeg");

    const extension = extensionFromAsset(asset, mimeType);
    const path = `${userId}/avatar-${Date.now()}.${extension}`;
    const fileBody = base64ToArrayBuffer(stripDataUriPrefix(dataUri));
    const {error} = await supabase.storage
        .from("profile-avatars")
        .upload(path, fileBody, {
            contentType: contentTypeFromExtension(extension),
            cacheControl: "3600",
            upsert: false,
        });

    if (error) throw error;

    const {data} = supabase.storage.from("profile-avatars").getPublicUrl(path);
    return data.publicUrl;
}
