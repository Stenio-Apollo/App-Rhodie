import {Pressable, Text, View, type StyleProp, type TextStyle, type ViewStyle} from "react-native";
import {LinearGradient} from "expo-linear-gradient";
import tw from "../../lib/tw";
import {fonts} from "../../theme/fonts";
import {type HapticAction, triggerHaptic} from "../../lib/haptics";

interface ButtonProps {
    label: string;
    onPress: () => void;
    variant?: "primary" | "secondary" | "danger" | "outlineAccent" | "glossy";
    disabled?: boolean;
    hapticAction?: HapticAction | false;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    shine?: boolean;
}

export function Button({
                           label,
                           onPress,
                           variant = "primary",
                           disabled = false,
                           hapticAction = "selection",
                           style,
                           textStyle,
                           shine = false,
                       }: ButtonProps) {
    const glossy = variant === "glossy";
    const hasShine = glossy || shine;
    const bgStyle =
                glossy
            ? {
                borderWidth: 1,
                borderColor: "#171717",
                backgroundColor: "#171717",
                shadowColor: "#000000",
                shadowOffset: {width: 0, height: 1},
                shadowOpacity: 0.12,
                shadowRadius: 3,
                elevation: 2,
            }
            : variant === "secondary"
            ? tw`bg-transparent border border-zinc-200`
            : variant === "outlineAccent"
                ? {backgroundColor: "transparent", borderWidth: 1, borderColor: "#B55941"}
                : variant === "danger"
                    ? {backgroundColor: "transparent", borderWidth: 1, borderColor: "#7f1d1d"}
                    : {backgroundColor: "#2B2B2B"};

    const textColor =
        variant === "danger"
            ? "#fecaca"
            : glossy
                ? "#FFF6E8"
                : "#E4E0D4";

    return (
        <Pressable
            onPress={() => {
                if (hapticAction) {
                    triggerHaptic(hapticAction);
                }
                onPress();
            }}
            disabled={disabled}
            style={({pressed}) => [
                tw`rounded-xl px-3.5 py-2.5`,
                hasShine && tw`overflow-hidden`,
                bgStyle,
                hasShine && !glossy
                    ? {
                        shadowColor: "#000000",
                        shadowOffset: {width: 0, height: 1},
                        shadowOpacity: 0.11,
                        shadowRadius: 3,
                        elevation: 2,
                    }
                    : null,
                style,
                disabled && tw`opacity-50`,
                pressed && !disabled && (hasShine ? {opacity: 0.78, transform: [{translateY: 1}]} : tw`opacity-90`),
            ]}
        >
            {({pressed}) => (
                <>
                    {hasShine ? (
                        <>
                            <LinearGradient
                                colors={["rgba(255,255,255,0.07)", "rgba(255,255,255,0.01)", "rgba(0,0,0,0.14)"]}
                                locations={[0, 0.48, 1]}
                                pointerEvents="none"
                                style={tw`absolute inset-0`}
                            />
                            <View
                                pointerEvents="none"
                                style={[
                                    tw`absolute left-2 right-2 top-0.5 h-1 rounded-full`,
                                    {backgroundColor: "rgba(255,255,255,0.035)"},
                                ]}
                            />
                        </>
                    ) : null}
                    <Text
                        style={[
                            tw`text-center text-xs`,
                            {color: textColor, fontFamily: fonts.button},
                            textStyle,
                            pressed && !disabled && tw`opacity-100`,
                        ]}
                    >
                        {label}
                    </Text>
                </>
            )}
        </Pressable>
    );
}
