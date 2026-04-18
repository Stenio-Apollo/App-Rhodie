import {Pressable, Text} from "react-native";
import tw from "../../lib/tw";
import {fonts} from "../../theme/fonts";

interface ButtonProps {
    label: string;
    onPress: () => void;
    variant?: "primary" | "secondary" | "danger" | "outlineAccent";
    disabled?: boolean;
}

export function Button({label, onPress, variant = "primary", disabled = false}: ButtonProps) {
    const bgStyle =
        variant === "secondary"
            ? tw`bg-transparent border border-zinc-200`
            : variant === "outlineAccent"
                ? {backgroundColor: "transparent", borderWidth: 1, borderColor: "#B55941"}
                : variant === "danger"
                    ? {backgroundColor: "transparent", borderWidth: 1, borderColor: "#7f1d1d"}
                    : {backgroundColor: "#2B2B2B"};

    const textColor =
        variant === "danger"
            ? "#fecaca"
            : "#E4E0D4";

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={({pressed}) => [
                tw`rounded-lg px-3.5 py-2.5`,
                bgStyle,
                disabled && tw`opacity-50`,
                pressed && !disabled && tw`opacity-90`,
            ]}
        >
            {({pressed}) => (
                <Text
                    style={[
                        tw`text-center text-xs`,
                        {color: textColor, fontFamily: fonts.button},
                        pressed && !disabled && tw`opacity-100`,
                    ]}
                >
                    {label}
                </Text>
            )}
        </Pressable>
    );
}
