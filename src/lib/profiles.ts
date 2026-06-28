import type {PostgrestError, Session} from "@supabase/supabase-js";
import {supabase} from "./supabase";
import type {Profile} from "../state/useProfile";

type EnsureOwnProfileOptions = {
    expectedUserId?: string;
    fullName?: string | null;
    birthday?: string | null;
    avatarUrl?: string | null;
};

type EnsureOwnProfileResult = {
    profile: Profile | null;
    error: PostgrestError | null;
    skipped: boolean;
};

function profilePayload(userId: string, options: EnsureOwnProfileOptions): Record<string, string | null> {
    const payload: Record<string, string | null> = {id: userId};

    if (Object.prototype.hasOwnProperty.call(options, "fullName")) {
        payload.full_name = options.fullName?.trim() || null;
    }
    if (Object.prototype.hasOwnProperty.call(options, "birthday")) {
        payload.birthday = options.birthday ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(options, "avatarUrl")) {
        payload.avatar_url = options.avatarUrl?.trim() || null;
    }

    return payload;
}

export async function ensureOwnProfile(options: EnsureOwnProfileOptions = {}): Promise<EnsureOwnProfileResult> {
    const {data: sessionData} = await supabase.auth.getSession();
    const session = sessionData.session as Session | null;
    const userId = session?.user.id ?? null;

    if (!userId || (options.expectedUserId && options.expectedUserId !== userId)) {
        return {profile: null, error: null, skipped: true};
    }

    const {data, error} = await supabase
        .from("profiles")
        .upsert(profilePayload(userId, options), {onConflict: "id"})
        .select("id, full_name, birthday, avatar_url")
        .single();

    return {
        profile: data as Profile | null,
        error,
        skipped: false,
    };
}
