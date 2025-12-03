"use client";


import {SignInButton, SignUpButton, UserButton, useUser} from "@clerk/nextjs";
import {usePathname} from "next/navigation";
import Link from "next/link";
import {Button} from "@/components/ui/button";
import {ArrowRight} from "lucide-react";

export default function Navbar2() {
    const {isLoaded, isSignedIn, user} = useUser();
    const pathname = usePathname()
    const isDashboardPage = pathname === "/dashboard";
    const isBoardPage = pathname.startsWith("/boards");


    if (isDashboardPage) {
        return <div>
            <header
                className="border-b bg-gradient-r-l from-black to-stone-950  backdrop-blur-sm sticky top-0 z-50">
                <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <span
                            className="text-xl text-black border-r-2 border-b-2 border-black rounded-lg p-1 -ml-11 lg:-ml-28">
                            Rh
                        </span>
                        <p className="text-black">
                            Rhodie
                        </p>
                       
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-4">
                        <UserButton/>
                    </div>
                </div>
            </header>
        </div>

    }
    return (
        <header className="border-b bg-gradient-r-l from-black to-neutral-800 backdrop-blur-sm sticky top-0 z-50">
            <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                        <span
                            className="text-xl text-black border rounded-lg p-1 -ml-11 lg:-ml-28">
                            Rh
                        </span>
                    <p className="text-black">
                        Rhodie
                    </p>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-4">
                    {isLoaded && isSignedIn ? (
                        <div
                            className={"flex flex-col sm:flex-row items-end sm:items-center space-y-1 sm:space-y-0 sm:space-x-4"}>
                            <span className="text-xs sm:text-sm text-gray-500 hidden sm:block ">
                                {`Welcome Home ${
                                    user?.firstName ??
                                    user?.primaryEmailAddress?.emailAddress ??
                                    "friend"
                                }`}
                            </span>
                            <Link href={"./dashboard"}>
                                <Button
                                    size={"sm"}
                                    className={"text-xs sm:text-sm"}>
                                    Enter DashBoard <ArrowRight/>
                                </Button>
                            </Link>

                        </div>
                    ) : (
                        <div>
                            <SignInButton>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs sm:text-sm"
                                >Sign In
                                </Button>
                            </SignInButton>
                            <SignUpButton>
                                <Button variant="default"
                                        size={"sm"}
                                        className="
                                        bg-orange-200
                                        text-black
                                        text-xs
                                        sm:text-sm">
                                    Sign Up
                                </Button>
                            </SignUpButton>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}