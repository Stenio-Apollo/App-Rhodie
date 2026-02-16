"use client";

import {useEffect} from "react";

declare global {
    interface Window {
        UnicornStudio?: {
            init: () => void;
        };
    }
}

export default function UnicornHero() {
    useEffect(() => {
        const init = () => {
            window.UnicornStudio?.init();
        };

        // If Unicorn already exists, just init
        if (window.UnicornStudio?.init) {
            init();
            return;
        }

        // Prevent loading the script multiple times
        const existingScript = document.querySelector(
            'script[src*="unicornStudio.umd.js"]'
        );

        if (existingScript) {
            existingScript.addEventListener("load", init, {once: true});
            return;
        }

        // Load the Unicorn script
        const script = document.createElement("script");
        script.src =
            "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.0.5/dist/unicornStudio.umd.js";
        script.async = true;
        script.onload = init;

        document.head.appendChild(script);
    }, []);

    return (
        <div
            data-us-project="M2KKqaWsUVVDIvbLhe8F"
            className="absolute inset-0 w-full h-full pointer-events-none"
        />
    );
}
