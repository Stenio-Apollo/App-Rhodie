import {Modal, Pressable, Text, View} from "react-native";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";
import {haptics} from "../lib/haptics";
import type {WeeklyGoal} from "../state/useWeeklyGoal";

interface GoalFeedbackModalProps {
    visible: boolean;
    message: string;
    goal: WeeklyGoal | null;
    onContinue: () => void;
}

export function GoalFeedbackModal({visible, message, goal, onContinue}: GoalFeedbackModalProps) {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onContinue}>
            <View style={tw`flex-1 items-center justify-center bg-black/72 px-5`}>
                <View style={tw`w-full rounded-[28px] border border-[#B55941] bg-[#0f0f0f] p-5`}>
                    <Text style={[tw`text-center text-xl text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                        {message}
                    </Text>
                    {goal ? (
                        <View style={tw`mt-4 rounded-2xl border border-[#2c2c2c] bg-black/42 px-3 py-3`}>
                            <Text style={[tw`text-center text-base text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                                {goal.text}
                            </Text>
                        </View>
                    ) : null}
                    <View style={tw`mt-5`}>
                        <Pressable
                            onPress={() => {
                                haptics.selection();
                                onContinue();
                            }}
                            style={({pressed}) => [
                                tw`rounded-xl px-3 py-3`,
                                {backgroundColor: "#B55941"},
                                pressed && tw`opacity-80`,
                            ]}
                        >
                            <Text style={[tw`text-center text-sm text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                                Continue
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
