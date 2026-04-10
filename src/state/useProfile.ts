import {useCallback, useEffect, useState} from "react";
import {supabase} from "../lib/supabase";
import type {Session} from "@supabase/supabase-js";

export interface Profile {
    id: string;
    full_name: string | null;
    birthday: string | null; // YYYY-MM-DD
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
            .select("id, full_name, birthday")
            .eq("id", session.user.id)
            .single()
            .then(({data}) => {
                if (!mounted) return;
                setProfile(data ?? {id: session.user.id, full_name: null, birthday: null});
            }, () => {})
            .then(() => {
                if (mounted) setLoading(false);
            });
        return () => {
            mounted = false;
        };
    }, [session]);

    const upsertProfile = useCallback(
        async (payload: {full_name: string; birthday: string | null}) => {
            if (!session) return;
            const {data, error} = await supabase
                .from("profiles")
                .upsert({
                    id: session.user.id,
                    full_name: payload.full_name.trim(),
                    birthday: payload.birthday,
                })
                .select("id, full_name, birthday")
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
