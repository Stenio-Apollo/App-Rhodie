"use client";

import {createContext, useContext, useEffect, useState} from "react";
import {createClient, SupabaseClient} from "@supabase/supabase-js";
import {useSession} from "@clerk/nextjs";

type SupabaseContextType = {
    supabase: SupabaseClient; // never null when used
    isLoaded: boolean;
};

const Context = createContext<SupabaseContextType | undefined>(undefined);

export default function SupabaseProvider({children}: { children: React.ReactNode }) {
    const {session} = useSession();
    const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Always initialize a Supabase client immediately so the app doesn't block for signed-out users
    useEffect(() => {
        const client = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        setSupabase(client);
        setIsLoaded(true);
    }, []);

    // When a Clerk session becomes available, re-create the client to include the access token for RLS-protected data
    useEffect(() => {
        if (!session) return;

        const authedClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                // Clerk -> Supabase: provide a bearer token for authenticated requests (if backend is configured to accept it)
                accessToken: () => session.getToken(),
            }
        );
        setSupabase(authedClient);
    }, [session]);

    // Render children once a client exists
    if (!isLoaded || !supabase) return <div>Loading Supabase...</div>;

    return <Context.Provider value={{supabase, isLoaded}}>{children}</Context.Provider>;
};

// Hook to access Supabase client safely inside React components
export const useSupabase = (): SupabaseContextType => {
    const context = useContext(Context);
    if (!context) {
        throw new Error("useSupabase must be used inside SupabaseProvider");
    }
    return context;
};
