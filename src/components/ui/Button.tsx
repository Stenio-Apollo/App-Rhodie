import {Pressable, Text} from "react-native";
import tw from "../../lib/tw";
import {fonts} from "../../theme/fonts";

interface ButtonProps {
    label: string;
    onPress: () => void;
    variant?: "primary" | "secondary" | "danger";
}

export function Button({label, onPress, variant = "primary"}: ButtonProps) {
    const bg =
        variant === "secondary"
            ? tw`bg-transparent border border-zinc-200`
            : variant === "danger"
                ? tw`bg-slate-200`
                : tw`bg-slate-700`;

    const color = variant === "secondary" ? tw`text-zinc-200` : tw`text-black`;

    return (
        <Pressable
            onPress={onPress}
            style={({pressed}) => [
                tw`rounded-lg px-3.5 py-2.5`,
                bg,
                pressed && tw`opacity-90`
            ]}
        >
            {({pressed}) => (
                <Text
                    style={[
                        tw`text-center text-xs`,
                        color,
                        {fontFamily: fonts.heading},
                        pressed && tw`opacity-100`
                    ]}
                >
                    {label}
                </Text>
            )}
        </Pressable>
    );
}
