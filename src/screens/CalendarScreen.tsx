import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Calendar, type DateData } from "react-native-calendars";
import tw from "../lib/tw";
import type { Task } from "../types";

interface CalendarScreenProps {
  tasks: Task[];
}

export function CalendarScreen({ tasks }: CalendarScreenProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  const markedDates = useMemo(() => {
    const map: Record<string, { marked?: boolean; selected?: boolean; selectedColor?: string }> = {};

    tasks.forEach((task) => {
      if (!task.dueDate) return;
      map[task.dueDate] = { ...(map[task.dueDate] ?? {}), marked: true };
    });

    map[selectedDate] = { ...(map[selectedDate] ?? {}), selected: true, selectedColor: "#111827" };
    return map;
  }, [selectedDate, tasks]);

  const selectedTasks = tasks.filter((task) => task.dueDate === selectedDate).sort((a, b) => a.order - b.order);

  return (
    <ScrollView style={tw`flex-1 bg-orange-100`} contentContainerStyle={tw`px-4 pt-2 pb-3`}>
      <Text style={tw`text-3xl font-black text-black`}>Calendar</Text>
      <Text style={tw`mt-1 text-sm text-slate-700`}>Tap a day to filter due tasks.</Text>

      <View style={tw`mt-3 overflow-hidden rounded-2xl border border-blue-200 bg-white p-1`}>
        <Calendar markedDates={markedDates} onDayPress={(day: DateData) => setSelectedDate(day.dateString)} />
      </View>

      <Text style={tw`mt-3 text-lg font-extrabold text-zinc-900`}>{selectedDate}</Text>
      {selectedTasks.length === 0 ? (
        <View style={tw`mt-2 rounded-2xl border border-blue-200 bg-white p-3`}>
          <Text style={tw`text-slate-600`}>No tasks due this day.</Text>
        </View>
      ) : (
        selectedTasks.map((task) => (
          <View key={task.id} style={tw`mt-2 rounded-2xl border border-blue-200 bg-white p-3`}>
            <Text style={tw`text-base font-bold text-zinc-900`}>{task.title}</Text>
            {!!task.description && <Text style={tw`mt-1 text-sm text-slate-700`}>{task.description}</Text>}
            <Text style={tw`mt-2 text-xs font-bold uppercase text-slate-500`}>
              {task.status.replace("_", " ")} • {task.priority}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}
