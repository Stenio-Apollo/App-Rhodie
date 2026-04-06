import {Text, View} from "react-native";
import tw from "../../lib/tw";
import {fonts} from "../../theme/fonts";

interface BadgeProps {
    label: string;
}

export function Badge({label}: BadgeProps) {
    return (
        <View style={tw`rounded-lg bg-slate-800/33 border border-[#2c2c2c] px-2 py-1`}>
            <Text style={[tw`text-xs font-bold text-[#E4E0D4]`, {fontFamily: fonts.body}]}>{label}</Text>
        </View>
    );
}
