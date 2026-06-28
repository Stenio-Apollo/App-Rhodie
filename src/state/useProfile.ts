import {useCallback, useEffect, useState} from "react";
import {supabase} from "../lib/supabase";
import type {Session} from "@supabase/supabase-js";

export interface Profile {
    id: string;
    full_name: string | null;
    birthday: string | null;
    avatar_url: string | null;
}

export function useProfile(session: Session | null) {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!session) {
            setProfile(null);
            return;
        }

        let mounted = true;
        setLoading(true);

        supabase
            .from("profiles")
            .select("id, full_name, birthday, avatar_url")
            .eq("id", session.user.id)
            .single()
            .then(({data}) => {
                if (!mounted) return;
                setProfile(data ?? {id: session.user.id, full_name: null, birthday: null, avatar_url: null});
            }, () => {
                if (!mounted) return;
                setProfile({id: session.user.id, full_name: null, birthday: null, avatar_url: null});
            })
            .then(() => {
                if (mounted) setLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, [session]);

    const upsertProfile = useCallback(
        async (payload: { full_name: string; birthday: string | null; avatar_url?: string | null }) => {
            if (!session) return null;
            const nextProfile = {
                id: session.user.id,
                full_name: payload.full_name.trim() || null,
                birthday: payload.birthday,
                ...(Object.prototype.hasOwnProperty.call(payload, "avatar_url")
                    ? {avatar_url: payload.avatar_url?.trim() || null}
                    : {}),
            };
            const {data, error} = await supabase
                .from("profiles")
                .upsert(nextProfile)
                .select("id, full_name, birthday, avatar_url")
                .single();
            if (!error && data) {
                setProfile(data as Profile);
            }
            return error;
        },
        [session],
    );

    return {profile, loading, upsertProfile};
}
