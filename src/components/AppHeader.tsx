import {Pressable, Text, View} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";
import {haptics} from "../lib/haptics";
import type {VisualMode} from "../state/useVisualMode";
import {Button} from "./ui/Button";

interface AppHeaderProps {
    fullName: string | null | undefined;
    accountOpen: boolean;
    visualMode: VisualMode;
    onToggleVisualMode: () => void;
    onToggleAccount: () => void;
}

export function AppHeader({
                              fullName,
                              accountOpen,
                              visualMode,
                              onToggleVisualMode,
                              onToggleAccount,
                          }: AppHeaderProps) {
    const headerButtonDepthStyle = {
        shadowColor: "#000000",
        shadowOffset: {width: 0, height: 5},
        shadowOpacity: 0.24,
        shadowRadius: 8,
        elevation: 6,
    };
    const headerModeButtonStyle = {
        ...headerButtonDepthStyle,
        backgroundColor: visualMode === "sunset" ? "#983a1f" : "#3895c5",
        borderWidth: 1,
        borderColor: "rgba(43,43,43,0.22)",
    };
    return (
        <View style={tw`flex-row items-center justify-between px-4 py-3`}>
            <View style={tw`flex-row items-center gap-3`}>
                <Text
                    style={[
                        tw`text-xl rounded-lg border border-white px-2 py-1`,
                        {color: "#E4E0D4", fontFamily: fonts.heading, letterSpacing: 0.5},
                    ]}
                >
                    rh.
                </Text>
                <View style={tw`rounded-2xl px-2 py-1.5`}>
                    <Text style={[tw`text-sm`, {fontFamily: fonts.heading, color: "#E4E0D4"}]}>
                        {fullName ? `Welcome, ${fullName}` : "Welcome back"}
                    </Text>
                </View>
            </View>
            <View style={tw`flex-row items-center gap-2`}>
                <Button
                    label={visualMode === "sunset" ? "Sunset" : "Overcast"}
                    onPress={onToggleVisualMode}
                    shine
                    style={[tw`rounded-full px-3 py-1.5`, headerModeButtonStyle]}
                    textStyle={[tw`text-[11px]`, {color: "#FFF6E8"}]}
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
                    <Ionicons name={accountOpen ? "close" : "menu"} size={20} color="#FFF6E8"/>
                </Pressable>
            </View>
        </View>
    );
}
