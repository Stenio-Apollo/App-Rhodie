"use client";

import {useEffect} from "react";

declare global {
    interface Window {
        UnicornStudio?: {
            init: () => void;
            isInitialized?: boolean;
        };
    }
}

export default function Decoder() {
    useEffect(() => {
        // If UnicornStudio already exists, just init
        if (window.UnicornStudio?.init) {
            window.UnicornStudio.init();
            return;
        }

        // Otherwise load the script
        const script = document.createElement("script");
        script.src =
            "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.0.5/dist/unicornStudio.umd.js";
        script.async = true;

        script.onload = () => {
            window.UnicornStudio?.init();
        };

        document.body.appendChild(script);
    }, []);

    return (
        <div
            data-us-project="luUyfqDKeQvAorwf9VdP"
            className="absolute inset-0 w-full h-full"
        />
    );
}
