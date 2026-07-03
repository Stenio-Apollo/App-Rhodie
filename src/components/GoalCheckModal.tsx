import {Modal, Text, View} from "react-native";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";
import {haptics} from "../lib/haptics";
import type {WeeklyGoal} from "../state/useWeeklyGoal";
import {Button} from "./ui/Button";
import type {VisualMode} from "../state/useVisualMode";

interface GoalCheckModalProps {
    visible: boolean;
    goal: WeeklyGoal | null;
    onSelect: (achieved: boolean) => void;
    onRequestClose: () => void;
    visualMode: VisualMode;
}

export function GoalCheckModal({visible, goal, onSelect, onRequestClose, visualMode}: GoalCheckModalProps) {
    const georgiaMode = visualMode === "georgia";
    const riverMode = visualMode === "river";
    const badgeColor = "#ba885a";
    const surfaceColor = georgiaMode ? "#111111" : riverMode ? "#FFFFFF" : "#000000";
    const primaryTextColor = riverMode ? "#111111" : "#FFFFFF";
    const mutedTextColor = riverMode ? "rgba(17,17,17,0.66)" : "rgba(255,255,255,0.72)";
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
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
            <View style={tw`flex-1 items-center justify-center bg-black/72 px-5`}>
                <View style={[
                    tw`w-full rounded-[28px] border p-5`,
                    {borderColor: badgeColor, backgroundColor: surfaceColor},
                ]}>
                    <Text style={[tw`text-center text-xl`, {fontFamily: fonts.heading, color: primaryTextColor}]}>
                        Weekly goal check-in
                    </Text>
                    <Text style={[tw`mt-3 text-center text-sm leading-5`, {fontFamily: fonts.body, color: mutedTextColor}]}>
                        Have you achieved this week's goal?
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
                    <View style={tw`mt-5 flex-row gap-3`}>
                        <Button
                            label="Not yet"
                            onPress={() => {
                                haptics.selection();
                                onSelect(false);
                            }}
                            shine
                            hapticAction={false}
                            style={[
                                tw`flex-1 rounded-xl border px-3 py-3`,
                                {borderColor, backgroundColor: nestedSurfaceColor},
                                buttonDepthStyle,
                            ]}
                            textStyle={[tw`text-sm`, {color: primaryTextColor}]}
                        />
                        <Button
                            label="Yes"
                            onPress={() => onSelect(true)}
                            shine
                            style={[tw`flex-1 rounded-xl px-3 py-3`, {backgroundColor: badgeColor}, buttonDepthStyle]}
                            textStyle={tw`text-sm text-white`}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
}
