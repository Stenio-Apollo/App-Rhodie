import {Modal, Pressable, Text, View} from "react-native";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";
import {haptics} from "../lib/haptics";
import type {WeeklyGoal} from "../state/useWeeklyGoal";

interface GoalCheckModalProps {
    visible: boolean;
    goal: WeeklyGoal | null;
    onSelect: (achieved: boolean) => void;
    onRequestClose: () => void;
}

export function GoalCheckModal({visible, goal, onSelect, onRequestClose}: GoalCheckModalProps) {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
            <View style={tw`flex-1 items-center justify-center bg-black/72 px-5`}>
                <View style={tw`w-full rounded-[28px] border border-[#B55941] bg-[#0f0f0f] p-5`}>
                    <Text style={[tw`text-center text-xl text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                        Weekly goal check-in
                    </Text>
                    <Text style={[tw`mt-3 text-center text-sm leading-5 text-slate-300`, {fontFamily: fonts.body}]}>
                        Have you achieved this week's goal?
                    </Text>
                    {goal ? (
                        <View style={tw`mt-4 rounded-2xl border border-[#2c2c2c] bg-black/42 px-3 py-3`}>
                            <Text style={[tw`text-center text-base text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                                {goal.text}
                            </Text>
                        </View>
                    ) : null}
                    <View style={tw`mt-5 flex-row gap-3`}>
                        <Pressable
                            onPress={() => {
                                haptics.selection();
                                onSelect(false);
                            }}
                            style={({pressed}) => [
                                tw`flex-1 rounded-xl border border-[#2c2c2c] px-3 py-3`,
                                {backgroundColor: "rgba(0,0,0,0.35)"},
                                pressed && tw`opacity-80`,
                            ]}
                        >
                            <Text style={[tw`text-center text-sm text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                                Not yet
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={() => onSelect(true)}
                            style={({pressed}) => [
                                tw`flex-1 rounded-xl px-3 py-3`,
                                {backgroundColor: "#B55941"},
                                pressed && tw`opacity-80`,
                            ]}
                        >
                            <Text style={[tw`text-center text-sm text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                                Yes
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
