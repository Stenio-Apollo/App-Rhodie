"use client";


import {SignInButton, SignUpButton, UserButton, useUser} from "@clerk/nextjs";
import {usePathname} from "next/navigation";
import Link from "next/link";
import {Button} from "@/components/ui/button";
import {ArrowLeft, ArrowRight, Badge, Filter, MoreHorizontal, Trello} from "lucide-react";

interface Props {
    boardTitle?: string;
    onEditBoard?: () => void;
}

export default function Navbar({boardTitle, onEditBoard}: Props) {
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
                            className="text-xl text-white border rounded-lg p-1 -ml-11 lg:-ml-28">
                            Rh
                        </span>
                        <p className="text-white">
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
    if (isBoardPage) {
        let filterCount;
        let onFilterClick;
        return (
            <header className="bg-black border-b sticky top-0 z-50">
                <div className="container mx-auto px-4 py-3 sm:py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
                            <Link
                                href="/dashboard"
                                className="flex items-center space-x-1 sm:space-x-2 text-white hover:text-slate-400 flex-shrink-0"
                            >
                                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5"/>
                                <span className="hidden sm:inline ">Back to dashboard</span>
                                <span className="sm:hidden">Dashboard</span>
                            </Link>
                            <div className="h-4 sm:h-6 w-px bg-gray-300 hidden sm:block"/>
                            <div className="flex items-center space-x-1 sm:space-x-2 min-w-0">
                                <Trello className="text-slate-400"/>
                                <div className="items-center space-x-1 sm:space-x-2 min-w-0">
                  <span className="text-lg text-slate-400 truncate">
                    {boardTitle}
                  </span>
                                    {onEditBoard && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 flex-shrink-0 p-0"
                                            onClick={onEditBoard}
                                        >
                                            <MoreHorizontal/>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
                            {onFilterClick && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={`text-xs sm:text-sm ${
                                        filterCount > 0 ? "bg-blue-100 border-blue-200" : ""
                                    }`}
                                    onClick={onFilterClick}
                                >
                                    <Filter className="h-3 w-3 sm:w-4 sm:h-4 mr-1 sm:mr-2"/>
                                    <span className="hidden sm:inline">Filter</span>
                                    {filterCount > 0 && (
                                        <Badge
                                            variant="secondary"
                                            className="text-xs ml-1 sm:ml-2 bg-blue-100 border-blue-200"
                                        >
                                            {filterCount}
                                        </Badge>
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </header>
        );
    }
    return (
        <header className="border-b bg-gradient-r-l from-black to-neutral-800 backdrop-blur-sm sticky top-0 z-50">
            <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                        <span
                            className="text-xl text-white border rounded-lg p-1 -ml-11 lg:-ml-28">
                            Rh
                        </span>
                    <p className="text-white">
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