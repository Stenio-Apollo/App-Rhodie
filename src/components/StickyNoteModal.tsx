import {Animated, Modal, Pressable, Text, TextInput, View} from "react-native";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";
import {Button} from "./ui/Button";
import {useKeyboardInset} from "../lib/useKeyboardInset";
import {useScreenVisualMode} from "./ScreenBackground";

interface StickyNoteModalProps {
    visible: boolean;
    text: string;
    onChangeText: (text: string) => void;
    onAddToTask: () => void;
    onClear: () => void;
    onClose: () => void;
}

export function StickyNoteModal({
                                    visible,
                                    text,
                                    onChangeText,
                                    onAddToTask,
                                    onClear,
                                    onClose,
                                }: StickyNoteModalProps) {
    const canAddTask = text.trim().length > 0;
    const {keyboardInset} = useKeyboardInset();
    const visualMode = useScreenVisualMode();
    const riverMode = visualMode === "river";
    const stickyNoteHeaderColor = riverMode ? "#ba885a" : "#2B2B2B";

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            <Animated.View
                style={[tw`flex-1 justify-center px-5`, {paddingBottom: keyboardInset}]}
            >
                <Pressable style={tw`absolute inset-0 bg-black/72`} onPress={onClose}/>
                <View
                    style={[
                        tw`rounded-[28px] border border-[#6E4C2F] bg-[#DFC4AA] p-5`,
                        {
                            shadowColor: "#000000",
                            shadowOffset: {width: 0, height: 16},
                            shadowOpacity: 0.36,
                            shadowRadius: 24,
                            elevation: 12,
                        },
                    ]}
                >
                    <View style={tw`mb-4 flex-row items-start justify-between gap-4`}>
                        <View style={tw`flex-1`}>
                            <Text
                                style={[tw`text-xs uppercase tracking-[2px]`, {
                                    fontFamily: fonts.body,
                                    color: riverMode ? "rgba(186,136,90,0.78)" : "rgba(43,43,43,0.7)",
                                }]}>
                                Quick note
                            </Text>
                            <Text style={[tw`mt-1 text-2xl`, {
                                fontFamily: fonts.heading,
                                color: stickyNoteHeaderColor,
                            }]}>
                                Sticky note
                            </Text>
                        </View>
                        <Pressable
                            onPress={onClose}
                            style={({pressed}) => [
                                tw`h-10 w-10 items-center justify-center rounded-full bg-[#2B2B2B]/14`,
                                pressed && tw`opacity-70`,
                            ]}
                        >
                            <Text style={[tw`text-lg text-[#2B2B2B]`, {fontFamily: fonts.heading}]}>x</Text>
                        </Pressable>
                    </View>

                    <TextInput
                        value={text}
                        onChangeText={onChangeText}
                        multiline
                        autoFocus
                        keyboardAppearance="dark"
                        textAlignVertical="top"
                        placeholder="add notes here"
                        placeholderTextColor="rgba(43,43,43,0.45)"
                        style={[
                            tw`min-h-[220px] rounded-3xl border border-[#2B2B2B]/18 bg-[#DFC4AA]/62 px-4 py-4 text-lg text-[#2B2B2B]`,
                            {fontFamily: fonts.body},
                        ]}
                    />

                    <View style={tw`mt-4 flex-row gap-2`}>
                        <Button
                            label="Clear"
                            variant="outlineAccent"
                            onPress={onClear}
                            style={tw`flex-1 border-[#2B2B2B]/30 px-2`}
                            textStyle={[tw`text-[10px]`, {color: "#2B2B2B"}]}
                        />
                        <Button
                            label="Add to task"
                            variant="glossy"
                            onPress={onAddToTask}
                            disabled={!canAddTask}
                            style={tw`flex-1 px-2`}
                            textStyle={tw`text-[10px]`}
                        />
                    </View>
                </View>
            </Animated.View>
        </Modal>
    );
}
