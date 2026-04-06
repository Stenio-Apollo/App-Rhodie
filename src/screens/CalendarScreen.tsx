import {useMemo, useState} from "react";
import {ImageBackground, ScrollView, Text, View} from "react-native";
import {Calendar, type DateData} from "react-native-calendars";
import tw from "../lib/tw";
import type {Task} from "../types";
import {fonts} from "../theme/fonts";

interface CalendarScreenProps {
    tasks: Task[];
}

export function CalendarScreen({tasks}: CalendarScreenProps) {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
    const bg = require("../../public/images/rh5.jpg");

    const markedDates = useMemo(() => {
        const map: Record<string, { marked?: boolean; selected?: boolean; selectedColor?: string }> = {};

        tasks.forEach((task) => {
            if (!task.dueDate) return;
            map[task.dueDate] = {...(map[task.dueDate] ?? {}), marked: true};
        });

        map[selectedDate] = {...(map[selectedDate] ?? {}), selected: true, selectedColor: "#111827"};
        return map;
    }, [selectedDate, tasks]);

    const selectedTasks = tasks.filter((task) => task.dueDate === selectedDate).sort((a, b) => a.order - b.order);

    return (
        <ImageBackground source={bg} style={tw`flex-1`} imageStyle={tw`opacity-55`}>
            <View style={tw`flex-1 bg-[#0a0a0a]/9`}>
                <ScrollView style={tw`flex-1`} contentContainerStyle={tw`px-4 pt-2 pb-3`}>
                    <Text style={[tw`self-center text-center text-2xl font-black text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>Calendar</Text>
                    <Text style={[tw`self-center text-center mt-1 text-sm text-slate-300`, {fontFamily: fonts.body}]}>Tap a day to filter due
                        tasks.</Text>

                    <View style={tw`mt-3 overflow-hidden rounded-2xl border border-[#2c2c2c] bg-[#111111] p-1`}>
                        <Calendar markedDates={markedDates}
                                  onDayPress={(day: DateData) => setSelectedDate(day.dateString)}/>
                    </View>

                    <Text style={[tw`mt-3 text-lg font-extrabold text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>{selectedDate}</Text>
                    {selectedTasks.length === 0 ? (
                        <View style={tw`mt-2 rounded-2xl border border-[#2c2c2c] bg-[#111111] p-3`}>
                            <Text style={[tw`text-slate-300`, {fontFamily: fonts.body}]}>No tasks due this day.</Text>
                        </View>
                    ) : (
                        selectedTasks.map((task) => (
                            <View key={task.id} style={tw`mt-2 rounded-2xl border border-[#2c2c2c] bg-[#111111] p-3`}>
                                <Text
                                    style={[tw`self-center text-center text-base font-bold text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>{task.title}</Text>
                                {!!task.description &&
                                    <Text
                                        style={[tw`self-center text-center mt-1 text-sm text-slate-300`, {fontFamily: fonts.body}]}>{task.description}</Text>}
                                <Text
                                    style={[tw`self-center text-center mt-2 text-xs font-bold uppercase text-slate-400`, {fontFamily: fonts.body}]}>
                                    {task.status.replace("_", " ")} • {task.priority}
                                </Text>
                            </View>
                        ))
                    )}
                </ScrollView>
            </View>
        </ImageBackground>
    );
}
