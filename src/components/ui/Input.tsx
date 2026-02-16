import type { ComponentProps } from "react";
import { TextInput } from "react-native";
import tw from "../../lib/tw";

export function Input(props: ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor="#64748b"
      style={tw`rounded-xl border border-zinc-900 bg-white px-3 py-2.5 text-zinc-900`}
      {...props}
    />
  );
}
