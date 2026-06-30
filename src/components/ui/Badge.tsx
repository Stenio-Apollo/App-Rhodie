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
    const lightMode = visualMode === "surfSide" || visualMode === "overcast";
    const isAccent = tone === "accent";
    const isCount = tone === "count";

    if (isCount) {
        return (
            <Text
                style={[
                    tw`px-2 py-1 text-[10px] font-bold tracking-[1px]`,
                    {fontFamily: fonts.strong, color: lightMode ? "#111111" : "#DFC4AA"},
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
                isAccent
                    ? {borderColor: "#B55941", backgroundColor: "rgba(181,89,65,0.28)"}
                    : {borderColor: "rgba(223,196,170,0.32)", backgroundColor: "rgba(15,15,15,0.85)"},
            ]}
        >
            <Text
                style={[
                    tw`text-[10px] font-bold tracking-[1px]`,
                    {fontFamily: fonts.strong, color: isAccent ? "#FFF6E8" : "#DFC4AA"},
                ]}
            >
                {label}
            </Text>
        </View>
    );
}
