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

    useEffect(() => {
        if (!session) return;

        const client = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                accessToken: () => session.getToken(), // ensures authenticated requests
            }
        );

        setSupabase(client);
        setIsLoaded(true);
    }, [session]);

    // Render children only when supabase client is ready
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
