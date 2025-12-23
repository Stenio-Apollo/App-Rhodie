"use client";

import {useEffect, useRef} from "react";

interface Star {
    xOffset: number;
    y: number;
    speed: number;
    size: number;
    phase: number;
    warmth: number;
}

const STAR_COUNT = 220;
const STREAM_WIDTH = 180; // ← wider stream

export default function StarStreamWide() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const starsRef = useRef<Star[]>([]);
    const timeRef = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const init = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            starsRef.current = [];
            for (let i = 0; i < STAR_COUNT; i++) {
                starsRef.current.push({
                    xOffset: (Math.random() - 0.5) * STREAM_WIDTH,
                    y: Math.random() * canvas.height,
                    speed: Math.random() * 1.40 + 1.47,
                    size: Math.random() * 0.9 + 0.3,
                    phase: Math.random() * Math.PI * 3,
                    warmth: Math.random(),
                });
            }
        };

        init();

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const centerX = canvas.width / 2;
            timeRef.current += 0.008;

            starsRef.current.forEach((star) => {
                // gentle horizontal wave
                const wave =
                    Math.sin(star.y * 0.01 + timeRef.current + star.phase) * 6;

                const x = centerX + star.xOffset + wave;

                ctx.beginPath();
                const shimmer =
                    0.25 +
                    Math.sin(timeRef.current * 2 + star.phase) * 0.05;

                const r = 255;
                const g = 245 + star.warmth * 10;
                const b = 225 + star.warmth * 15;

                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${shimmer})`;
                ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${shimmer * 0.6})`;
                ctx.shadowBlur = 6;

                ctx.arc(x, star.y, star.size, 0, Math.PI * 2);
                ctx.fill();

                star.y -= star.speed;

                if (star.y < -10) {
                    star.y = canvas.height + Math.random() * 40;
                }
            });

            requestAnimationFrame(animate);
        };

        animate();
        window.addEventListener("resize", init);
        return () => window.removeEventListener("resize", init);
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-0"
        />
    );
}
