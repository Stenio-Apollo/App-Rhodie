export type PlannerEventColor =
    | "work"
    | "personal"
    | "health"
    | "social"
    | "focus"
    | "break"
    | "errand"
    | "other";

export const PLANNER_COLORS: ReadonlyArray<{
    id: PlannerEventColor;
    label: string;
    hex: string;
    softHex: string;
}> = [
    {id: "work", label: "Work", hex: "#4A6FA5", softHex: "rgb(79 126 186 / 0.22)"},
    {id: "personal", label: "Personal", hex: "#B55941", softHex: "rgb(255 174 153 / 0.22)"},
    {id: "health", label: "Health", hex: "#6BAA75", softHex: "rgb(176 251 190 / 0.22)"},
    {id: "social", label: "Social", hex: "#D08C5E", softHex: "rgb(251 203 164 / 0.22)"},
    {id: "focus", label: "Focus", hex: "#5c8ba8", softHex: "rgb(115 174 207 / 0.22)"},
    {id: "break", label: "Break", hex: "#C7B594", softHex: "rgb(255 230 181 / 0.22)"},
    {id: "errand", label: "Errand", hex: "#f3db72", softHex: "rgb(246 204 147 / 0.22)"},
    {id: "other", label: "Other", hex: "#7C7C7C", softHex: "rgb(255 218 218 / 0.22)"},
];

export function getPlannerColor(id: PlannerEventColor): typeof PLANNER_COLORS[number] {
    return PLANNER_COLORS.find((c) => c.id === id) ?? PLANNER_COLORS[PLANNER_COLORS.length - 1];
}

export function isPlannerEventColor(value: unknown): value is PlannerEventColor {
    return typeof value === "string" && PLANNER_COLORS.some((c) => c.id === value);
}
