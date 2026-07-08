import {Modal, Pressable, Text, View} from "react-native";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";
import type {WeeklyGoal} from "../state/useWeeklyGoal";
import type {VisualMode} from "../state/useVisualMode";
import {GuideCard, guideCardTextPalette} from "./GuideCard";
import {ScreenVisualModeContext} from "./ScreenBackground";

interface GoalFeedbackModalProps {
    visible: boolean;
    message: string;
    goal: WeeklyGoal | null;
    onContinue: () => void;
    visualMode: VisualMode;
}

export function GoalFeedbackModal({visible, message, goal, onContinue, visualMode}: GoalFeedbackModalProps) {
    const palette = guideCardTextPalette(visualMode);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onContinue}
            statusBarTranslucent
        >
            <ScreenVisualModeContext.Provider value={visualMode}>
                <Pressable
                    onPress={onContinue}
                    style={tw`flex-1 items-center justify-center bg-black/72 px-5`}
                >
                    <Pressable onPress={() => undefined} style={tw`w-full`}>
                        <GuideCard
                            eyebrow="Weekly goal"
                            title={message}
                            visualMode={visualMode}
                            active={visible}
                            actions={[{id: "continue", label: "Continue", tone: "primary"}]}
                            onAction={onContinue}
                        >
                            {goal ? (
                                <View style={[
                                    tw`rounded-2xl border px-3 py-3`,
                                    {
                                        borderColor: visualMode === "river" ? "rgba(17,17,17,0.16)" : "rgba(255,255,255,0.18)",
                                        backgroundColor: visualMode === "river" ? "rgba(17,17,17,0.06)" : "rgba(255,255,255,0.08)",
                                    },
                                ]}>
                                    <Text style={[tw`text-center text-base`, {fontFamily: fonts.heading, color: palette.heading}]}>
                                        {goal.text}
                                    </Text>
                                </View>
                            ) : null}
                        </GuideCard>
                    </Pressable>
                </Pressable>
            </ScreenVisualModeContext.Provider>
        </Modal>
    );
}
