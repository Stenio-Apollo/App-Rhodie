import {Modal, Text, View} from "react-native";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";
import type {WeeklyGoal} from "../state/useWeeklyGoal";
import {Button} from "./ui/Button";
import type {VisualMode} from "../state/useVisualMode";

interface GoalFeedbackModalProps {
    visible: boolean;
    message: string;
    goal: WeeklyGoal | null;
    onContinue: () => void;
    visualMode: VisualMode;
}

export function GoalFeedbackModal({visible, message, goal, onContinue, visualMode}: GoalFeedbackModalProps) {
    const georgiaMode = visualMode === "georgia";
    const riverMode = visualMode === "river";
    const badgeColor = "#ba885a";
    const surfaceColor = georgiaMode ? "#111111" : riverMode ? "#FFFFFF" : "#000000";
    const primaryTextColor = riverMode ? "#111111" : "#FFFFFF";
    const borderColor = riverMode ? "rgba(17,17,17,0.16)" : "rgba(255,255,255,0.18)";
    const nestedSurfaceColor = riverMode ? "rgba(17,17,17,0.06)" : "rgba(255,255,255,0.08)";
    const buttonDepthStyle = {
        shadowColor: "#000000",
        shadowOffset: {width: 0, height: 5},
        shadowOpacity: 0.24,
        shadowRadius: 8,
        elevation: 6,
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onContinue}>
            <View style={tw`flex-1 items-center justify-center bg-black/72 px-5`}>
                <View style={[
                    tw`w-full rounded-[28px] border p-5`,
                    {borderColor: badgeColor, backgroundColor: surfaceColor},
                ]}>
                    <Text style={[tw`text-center text-xl`, {fontFamily: fonts.heading, color: primaryTextColor}]}>
                        {message}
                    </Text>
                    {goal ? (
                        <View style={[
                            tw`mt-4 rounded-2xl border px-3 py-3`,
                            {borderColor, backgroundColor: nestedSurfaceColor},
                        ]}>
                            <Text style={[tw`text-center text-base`, {fontFamily: fonts.heading, color: primaryTextColor}]}>
                                {goal.text}
                            </Text>
                        </View>
                    ) : null}
                    <View style={tw`mt-5`}>
                        <Button
                            label="Continue"
                            onPress={onContinue}
                            shine
                            style={[tw`rounded-xl px-3 py-3`, {backgroundColor: badgeColor}, buttonDepthStyle]}
                            textStyle={tw`text-sm text-white`}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
}
