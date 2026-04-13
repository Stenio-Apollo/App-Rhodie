export function isToday(input: string): boolean {
    const d = new Date(input);
    const now = new Date();
    return (
        !Number.isNaN(d.getTime()) &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
    );
}
