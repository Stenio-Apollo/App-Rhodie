import AsyncStorage from "@react-native-async-storage/async-storage";

type RotationKind = "journalPrompt" | "quote";

type RotationState = {
    listLength: number;
    usedIndexes: number[];
    assignments: Record<string, number>;
};

const STORAGE_PREFIX = "rhnative.daily-rotation.v1";

function storageKey(kind: RotationKind): string {
    return `${STORAGE_PREFIX}.${kind}`;
}

function normalizeState(raw: string | null, listLength: number): RotationState {
    if (!raw) {
        return {listLength, usedIndexes: [], assignments: {}};
    }

    try {
        const parsed = JSON.parse(raw) as Partial<RotationState>;
        const usedIndexes = Array.isArray(parsed.usedIndexes)
            ? parsed.usedIndexes.filter((index) => Number.isInteger(index) && index >= 0 && index < listLength)
            : [];
        const assignments =
            parsed.assignments && typeof parsed.assignments === "object"
                ? Object.entries(parsed.assignments).reduce<Record<string, number>>((accumulator, [date, index]) => {
                    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isInteger(index) && index >= 0 && index < listLength) {
                        accumulator[date] = index;
                    }
                    return accumulator;
                }, {})
                : {};

        return {listLength, usedIndexes: [...new Set(usedIndexes)], assignments};
    } catch {
        return {listLength, usedIndexes: [], assignments: {}};
    }
}

function claimNextIndex(state: RotationState, listLength: number): number {
    if (listLength <= 0) return 0;

    const usedSet = new Set(state.usedIndexes.filter((index) => index >= 0 && index < listLength));

    if (usedSet.size >= listLength) {
        usedSet.clear();
    }

    for (let index = 0; index < listLength; index++) {
        if (!usedSet.has(index)) {
            usedSet.add(index);
            state.usedIndexes = [...usedSet];
            return index;
        }
    }

    state.usedIndexes = [0];
    return 0;
}

export async function getDailyRotationIndexes(
    kind: RotationKind,
    dateKeys: string[],
    listLength: number,
): Promise<Record<string, number>> {
    if (listLength <= 0 || dateKeys.length === 0) return {};

    const raw = await AsyncStorage.getItem(storageKey(kind));
    const state = normalizeState(raw, listLength);
    const requestedDateSet = new Set(dateKeys);
    const nextAssignments: Record<string, number> = {};

    for (const dateKey of dateKeys) {
        const existingIndex = state.assignments[dateKey];
        if (Number.isInteger(existingIndex) && existingIndex >= 0 && existingIndex < listLength) {
            nextAssignments[dateKey] = existingIndex;
            continue;
        }

        nextAssignments[dateKey] = claimNextIndex(state, listLength);
    }

    state.assignments = Object.entries({
        ...state.assignments,
        ...nextAssignments,
    }).reduce<Record<string, number>>((accumulator, [dateKey, index]) => {
        if (requestedDateSet.has(dateKey)) {
            accumulator[dateKey] = index;
        }
        return accumulator;
    }, {});
    state.listLength = listLength;

    await AsyncStorage.setItem(storageKey(kind), JSON.stringify(state));
    return nextAssignments;
}
