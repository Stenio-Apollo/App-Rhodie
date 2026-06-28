import {Modal, Pressable, Text, View} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";

interface OwnerActionSheetProps {
    visible: boolean;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

export function OwnerActionSheet({visible, onClose, onEdit, onDelete}: OwnerActionSheetProps) {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={tw`flex-1 justify-center bg-black/72 px-8`} onPress={onClose}>
                <Pressable
                    onPress={(event) => event.stopPropagation()}
                    style={tw`rounded-3xl border border-slate-700 bg-black px-5 pb-5 pt-4`}
                >
                    <View style={tw`mb-2 flex-row justify-end`}>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Close options"
                            onPress={onClose}
                            style={({pressed}) => [
                                tw`h-8 w-8 items-center justify-center rounded-full`,
                                pressed && tw`opacity-70`,
                            ]}
                        >
                            <Ionicons name="close" size={18} color="#ffffff"/>
                        </Pressable>
                    </View>
                    <Pressable
                        onPress={() => {
                            onClose();
                            onEdit();
                        }}
                        style={({pressed}) => [
                            tw`rounded-2xl px-4 py-3`,
                            pressed && tw`bg-white/10`,
                        ]}
                    >
                        <Text style={[tw`text-base text-white`, {fontFamily: fonts.heading}]}>Edit</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => {
                            onClose();
                            onDelete();
                        }}
                        style={({pressed}) => [
                            tw`mt-1 rounded-2xl px-4 py-3`,
                            pressed && tw`bg-white/10`,
                        ]}
                    >
                        <Text style={[tw`text-base text-rose-200`, {fontFamily: fonts.heading}]}>Delete</Text>
                    </Pressable>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
