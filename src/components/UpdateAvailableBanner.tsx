import {useEffect, useRef} from "react";
import {Animated, AppState, Text, View} from "react-native";
import * as Updates from "expo-updates";
import {useUpdates} from "expo-updates";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";
import {haptics} from "../lib/haptics";
import {Button} from "./ui/Button";

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

    const actionButtonStyle = {
        backgroundColor: "#E1B996",
        borderWidth: 1,
        borderColor: "rgba(43,43,43,0.22)",
        shadowColor: "#000000",
        shadowOffset: {width: 0, height: 5},
        shadowOpacity: 0.24,
        shadowRadius: 8,
        elevation: 6,
    };

    return (
        <Animated.View
            pointerEvents="auto"
            style={[
                tw`mx-4 mt-2 overflow-hidden rounded-3xl border border-[#B55941] px-4 py-3`,
                {
                    backgroundColor: "rgba(15,15,15,0.96)",
                    shadowColor: "#B55941",
                    shadowOffset: {width: 0, height: 0},
                    shadowOpacity: 0.38,
                    shadowRadius: 14,
                    elevation: 8,
                    opacity,
                    transform: [{translateY}],
                },
            ]}
        >
            <View style={tw`flex-row items-start gap-3`}>
                <View style={tw`mt-1 h-3 w-3 rounded-full bg-[#B55941]`}/>
                <View style={tw`flex-1`}>
                    <Text style={[tw`text-sm`, {fontFamily: fonts.heading, color: "#E4E0D4"}]}>
                        App update ready
                    </Text>
                    <Text style={[tw`mt-1 text-xs leading-4`, {fontFamily: fonts.body, color: "rgba(228,224,212,0.78)"}]}>
                        A new Rhodie update has downloaded. Apply it now to get the latest fixes and styling.
                    </Text>
                </View>
                <Button
                    label="Apply"
                    onPress={() => void handleApply()}
                    shine
                    hapticAction={false}
                    style={[tw`px-4 py-2`, actionButtonStyle]}
                    textStyle={[tw`text-xs`, {color: "#111111"}]}
                />
            </View>
        </Animated.View>
    );
}
