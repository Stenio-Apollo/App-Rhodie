import type {VisualMode} from "../state/useVisualMode";

export const GEORGIA_ACCENT_COLOR = "#DAC8AE";
export const EVERGREEN_ACCENT_COLOR = "#2F6B4F";
export const NAVY_ACCENT_COLOR = "#1E3A5F";

function hexToRgba(hex: string, alpha: number): string {
    const clean = hex.replace("#", "");
    if (clean.length !== 6) return hex;

    const value = Number.parseInt(clean, 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getVisualModeAccentColor(visualMode: VisualMode): string {
    if (visualMode === "evergreen") return EVERGREEN_ACCENT_COLOR;
    if (visualMode === "navy") return NAVY_ACCENT_COLOR;
    if (visualMode === "georgia") return GEORGIA_ACCENT_COLOR;
    return "#ba885a";
}

export function getVisualModeAccentSoftColor(visualMode: VisualMode, alpha = 0.22): string {
    return hexToRgba(getVisualModeAccentColor(visualMode), alpha);
}

export function isGeorgiaStyleVisualMode(visualMode: VisualMode): boolean {
    return visualMode === "georgia" || visualMode === "evergreen" || visualMode === "navy";
}
