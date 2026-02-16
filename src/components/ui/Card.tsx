import type {PropsWithChildren} from "react";
import {View} from "react-native";
import tw from "../../lib/tw";

export function Card({children}: PropsWithChildren) {
    return <View
        style={tw`rounded-2xl border-r border-b  border-blue-200 bg-orange-100 p-3`}>{children}</View>;
}
