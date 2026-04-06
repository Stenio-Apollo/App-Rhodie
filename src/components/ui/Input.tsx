import type {ComponentProps} from "react";
import {TextInput} from "react-native";
import tw from "../../lib/tw";
import {fonts} from "../../theme/fonts";

export function Input(props: ComponentProps<typeof TextInput>) {
    return (
        <TextInput
            placeholderTextColor="#6b7280"
            style={[tw`rounded-xl border border-[#2c2c2c] bg-[#0f0f0f] px-3 py-2.5 text-[#E4E0D4]`, {fontFamily: fonts.body}, props.style]}
            {...props}
        />
    );
}
