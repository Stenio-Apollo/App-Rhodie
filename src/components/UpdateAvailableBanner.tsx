import {useEffect, useRef} from "react";
import {Animated, AppState, View} from "react-native";
import * as Updates from "expo-updates";
import {useUpdates} from "expo-updates";
import tw from "../lib/tw";
import {haptics} from "../lib/haptics";
import {GuideCard} from "./GuideCard";
import {useScreenVisualMode} from "./ScreenBackground";

export function UpdateAvailableBanner() {
    const {isUpdatePending} = useUpdates();
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(-8)).current;
    const visualMode = useScreenVisualMode();

    useEffect(() => {
        if (!Updates.isEnabled) return;

        const subscription = AppState.addEventListener("change", async (state) => {
            if (state !== "active") return;
            try {
                const result = await Updates.checkForUpdateAsync();
                if (result.isAvailable) {
                    await Updates.fetchUpdateAsync();
                }
            } catch {
                // silent fail — network or update server unavailable
            }
        });

        return () => subscription.remove();
    }, []);

    useEffect(() => {
        if (!isUpdatePending) return;
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 220,
                useNativeDriver: true,
            }),
            Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
                damping: 22,
                stiffness: 200,
                mass: 0.9,
            }),
        ]).start();
    }, [isUpdatePending, opacity, translateY]);

    if (!Updates.isEnabled || !isUpdatePending) return null;

    async function handleApply() {
        haptics.selection();
        try {
            await Updates.reloadAsync();
        } catch {
            // if reload fails, the next cold launch will apply the pending update
        }
    }

    return (
        <Animated.View
            pointerEvents="auto"
            style={[
                tw`mx-4 mt-2`,
                {
                    opacity,
                    transform: [{translateY}],
                },
            ]}
        >
            <View>
                <GuideCard
                    eyebrow="Update"
                    title="App update ready"
                    body="A new Rhodie update has downloaded. Apply it now to get the latest fixes and styling."
                    visualMode={visualMode}
                    actions={[{id: "apply", label: "Apply", tone: "primary"}]}
                    onAction={() => void handleApply()}
                />
            </View>
        </Animated.View>
    );
}
