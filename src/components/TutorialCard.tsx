import {Pressable, Text, View} from "react-native";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";
import {haptics} from "../lib/haptics";

interface TutorialCardProps {
    eyebrow?: string;
    title: string;
    body: string;
    actionLabel?: string;
    onDismiss: () => void;
}

export function TutorialCard({eyebrow = "Quick guide", title, body, actionLabel = "Got it", onDismiss}: TutorialCardProps) {
    return (
        <View style={tw`rounded-[26px] border border-[#B55941]/55 bg-black/72 p-4`}>
            <View style={tw`flex-row items-start justify-between gap-3`}>
                <View style={tw`flex-1`}>
                    <Text style={[tw`text-[10px] uppercase tracking-[2px] text-[#B55941]`, {fontFamily: fonts.strong}]}>
                        {eyebrow}
                    </Text>
                    <Text style={[tw`mt-1 text-base text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                        {title}
                    </Text>
                    <Text style={[tw`mt-2 text-sm leading-5 text-slate-300`, {fontFamily: fonts.body}]}>
                        {body}
                    </Text>
                </View>
                <Pressable
                    onPress={() => {
                        haptics.selection();
                        onDismiss();
                    }}
                    style={({pressed}) => [
                        tw`rounded-full border border-[#E4E0D4]/20 px-3 py-1.5`,
                        pressed && tw`opacity-75`,
                    ]}
                >
                    <Text style={[tw`text-xs text-[#E4E0D4]`, {fontFamily: fonts.button}]}>
                        {actionLabel}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}
