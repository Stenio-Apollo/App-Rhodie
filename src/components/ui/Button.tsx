import {Pressable, Text} from "react-native";
import tw from "../../lib/tw";
import {fonts} from "../../theme/fonts";

interface ButtonProps {
    label: string;
    onPress: () => void;
    variant?: "primary" | "secondary" | "danger";
}

export function Button({label, onPress, variant = "primary"}: ButtonProps) {
    const bgStyle =
        variant === "secondary"
            ? tw`bg-transparent border border-zinc-200`
            : variant === "danger"
                ? {backgroundColor: "#2B2B2B"}
                : {backgroundColor: "#2B2B2B"};

    const textColor = variant === "secondary" ? "#E4E0D4" : "#E4E0D4";

    return (
        <Pressable
            onPress={onPress}
            style={({pressed}) => [
                tw`rounded-lg px-3.5 py-2.5`,
                bgStyle,
                pressed && tw`opacity-90`
            ]}
        >
            {({pressed}) => (
                <Text
                    style={[
                        tw`text-center text-xs`,
                        {color: textColor},
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
