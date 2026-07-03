import {Image, Pressable, Text, View} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";
import {haptics} from "../lib/haptics";
import type {VisualMode} from "../state/useVisualMode";
import {Button} from "./ui/Button";

interface AppHeaderProps {
    fullName: string | null | undefined;
    avatarUrl?: string | null;
    accountOpen: boolean;
    visualMode: VisualMode;
    avatarBusy?: boolean;
    onChangeAvatar?: () => void;
    onToggleVisualMode: () => void;
    onToggleAccount: () => void;
}

export function AppHeader({
                              fullName,
                              avatarUrl,
                              accountOpen,
                              visualMode,
                              avatarBusy = false,
                              onChangeAvatar,
                              onToggleVisualMode,
                              onToggleAccount,
                          }: AppHeaderProps) {
    const riverMode = visualMode === "river";
    const georgiaMode = visualMode === "georgia";
    const lightMode = riverMode || georgiaMode;
    const headerTextColor = georgiaMode ? "#FFFFFF" : lightMode ? "#111111" : "#E4E0D4";
    const logoTextColor = georgiaMode ? "#FFFFFF" : headerTextColor;
    const logoBorderColor = georgiaMode ? "#FFFFFF" : lightMode ? "rgba(17,17,17,0.72)" : "#FFFFFF";
    const avatarFallbackColor = lightMode ? "#111111" : "#FFF6E8";
    const avatarFallbackBackgroundColor = lightMode ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.4)";
    const modeButton = visualMode === "georgia"
        ? {label: "Georgia", backgroundColor: "#111111", textColor: "#FFF6E8"}
        : visualMode === "river"
            ? {label: "River", backgroundColor: "#F0F8FF", textColor: "#111111"}
            : {label: "Sonny", backgroundColor: "#000000", textColor: "#FFF6E8"};
    const headerButtonDepthStyle = {
        shadowColor: "#000000",
        shadowOffset: {width: 0, height: 5},
        shadowOpacity: 0.24,
        shadowRadius: 8,
        elevation: 6,
    };
    const headerModeButtonStyle = {
        ...headerButtonDepthStyle,
        backgroundColor: modeButton.backgroundColor,
        borderWidth: 1,
        borderColor: "rgba(43,43,43,0.22)",
    };
    return (
        <View style={tw`flex-row items-center justify-between px-4 py-3`}>
            <View style={tw`flex-row items-center gap-3`}>
                <Text
                    style={[
                        tw`text-xl rounded-lg border px-2 py-1`,
                        {
                            borderColor: logoBorderColor,
                            color: logoTextColor,
                            fontFamily: fonts.heading,
                            letterSpacing: 0.5,
                        },
                    ]}
                >
                    rh.
                </Text>
                <View style={tw`rounded-2xl px-2 py-1.5`}>
                    <View style={tw`flex-row items-center gap-2`}>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Change profile photo"
                            disabled={avatarBusy || !onChangeAvatar}
                            onPress={() => {
                                haptics.selection();
                                onChangeAvatar?.();
                            }}
                            style={({pressed}) => [
                                tw`h-8 w-8 rounded-full`,
                                avatarBusy && tw`opacity-50`,
                                pressed && tw`opacity-75`,
                            ]}
                        >
                            {avatarUrl ? (
                                <Image source={{uri: avatarUrl}} style={tw`h-8 w-8 rounded-full bg-black/40`}/>
                            ) : (
                                <View
                                    style={[
                                        tw`h-8 w-8 items-center justify-center rounded-full border`,
                                        {
                                            backgroundColor: avatarFallbackBackgroundColor,
                                            borderColor: lightMode ? "rgba(17,17,17,0.3)" : "rgba(255,255,255,0.45)",
                                        },
                                    ]}
                                >
                                    <Text style={[tw`text-xs`, {fontFamily: fonts.heading, color: avatarFallbackColor}]}>
                                        {(fullName?.trim()?.[0] ?? "R").toUpperCase()}
                                    </Text>
                                </View>
                            )}
                        </Pressable>
                        <Text style={[tw`text-sm`, {fontFamily: fonts.heading, color: headerTextColor}]}>
                            {fullName ? `Welcome, ${fullName}` : "Welcome back"}
                        </Text>
                    </View>
                </View>
            </View>
            <View style={tw`flex-row items-center gap-2`}>
                <Button
                    label={modeButton.label}
                    onPress={onToggleVisualMode}
                    shine
                    style={[tw`rounded-full px-3 py-1.5`, headerModeButtonStyle]}
                    textStyle={[tw`text-[11px]`, {color: modeButton.textColor}]}
                />
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={accountOpen ? "Close account menu" : "Open account menu"}
                    onPress={() => {
                        haptics.selection();
                        onToggleAccount();
                    }}
                    style={({pressed}) => [
                        tw`h-8 w-10 items-center justify-center rounded-full overflow-hidden`,
                        pressed && {opacity: 0.78, transform: [{translateY: 1}]},
                    ]}
                >
                    <Ionicons name={accountOpen ? "close" : "menu"} size={20} color={georgiaMode ? "#FFFFFF" : avatarFallbackColor}/>
                </Pressable>
            </View>
        </View>
    );
}
