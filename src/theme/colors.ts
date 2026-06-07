export const colors = {
    text: "#E4E0D4",
    textInverse: "#fbf7f3",
    textMuted: "#94a3b8",
    textSubtle: "rgba(228,224,212,0.72)",

    accent: "#B55941",
    accentMuted: "rgba(181,89,65,0.43)",

    surface: "#0f0f0f",
    surfaceCard: "#111111",
    surfaceRaised: "#2B2B2B",
    surfaceNeutral: "#282828",

    border: "#2c2c2c",
    borderDanger: "#7f1d1d",

    success: "#86efac",
    danger: "#fca5a5",
    dangerStrong: "#fecaca",
    warning: "#fbbf24",
} as const;

export type ColorToken = keyof typeof colors;
