import * as ImagePicker from "expo-image-picker";
import {supabase} from "./supabase";

function extensionFromAsset(asset: ImagePicker.ImagePickerAsset): string {
    const mimeType = asset.mimeType?.toLowerCase();
    if (mimeType === "image/png") return "png";
    if (mimeType === "image/webp") return "webp";
    if (mimeType === "image/jpeg" || mimeType === "image/jpg") return "jpg";

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
    });

    if (result.canceled || result.assets.length === 0) return null;

    const asset = result.assets[0];
    const extension = extensionFromAsset(asset);
    const path = `${userId}/avatar-${Date.now()}.${extension}`;
    const response = await fetch(asset.uri);
    const fileBody = await response.arrayBuffer();
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
