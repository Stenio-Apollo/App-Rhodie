"use client";

import Navbar from "@/components/navbar";
import {useUser} from "@clerk/nextjs";
import {Button} from "@/components/ui/button";
import {Plus} from "lucide-react";
import {useBoards} from "@/lib/hooks/useBoards";
import {useSupabase} from "@/lib/supabase/SupabaseProvider";

export default function DashboardPage() {
    const {user} = useUser();
    const {createBoard} = useBoards();
    const {supabase} = useSupabase();

    const handleCreateBoard = async () => {
        try {
            await createBoard({title: "New Board"});
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to create board";
            // Surface a friendly message instead of crashing the app
            if (typeof window !== "undefined") {
                alert(message);
            } else {
                console.error(message);
            }
        }
    };
    return <div className=
                    {"min-h-screen " +
                        "bg-gradient-to-r " +
                        "from-black " +
                        "via-stone-800 " +
                        "to-black"}>
        <Navbar/>
        <main className={"container mx-auto px-4 py-6 sm:py-8"}>
            <div className={"mb-6 sm:mb-8"}>
                <h1 className={"text-white text-1xl sm:text-2xl mb-2"}>Welcome
                    Home, {user?.firstName ?? user?.emailAddresses[0].emailAddress}!
                </h1>
                <p className={"text-gray-400"}>
                    Here is an in depth overview of your board!
                </p>
                <Button className="w-full sm:w-auto" onClick={handleCreateBoard} disabled={!supabase}>
                    <Plus className={"h-4 w-4"}/>
                    Create Your Board

                </Button>
                {!supabase && (
                    <p className="mt-2 text-xs text-orange-300">
                        Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then restart the dev server.
                    </p>
                )}
            </div>

        </main>

    </div>

}