import type {PropsWithChildren, ReactElement} from "react";
import {type StyleProp, StyleSheet, View, type ViewStyle} from "react-native";
import {BlurView} from "expo-blur";
import {LinearGradient} from "expo-linear-gradient";
import tw from "../lib/tw";
import {useScreenVisualMode} from "./ScreenBackground";
import {SnakeGlow} from "./SnakeGlow";

type GradientColors = readonly [string, string, ...string[]];

interface TranslucentCardProps {
    style?: StyleProp<ViewStyle>;
    containerStyle?: StyleProp<ViewStyle>;
    blur?: boolean;
    radius?: number;
    glow?: boolean;
}

function withOptionalGlow(node: ReactElement, glow: boolean, radius: number): ReactElement {
    if (!glow) return node;
    return <SnakeGlow radius={radius}>{node}</SnakeGlow>;
}

export function TranslucentCard({
                                    children,
                                    style,
                                    containerStyle,
                                    blur = true,
                                    radius = 24,
                                    glow = false,
                                }: PropsWithChildren<TranslucentCardProps>) {
    const visualMode = useScreenVisualMode();
    const riverMode = visualMode === "river";
    const georgiaMode = visualMode === "georgia" || visualMode === "evergreen" || visualMode === "navy";
    const sonnyMode = visualMode === "sonny";
    const lightMode = riverMode || georgiaMode;
    const frostedLight = riverMode;
    const borderColor = georgiaMode
        ? "rgba(255,255,255,0.22)"
        : lightMode ? "rgba(255,255,255,0.35)" : sonnyMode ? "rgba(255,255,255,0.24)" : "rgba(255,255,255,0.18)";
    const surfaceColor = georgiaMode
            ? "rgba(0,0,0,0.28)"
            : lightMode
                ? "rgba(255,255,255,0.22)"
                : sonnyMode ? "rgba(0,0,0,0.34)" : "rgba(20,20,20,0.28)";
    const topGradient: GradientColors = georgiaMode
            ? ["rgba(255,255,255,0.16)", "rgba(255,255,255,0.04)", "transparent"]
            : lightMode
                ? ["rgba(232,244,255,0.38)", "rgba(210,232,255,0.18)", "transparent"]
                : sonnyMode
                    ? ["rgba(255,255,255,0.16)", "rgba(255,255,255,0.04)", "transparent"]
                    : ["rgba(255,255,255,0.14)", "rgba(255,255,255,0.03)", "transparent"];
    const bottomGradient: GradientColors = georgiaMode
        ? ["transparent", "rgba(0,0,0,0.24)"]
        : lightMode
            ? ["transparent", "rgba(0,0,0,0.16)"]
            : sonnyMode ? ["transparent", "rgba(0,0,0,0.24)"] : ["transparent", "rgba(0,0,0,0.28)"];
    const shadowStyle = {
        shadowColor: "#000000",
        shadowOffset: {width: 0, height: 8},
        shadowOpacity: frostedLight ? 0.18 : 0.32,
        shadowRadius: 16,
        elevation: 8,
    } as const;

    if (blur) {
        return withOptionalGlow(
            <View style={[{borderRadius: radius}, shadowStyle, containerStyle]}>
                <BlurView
                    intensity={frostedLight ? 42 : georgiaMode ? 38 : sonnyMode ? 42 : 34}
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
            </View>,
            glow,
            radius,
        );
    }

    return withOptionalGlow(
        <View style={[{borderRadius: radius}, shadowStyle, containerStyle]}>
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
        </View>,
        glow,
        radius,
    );
}
