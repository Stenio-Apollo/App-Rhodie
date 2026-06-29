import type {PropsWithChildren} from "react";
import {type StyleProp, StyleSheet, View, type ViewStyle} from "react-native";
import {BlurView} from "expo-blur";
import {LinearGradient} from "expo-linear-gradient";
import tw from "../lib/tw";

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
    if (blur) {
        return (
            <View
                style={[
                    tw`overflow-hidden bg-black/10 p-1`,
                    {borderRadius: radius + 4},
                    style,
                ]}
            >
                <BlurView
                    intensity={30}
                    tint="dark"
                    style={[
                        tw`overflow-hidden border border-slate-700/60`,
                        {borderRadius: radius},
                    ]}
                >
                    <View
                        pointerEvents="none"
                        style={[StyleSheet.absoluteFill, {backgroundColor: "rgba(0,0,0,0.22)"}]}
                    />
                    <LinearGradient
                        colors={["rgba(181,89,65,0.06)", "rgba(255,255,255,0.015)", "transparent"]}
                        locations={[0, 0.5, 1]}
                        pointerEvents="none"
                        style={[tw`absolute left-0 right-0 top-0`, {height: "45%"}]}
                    />
                    <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.18)"]}
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
                tw`overflow-hidden border border-slate-700/60`,
                {backgroundColor: "rgba(0,0,0,0.22)", borderRadius: radius},
                style,
            ]}
        >
            <LinearGradient
                colors={["rgba(181,89,65,0.06)", "rgba(255,255,255,0.015)", "transparent"]}
                locations={[0, 0.5, 1]}
                pointerEvents="none"
                style={[tw`absolute left-0 right-0 top-0`, {height: "45%"}]}
            />
            <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.18)"]}
                pointerEvents="none"
                style={[tw`absolute left-0 right-0 bottom-0`, {height: "28%"}]}
            />
            {children}
        </View>
    );
}
