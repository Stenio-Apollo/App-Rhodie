export const stoicQuotes = [
    '"The happiness of your life depends upon the quality of your thoughts." – Marcus Aurelius',
    '"We suffer more often in imagination than in reality." – Seneca',
    '"Man conquers the world by conquering himself." – Zeno of Citium',
    '"No man is free who is not master of himself." – Epictetus',
    '"If it is not right, do not do it; if it is not true, do not say it." – Marcus Aurelius',
    '"How long are you going to wait before you demand the best for yourself?" – Epictetus',
    '"He suffers more than necessary, who suffers before it is necessary." – Seneca',
    '"First say to yourself what you would be; and then do what you have to do." – Epictetus',
    '"To be even-minded is the greatest virtue." – Heraclitus',
    '"Be tolerant with others and strict with yourself." – Marcus Aurelius',
    '"Luck is what happens when preparation meets opportunity." – Seneca',
    '"Wealth consists not in having great possessions, but in having few wants." – Epictetus',
    '"To live a good life: We have the potential for it. If we learn to be indifferent to what makes no difference." – Marcus Aurelius',
    '"Don’t explain your philosophy. Embody it." – Epictetus',
    '"It is not things that disturb us, but our judgments about things." – Epictetus'
];

export function getDailyStoicQuote(date: string): string {
    // deterministic selection based on date string YYYY-MM-DD
    let hash = 0;
    for (let i = 0; i < date.length; i++) {
        hash = (hash * 31 + date.charCodeAt(i)) >>> 0;
    }
    const idx = hash % stoicQuotes.length;
    return stoicQuotes[idx];
}
