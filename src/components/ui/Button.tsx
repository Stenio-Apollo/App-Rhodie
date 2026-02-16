import {Pressable, Text} from "react-native";
import tw from "../../lib/tw";

interface ButtonProps {
    label: string;
    onPress: () => void;
    variant?: "primary" | "secondary" | "danger";
}

export function Button({label, onPress, variant = "primary"}: ButtonProps) {
    const bg =
        variant === "secondary"
            ? tw`bg-orange-100 border border-blue-200 `
            : variant === "danger"
                ? tw`bg-black text-black`
                : tw`bg-zinc-900 text-black`;

    const color = variant === "secondary" ? tw`text-slate-700` : tw`text-white`;

    return (
        <Pressable onPress={onPress} style={[tw`rounded-xl px-3.5 py-2.5`, bg]}>
            <Text style={[tw`text-center text-sm font-bold`, color]}>{label}</Text>
        </Pressable>
    );
}
