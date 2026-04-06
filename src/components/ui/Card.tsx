import type {PropsWithChildren} from "react";
import {View} from "react-native";
import tw from "../../lib/tw";

export function Card({children}: PropsWithChildren) {
    return <View style={tw`rounded-2xl border border-[#2c2c2c] bg-[#111111] p-3`}>{children}</View>;
}
