import {createContext, type PropsWithChildren, useContext} from "react";
import {ImageBackground, type ImageSourcePropType, type ImageStyle, type StyleProp, View, type ViewStyle} from "react-native";
import type {VisualMode} from "../state/useVisualMode";
import tw from "../lib/tw";

interface ScreenBackgroundProps {
    visualMode: VisualMode;
    source?: ImageSourcePropType;
    style?: StyleProp<ViewStyle>;
    imageStyle?: StyleProp<ImageStyle>;
}

const ScreenVisualModeContext = createContext<VisualMode>("river");

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
                <View style={[tw`flex-1`, {backgroundColor: "transparent"}, style]}>{children}</View>
            </ScreenVisualModeContext.Provider>
        );
    }

    if (visualMode === "sonny") {
        return (
            <ScreenVisualModeContext.Provider value={visualMode}>
                <View style={[tw`flex-1`, {backgroundColor: "transparent"}, style]}>{children}</View>
            </ScreenVisualModeContext.Provider>
        );
    }

    if (visualMode === "georgia") {
        return (
            <ScreenVisualModeContext.Provider value={visualMode}>
                <View style={[tw`flex-1`, style]}>{children}</View>
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
