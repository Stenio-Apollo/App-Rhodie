import {Text, View} from "react-native";
import tw from "../../lib/tw";
import {fonts} from "../../theme/fonts";
import {useScreenVisualMode} from "../ScreenBackground";

interface BadgeProps {
    label: string;
    tone?: "default" | "accent" | "count";
}

export function Badge({label, tone = "default"}: BadgeProps) {
    const visualMode = useScreenVisualMode();
    const riverMode = visualMode === "river";
    const lightMode = riverMode;
    const georgiaMode = visualMode === "georgia" || visualMode === "evergreen" || visualMode === "navy";
    const sonnyMode = visualMode === "sonny";
    const whiteTextMode = georgiaMode;
    const isAccent = tone === "accent";
    const isCount = tone === "count";
    const badgeBorderColor = isAccent
        ? sonnyMode ? "#FF3800" : "#B55941"
        : riverMode ? "rgba(17,17,17,0.14)" : "rgba(223,196,170,0.32)";
    const badgeBackgroundColor = isAccent
        ? sonnyMode ? "rgba(255,56,0,0.28)" : "rgba(181,89,65,0.28)"
        : riverMode ? "rgba(255,255,255,0.78)" : sonnyMode ? "#000000" : "rgba(15,15,15,0.85)";
    const badgeTextColor = whiteTextMode
        ? "#FFFFFF"
        : riverMode ? "#111111" : sonnyMode ? "#FFFFFF" : isAccent ? "#FFF6E8" : "#DFC4AA";

    if (isCount) {
        return (
            <Text
                style={[
                    tw`px-2 py-1 text-[10px] font-bold tracking-[1px]`,
                    {fontFamily: fonts.strong, color: whiteTextMode ? "#FFFFFF" : lightMode ? "#111111" : "#DFC4AA"},
                ]}
            >
                {label}
            </Text>
        );
    }

    return (
        <View
            style={[
                tw`rounded-lg border px-2 py-1`,
                {borderColor: badgeBorderColor, backgroundColor: badgeBackgroundColor},
            ]}
        >
            <Text
                style={[
                    tw`text-[10px] font-bold tracking-[1px]`,
                    {fontFamily: fonts.strong, color: badgeTextColor},
                ]}
            >
                {label}
            </Text>
        </View>
    );
}
