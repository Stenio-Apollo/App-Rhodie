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
                                    blur = false,
                                    radius = 24,
                                }: PropsWithChildren<TranslucentCardProps>) {
    const visualMode = useScreenVisualMode();
    const riverMode = visualMode === "river";
    const coastMode = visualMode === "coast";
    const georgiaMode = visualMode === "georgia";
    const lightMode = riverMode || coastMode || georgiaMode;
    const solidSurfaceColor = georgiaMode ? "#2F4F4F" : "#708090";
    const borderColor = lightMode ? "rgba(17,17,17,0.14)" : "rgba(51,65,85,0.6)";
    const surfaceColor = coastMode || georgiaMode ? solidSurfaceColor : lightMode ? "rgba(255,255,255,0.34)" : "rgba(0,0,0,0.22)";
    const topGradient: GradientColors = coastMode || georgiaMode
        ? ["rgba(255,255,255,0.08)", "rgba(255,255,255,0.02)", "transparent"]
        : lightMode
        ? ["rgba(255,255,255,0.32)", "rgba(240,248,255,0.14)", "transparent"]
        : ["rgba(181,89,65,0.06)", "rgba(255,255,255,0.015)", "transparent"];
    const bottomGradient: GradientColors = coastMode || georgiaMode
        ? ["transparent", "rgba(0,0,0,0.1)"]
        : lightMode
        ? ["transparent", "rgba(223,196,170,0.18)"]
        : ["transparent", "rgba(0,0,0,0.18)"];

    if (blur) {
        return (
            <View
                style={[
                    tw`overflow-hidden p-1`,
                    {backgroundColor: coastMode || georgiaMode ? solidSurfaceColor : lightMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"},
                    {borderRadius: radius + 4},
                    style,
                ]}
            >
                <BlurView
                    intensity={30}
                    tint={lightMode ? "light" : "dark"}
                    style={[
                        tw`overflow-hidden border`,
                        {borderColor},
                        {borderRadius: radius},
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
                        style={[tw`absolute left-0 right-0 top-0`, {height: "45%"}]}
                    />
                    <LinearGradient
                        colors={bottomGradient}
                        pointerEvents="none"
                        style={[tw`absolute left-0 right-0 bottom-0`, {height: "28%"}]}
                    />
                    {children}
                </BlurView>
            </View>
        );
    }

    return (
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
                style={[tw`absolute left-0 right-0 top-0`, {height: "45%"}]}
            />
            <LinearGradient
                colors={bottomGradient}
                pointerEvents="none"
                style={[tw`absolute left-0 right-0 bottom-0`, {height: "28%"}]}
            />
            {children}
        </View>
    );
}
