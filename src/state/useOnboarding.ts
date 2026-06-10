import {useCallback, useEffect, useMemo, useState} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type TutorialKey = "home" | "plan" | "journal" | "tasks" | "calendar";

const ONBOARDING_PREFIX = "rhnative.onboarding.v1";
const TUTORIAL_PREFIX = "rhnative.tutorial.v1";
const TUTORIAL_KEYS: TutorialKey[] = ["home", "plan", "journal", "tasks", "calendar"];

function scopedKey(prefix: string, userId: string | null | undefined, suffix?: string): string {
    return [prefix, userId ?? "local", suffix].filter(Boolean).join(".");
}

export function useOnboarding(userId: string | null | undefined) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true);
    const [dismissedTutorials, setDismissedTutorials] = useState<Set<TutorialKey>>(() => new Set());

    useEffect(() => {
        let mounted = true;

        async function hydrate() {
            if (!userId) {
                if (!mounted) return;
                setHasCompletedOnboarding(true);
                setDismissedTutorials(new Set());
                setIsLoaded(true);
                return;
            }

            setIsLoaded(false);
            const [onboardingRaw, ...tutorialValues] = await Promise.all([
                AsyncStorage.getItem(scopedKey(ONBOARDING_PREFIX, userId)),
                ...TUTORIAL_KEYS.map((key) => AsyncStorage.getItem(scopedKey(TUTORIAL_PREFIX, userId, key))),
            ]);

            if (!mounted) return;

            const dismissed = new Set<TutorialKey>();
            TUTORIAL_KEYS.forEach((key, index) => {
                if (tutorialValues[index] === "dismissed") {
                    dismissed.add(key);
                }
            });

            setHasCompletedOnboarding(onboardingRaw === "complete");
            setDismissedTutorials(dismissed);
            setIsLoaded(true);
        }

        void hydrate();

        return () => {
            mounted = false;
        };
    }, [userId]);

    const completeOnboarding = useCallback(async () => {
        if (!userId) return;
        setHasCompletedOnboarding(true);
        await AsyncStorage.setItem(scopedKey(ONBOARDING_PREFIX, userId), "complete");
    }, [userId]);

    const dismissTutorial = useCallback(
        async (key: TutorialKey) => {
            if (!userId) return;
            setDismissedTutorials((current) => new Set([...current, key]));
            await AsyncStorage.setItem(scopedKey(TUTORIAL_PREFIX, userId, key), "dismissed");
        },
        [userId],
    );

    const resetOnboarding = useCallback(async () => {
        if (!userId) return;
        await Promise.all([
            AsyncStorage.removeItem(scopedKey(ONBOARDING_PREFIX, userId)),
            ...TUTORIAL_KEYS.map((key) => AsyncStorage.removeItem(scopedKey(TUTORIAL_PREFIX, userId, key))),
        ]);
        setHasCompletedOnboarding(false);
        setDismissedTutorials(new Set());
    }, [userId]);

    const visibleTutorials = useMemo(
        () =>
            TUTORIAL_KEYS.reduce<Record<TutorialKey, boolean>>((accumulator, key) => {
                accumulator[key] = hasCompletedOnboarding && !dismissedTutorials.has(key);
                return accumulator;
            }, {} as Record<TutorialKey, boolean>),
        [dismissedTutorials, hasCompletedOnboarding],
    );

    return {
        isLoaded,
        hasCompletedOnboarding,
        visibleTutorials,
        completeOnboarding,
        dismissTutorial,
        resetOnboarding,
    };
}
