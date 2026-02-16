import {Text, View} from "react-native";
import tw from "../../lib/tw";

interface BadgeProps {
    label: string;
}

export function Badge({label}: BadgeProps) {
    return (
        <View style={tw`border rounded-lg bg-slate-200 px-2 py-1`}>
            <Text style={tw`text-xs font-bold text-slate-900`}>{label}</Text>
        </View>
    );
}
