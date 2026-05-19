export function toLocalISODate(input: Date = new Date()): string {
    const year = input.getFullYear();
    const month = String(input.getMonth() + 1).padStart(2, "0");
    const day = String(input.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function parseDateParts(input: string): { month: number; day: number } | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
    if (!match) return null;
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!Number.isFinite(month) || !Number.isFinite(day)) return null;
    return {month, day};
}

export function isToday(input: string): boolean {
    const now = new Date();
    const parsed = parseDateParts(input);
    if (parsed) {
        return parsed.month - 1 === now.getMonth() && parsed.day === now.getDate();
    }
    const d = new Date(input);
    return (
        !Number.isNaN(d.getTime()) &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
    );
}
