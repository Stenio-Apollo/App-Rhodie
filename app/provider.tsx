"use client";

import {ClerkProvider} from "@clerk/nextjs";
import {Leva} from "leva";
import SupabaseProvider from "@/lib/supabase/SupabaseProvider";

export default function Providers({
                                      children,
                                  }: {
    children: React.ReactNode;
}) {
    return (
        <ClerkProvider>
            <Leva hidden/>
            <SupabaseProvider>{children}</SupabaseProvider>
        </ClerkProvider>
    );
}
