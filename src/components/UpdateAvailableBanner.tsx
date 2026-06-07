import {useEffect, useRef} from "react";
import {Animated, AppState, Pressable, Text, View} from "react-native";
import * as Updates from "expo-updates";
import {useUpdates} from "expo-updates";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";
import {haptics} from "../lib/haptics";

export function UpdateAvailableBanner() {
    const {isUpdatePending} = useUpdates();
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(-8)).current;

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
            pointerEvents="box-none"
            style={[
                tw`mx-4 mt-2 rounded-full overflow-hidden border border-[#B55941]/69`,
                {
                    backgroundColor: "rgba(181,89,65,0.18)",
                    opacity,
                    transform: [{translateY}],
                },
            ]}
        >
            <Pressable
                onPress={() => void handleApply()}
                style={({pressed}) => [
                    tw`flex-row items-center justify-between px-4 py-2`,
                    pressed && {opacity: 0.88, transform: [{scale: 0.97}]},
                ]}
            >
                <View style={tw`flex-row items-center gap-2`}>
                    <View style={tw`h-2 w-2 rounded-full bg-[#B55941]`}/>
                    <Text style={[tw`text-xs`, {fontFamily: fonts.heading, color: "#E4E0D4"}]}>
                        Update ready
                    </Text>
                </View>
                <Text style={[tw`text-[11px]`, {fontFamily: fonts.button, color: "#B55941"}]}>
                    Tap to apply
                </Text>
            </Pressable>
        </Animated.View>
    );
}
