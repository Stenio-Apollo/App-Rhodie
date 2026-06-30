import {createContext, type PropsWithChildren, useContext} from "react";
import {ImageBackground, type ImageSourcePropType, type ImageStyle, type StyleProp, View, type ViewStyle} from "react-native";
import {LinearGradient} from "expo-linear-gradient";
import type {VisualMode} from "../state/useVisualMode";
import tw from "../lib/tw";

interface ScreenBackgroundProps {
    visualMode: VisualMode;
    source?: ImageSourcePropType;
    style?: StyleProp<ViewStyle>;
    imageStyle?: StyleProp<ImageStyle>;
}

const riverGradientColors = [
    "#DDEAF2",
    "#EFE8DF",
] as const;

const sonnyBackgroundColor = "#000000";
const coastBackgroundColor = "#708090";
const georgiaBackgroundColor = "#2F4F4F";

const ScreenVisualModeContext = createContext<VisualMode>("coast");

export function useScreenVisualMode() {
    return useContext(ScreenVisualModeContext);
}

export function ScreenBackground({
                                     children,
                                     visualMode,
                                     source,
                                     style,
                                     imageStyle,
                                 }: PropsWithChildren<ScreenBackgroundProps>) {
    if (visualMode === "river") {
        return (
            <ScreenVisualModeContext.Provider value={visualMode}>
                <LinearGradient
                    colors={riverGradientColors}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={[tw`flex-1`, style]}
                >
                    {children}
                </LinearGradient>
            </ScreenVisualModeContext.Provider>
        );
    }

    if (visualMode === "sonny") {
        return (
            <ScreenVisualModeContext.Provider value={visualMode}>
                <View style={[tw`flex-1`, {backgroundColor: sonnyBackgroundColor}, style]}>{children}</View>
            </ScreenVisualModeContext.Provider>
        );
    }

    if (visualMode === "georgia") {
        return (
            <ScreenVisualModeContext.Provider value={visualMode}>
                <View style={[tw`flex-1`, {backgroundColor: georgiaBackgroundColor}, style]}>{children}</View>
            </ScreenVisualModeContext.Provider>
        );
    }

    if (visualMode === "coast") {
        return (
            <ScreenVisualModeContext.Provider value={visualMode}>
                <View style={[tw`flex-1`, {backgroundColor: coastBackgroundColor}, style]}>{children}</View>
            </ScreenVisualModeContext.Provider>
        );
    }

    if (!source) {
        return (
            <ScreenVisualModeContext.Provider value={visualMode}>
                <View style={[tw`flex-1`, style]}>{children}</View>
            </ScreenVisualModeContext.Provider>
        );
    }

    return (
        <ScreenVisualModeContext.Provider value={visualMode}>
            <ImageBackground source={source} style={[tw`flex-1`, style]} imageStyle={imageStyle}>
                {children}
            </ImageBackground>
        </ScreenVisualModeContext.Provider>
    );
}
