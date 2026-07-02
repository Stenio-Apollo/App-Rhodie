import type {PropsWithChildren} from "react";
import {type StyleProp, StyleSheet, View, type ViewStyle} from "react-native";
import {BlurView} from "expo-blur";
import {LinearGradient} from "expo-linear-gradient";
import tw from "../lib/tw";
import {useScreenVisualMode} from "./ScreenBackground";

type GradientColors = readonly [string, string, ...string[]];

interface TranslucentCardProps {
    style?: StyleProp<ViewStyle>;
    blur?: boolean;
    radius?: number;
}

export function TranslucentCard({
                                    children,
                                    style,
                                    blur = true,
                                    radius = 24,
                                }: PropsWithChildren<TranslucentCardProps>) {
    const visualMode = useScreenVisualMode();
    const riverMode = visualMode === "river";
    const coastMode = visualMode === "coast";
    const georgiaMode = visualMode === "georgia";
    const lightMode = riverMode || coastMode || georgiaMode;
    const solidSurfaceColor = georgiaMode ? "#111111" : "#708090";
    const frostedLight = riverMode || coastMode;
    const borderColor = georgiaMode
        ? "rgba(255,255,255,0.22)"
        : lightMode ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.18)";
    const surfaceColor = coastMode
        ? solidSurfaceColor
        : georgiaMode
            ? "rgba(0,0,0,0.28)"
            : lightMode
                ? "rgba(255,255,255,0.22)"
                : "rgba(20,20,20,0.28)";
    const topGradient: GradientColors = coastMode
        ? ["rgba(255,255,255,0.14)", "rgba(255,255,255,0.04)", "transparent"]
        : georgiaMode
            ? ["rgba(255,255,255,0.16)", "rgba(255,255,255,0.04)", "transparent"]
            : lightMode
                ? ["rgba(255,255,255,0.42)", "rgba(240,248,255,0.16)", "transparent"]
                : ["rgba(255,255,255,0.14)", "rgba(255,255,255,0.03)", "transparent"];
    const bottomGradient: GradientColors = coastMode || georgiaMode
        ? ["transparent", "rgba(0,0,0,0.24)"]
        : lightMode
            ? ["transparent", "rgba(0,0,0,0.16)"]
            : ["transparent", "rgba(0,0,0,0.28)"];
    const shadowStyle = {
        shadowColor: "#000000",
        shadowOffset: {width: 0, height: 8},
        shadowOpacity: frostedLight ? 0.18 : 0.32,
        shadowRadius: 16,
        elevation: 8,
    } as const;

    if (blur) {
        return (
            <View style={[{borderRadius: radius}, shadowStyle]}>
                <BlurView
                    intensity={frostedLight ? 42 : georgiaMode ? 38 : 34}
                    tint={frostedLight ? "light" : "dark"}
                    style={[
                        tw`overflow-hidden border`,
                        {borderColor, borderRadius: radius},
                        style,
                    ]}
                >
                    <View
                        pointerEvents="none"
                        style={[StyleSheet.absoluteFill, {backgroundColor: surfaceColor}]}
                    />
                    <LinearGradient
                        colors={topGradient}
                        locations={[0, 0.5, 1]}
                        pointerEvents="none"
                        style={[tw`absolute left-0 right-0 top-0`, {height: "55%"}]}
                    />
                    <LinearGradient
                        colors={bottomGradient}
                        pointerEvents="none"
                        style={[tw`absolute left-0 right-0 bottom-0`, {height: "35%"}]}
                    />
                    <View
                        pointerEvents="none"
                        style={[
                            tw`absolute left-0 right-0 top-0 border-t`,
                            {
                                height: 1,
                                borderTopColor: lightMode ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.28)",
                                borderTopLeftRadius: radius,
                                borderTopRightRadius: radius,
                            },
                        ]}
                    />
                    {children}
                </BlurView>
            </View>
        );
    }

    return (
        <View style={[{borderRadius: radius}, shadowStyle]}>
            <View
                style={[
                    tw`overflow-hidden border`,
                    {backgroundColor: surfaceColor, borderColor, borderRadius: radius},
                    style,
                ]}
            >
                <LinearGradient
                    colors={topGradient}
                    locations={[0, 0.5, 1]}
                    pointerEvents="none"
                    style={[tw`absolute left-0 right-0 top-0`, {height: "55%"}]}
                />
                <LinearGradient
                    colors={bottomGradient}
                    pointerEvents="none"
                    style={[tw`absolute left-0 right-0 bottom-0`, {height: "35%"}]}
                />
                {children}
            </View>
        </View>
    );
}
