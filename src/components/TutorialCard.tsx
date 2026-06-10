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

export function TutorialCard({
                                 eyebrow = "Quick guide",
                                 title,
                                 body,
                                 actionLabel = "Got it",
                                 onDismiss
                             }: TutorialCardProps) {
    return (
        <View style={[tw`rounded-[26px] border p-4`, {backgroundColor: "#B6ADA4", borderColor: "#A89B94"}]}>
            <View style={tw`flex-row items-start justify-between gap-3`}>
                    <View style={tw`flex-1`}>
                        <Text style={[tw`text-[10px] uppercase tracking-[2px]`, {
                            fontFamily: fonts.strong,
                            color: "rgba(43,43,43,0.62)",
                        }]}>
                            {eyebrow}
                        </Text>
                        <Text style={[tw`mt-1 text-base`, {fontFamily: fonts.heading, color: "#2B2B2B"}]}>
                            {title}
                        </Text>
                        <Text style={[tw`mt-2 text-sm leading-5`, {
                            fontFamily: fonts.body,
                            color: "rgba(43,43,43,0.82)",
                        }]}>
                            {body}
                        </Text>
                    </View>
                    <Pressable
                        onPress={() => {
                            haptics.selection();
                            onDismiss();
                        }}
                        style={({pressed}) => [
                            tw`overflow-hidden rounded-full border px-3 py-1.5`,
                            {
                                borderColor: "#171717",
                                backgroundColor: "#171717",
                                shadowColor: "#000000",
                                shadowOffset: {width: 0, height: 4},
                                shadowOpacity: 0.32,
                                shadowRadius: 7,
                                elevation: 5,
                            },
                            pressed && {opacity: 0.78, transform: [{translateY: 1}]},
                        ]}
                    >
                        <View
                            pointerEvents="none"
                            style={[
                                tw`absolute left-1 right-1 top-0.5 h-2 rounded-full`,
                                {backgroundColor: "rgba(255,255,255,0.16)"},
                            ]}
                        />
                        <Text style={[tw`text-xs`, {fontFamily: fonts.button, color: "#FFF6E8"}]}>
                            {actionLabel}
                        </Text>
                    </Pressable>
            </View>
        </View>
    );
}
