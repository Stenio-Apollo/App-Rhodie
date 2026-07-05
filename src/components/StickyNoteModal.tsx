import {Animated, Modal, Pressable, StyleSheet, Text, TextInput, View} from "react-native";
import {BlurView} from "expo-blur";
import {LinearGradient} from "expo-linear-gradient";
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
    const georgiaMode = visualMode === "georgia" || visualMode === "evergreen" || visualMode === "navy";
    const sonnyMode = visualMode === "sonny";
    const solidSurfaceColor = "#111111";
    const solidMode = georgiaMode;
    const stickyNoteHeaderColor = georgiaMode ? "#DAC8AE" : riverMode || sonnyMode ? "#ba885a" : "#2B2B2B";
    const stickyNoteBodyColor = georgiaMode || sonnyMode ? "#FFFFFF" : riverMode ? "#111111" : "#2B2B2B";
    const stickyNoteBorderColor = georgiaMode ? "rgba(255,255,255,0.22)" : riverMode ? "rgba(17,17,17,0.14)" : "rgba(51,65,85,0.6)";
    const stickyNoteInputBorderColor = georgiaMode ? "rgba(255,255,255,0.1)" : riverMode ? "rgba(17,17,17,0.1)" : "rgba(51,65,85,0.6)";
    const stickyNoteInputColor = georgiaMode ? "rgba(0,0,0,0.28)" : riverMode ? "rgba(255,255,255,0.24)" : "rgba(0,0,0,0.22)";
    const stickyNoteControlColor = georgiaMode || sonnyMode
        ? "rgba(255,255,255,0.12)"
        : riverMode
            ? "rgba(17,17,17,0.10)"
            : "rgba(43,43,43,0.14)";
    const stickyNotePlaceholderColor = georgiaMode || sonnyMode
        ? "rgba(255,255,255,0.45)"
        : riverMode
            ? "rgba(17,17,17,0.45)"
            : "rgba(43,43,43,0.45)";
    const connectShellBackgroundColor = georgiaMode ? "transparent" : solidMode ? solidSurfaceColor : riverMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)";
    const connectOverlayColor = georgiaMode ? "rgba(0,0,0,0.28)" : solidMode ? solidSurfaceColor : riverMode ? "rgba(255,255,255,0.34)" : "rgba(0,0,0,0.22)";
    const connectTopGradient = georgiaMode ? ["rgba(255,255,255,0.16)", "rgba(255,255,255,0.04)", "transparent"] as const : ["rgba(181,89,65,0.06)", "rgba(255,255,255,0.015)", "transparent"] as const;
    const connectBottomGradient = georgiaMode ? ["transparent", "rgba(0,0,0,0.24)"] as const : ["transparent", "rgba(0,0,0,0.18)"] as const;

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            <Animated.View
                style={[tw`flex-1 justify-center px-5`, {paddingBottom: keyboardInset}]}
            >
                <Pressable style={tw`absolute inset-0 bg-black/72`} onPress={onClose}/>
                <View
                    style={[
                        tw`overflow-hidden rounded-[28px] p-1`,
                        {
                            backgroundColor: connectShellBackgroundColor,
                            shadowColor: "#000000",
                            shadowOffset: {width: 0, height: 16},
                            shadowOpacity: 0.36,
                            shadowRadius: 24,
                            elevation: 12,
                        },
                    ]}
                >
                    <BlurView
                        intensity={georgiaMode ? 38 : 30}
                        tint={riverMode ? "light" : "dark"}
                        style={[tw`overflow-hidden rounded-[24px] border`, {borderColor: stickyNoteBorderColor}]}
                    >
                        <View
                            pointerEvents="none"
                            style={[StyleSheet.absoluteFill, {backgroundColor: connectOverlayColor}]}
                        />
                        <LinearGradient
                            colors={connectTopGradient}
                            locations={[0, 0.5, 1]}
                            pointerEvents="none"
                            style={[tw`absolute left-0 right-0 top-0`, {height: georgiaMode ? "55%" : "45%"}]}
                        />
                        <LinearGradient
                            colors={connectBottomGradient}
                            pointerEvents="none"
                            style={[tw`absolute left-0 right-0 bottom-0`, {height: georgiaMode ? "35%" : "28%"}]}
                        />
                        {georgiaMode ? (
                            <View
                                pointerEvents="none"
                                style={[
                                    tw`absolute left-0 right-0 top-0 border-t`,
                                    {
                                        height: 1,
                                        borderTopColor: "rgba(255,255,255,0.55)",
                                        borderTopLeftRadius: 24,
                                        borderTopRightRadius: 24,
                                    },
                                ]}
                            />
                        ) : null}
                        <View style={tw`p-5`}>
                            <View style={tw`mb-4 flex-row items-start justify-between gap-4`}>
                                <View style={tw`flex-1`}>
                                    <Text
                                        style={[tw`text-xs uppercase tracking-[2px]`, {
                                            fontFamily: fonts.body,
                                            color: stickyNoteBodyColor,
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
                                        tw`h-10 w-10 items-center justify-center rounded-full`,
                                        {backgroundColor: stickyNoteControlColor},
                                        pressed && tw`opacity-70`,
                                    ]}
                                >
                                    <Text style={[tw`text-lg`, {fontFamily: fonts.heading, color: stickyNoteBodyColor}]}>x</Text>
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
                                placeholderTextColor={stickyNotePlaceholderColor}
                                style={[
                                    tw`min-h-[220px] rounded-3xl border px-4 py-4 text-lg`,
                                    {
                                        borderColor: stickyNoteInputBorderColor,
                                        backgroundColor: stickyNoteInputColor,
                                        color: stickyNoteBodyColor,
                                        fontFamily: fonts.body,
                                    },
                                ]}
                            />

                            <View style={tw`mt-4 flex-row gap-2`}>
                                <Button
                                    label="Clear"
                                    variant="outlineAccent"
                                    onPress={onClear}
                                    style={[tw`flex-1 px-2`, {borderColor: stickyNoteBorderColor}]}
                                    textStyle={[tw`text-[10px]`, {color: stickyNoteBodyColor}]}
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
                    </BlurView>
                </View>
            </Animated.View>
        </Modal>
    );
}
