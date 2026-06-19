import {Image, Pressable, Text, View} from "react-native";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";
import {haptics} from "../lib/haptics";
import type {VisualMode} from "../state/useVisualMode";
import {Button} from "./ui/Button";

const PROFILE_ICON = require("../../public/images/profile.png");

interface AppHeaderProps {
    fullName: string | null | undefined;
    accountOpen: boolean;
    birthdayActive: boolean;
    visualMode: VisualMode;
    onToggleVisualMode: () => void;
    onToggleAccount: () => void;
    onSignOut: () => void;
}

export function AppHeader({
                              fullName,
                              accountOpen,
                              birthdayActive,
                              visualMode,
                              onToggleVisualMode,
                              onToggleAccount,
                              onSignOut,
                          }: AppHeaderProps) {
    const headerSubtitle = accountOpen
        ? "Account settings"
        : birthdayActive
            ? "Happy birthday! Tap here"
            : "Tap to manage account";
    const profileIconColor = accountOpen ? "#B55941" : "#E4E0D4";
    const headerButtonDepthStyle = {
        shadowColor: "#000000",
        shadowOffset: {width: 0, height: 5},
        shadowOpacity: 0.24,
        shadowRadius: 8,
        elevation: 6,
    };
    const headerModeButtonStyle = {
        ...headerButtonDepthStyle,
        backgroundColor: visualMode === "warm" ? "rgba(225,185,150,0.18)" : "rgba(34,93,125,0.20)",
        borderWidth: 1,
        borderColor: visualMode === "warm" ? "#E1B996" : "#225D7D",
        shadowColor: visualMode === "warm" ? "#E1B996" : "#225D7D",
        shadowOffset: {width: 0, height: 0},
        shadowOpacity: 0.18,
        shadowRadius: 4,
        elevation: 2,
    };
    const headerSignOutButtonStyle = {
        ...headerButtonDepthStyle,
        backgroundColor: "#111111",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.16)",
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
                <Pressable
                    onPress={() => {
                        haptics.selection();
                        onToggleAccount();
                    }}
                    style={({pressed}) => [
                        tw`rounded-2xl px-2 py-1.5`,
                        accountOpen ? {borderWidth: 1, borderColor: "#B55941"} : null,
                        pressed && tw`bg-white/5`,
                    ]}
                >
                    <Text style={[tw`text-sm`, {fontFamily: fonts.heading, color: "#E4E0D4"}]}>
                        {fullName ? `Welcome, ${fullName}` : "Welcome back"}
                    </Text>
                    <View style={tw`mt-0.5 flex-row items-center gap-1.5`}>
                        <Image
                            source={PROFILE_ICON}
                            style={{width: 13, height: 13, tintColor: profileIconColor}}
                            resizeMode="contain"
                        />
                        <Text
                            style={[
                                tw`text-[11px]`,
                                {
                                    fontFamily: fonts.body,
                                    color: accountOpen ? "#B55941" : "rgba(228,224,212,0.72)",
                                },
                            ]}
                        >
                            {headerSubtitle}
                        </Text>
                    </View>
                </Pressable>
            </View>
            <View style={tw`flex-row items-center gap-2`}>
                <Button
                    label={visualMode === "warm" ? "Warm" : "Cool"}
                    onPress={onToggleVisualMode}
                    shine
                    style={[tw`px-3 py-1`, headerModeButtonStyle]}
                    textStyle={[tw`text-xs`, {color: "#E4E0D4"}]}
                />
                <Button
                    label="Sign out"
                    onPress={onSignOut}
                    shine
                    style={[tw`px-3 py-1`, headerSignOutButtonStyle]}
                    textStyle={[tw`text-xs`, {color: "#FFF6E8"}]}
                />
            </View>
        </View>
    );
}
