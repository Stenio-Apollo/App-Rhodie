import {Modal, Pressable, Text, View} from "react-native";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";
import type {WeeklyGoal} from "../state/useWeeklyGoal";
import type {VisualMode} from "../state/useVisualMode";
import {GuideCard, guideCardTextPalette} from "./GuideCard";
import {ScreenVisualModeContext} from "./ScreenBackground";

interface GoalCheckModalProps {
    visible: boolean;
    goal: WeeklyGoal | null;
    onSelect: (achieved: boolean) => void;
    onRequestClose: () => void;
    visualMode: VisualMode;
}

export function GoalCheckModal({visible, goal, onSelect, onRequestClose, visualMode}: GoalCheckModalProps) {
    const palette = guideCardTextPalette(visualMode);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onRequestClose}
            statusBarTranslucent
        >
            <ScreenVisualModeContext.Provider value={visualMode}>
                <Pressable
                    onPress={onRequestClose}
                    style={tw`flex-1 items-center justify-center bg-black/72 px-5`}
                >
                    <Pressable onPress={() => undefined} style={tw`w-full`}>
                        <GuideCard
                            eyebrow="Weekly goal"
                            title="Weekly goal check-in"
                            body="Have you achieved this week's goal?"
                            visualMode={visualMode}
                            active={visible}
                            actions={[
                                {id: "no", label: "Not yet", tone: "cancel"},
                                {id: "yes", label: "Yes", tone: "primary"},
                            ]}
                            onAction={(id) => onSelect(id === "yes")}
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
