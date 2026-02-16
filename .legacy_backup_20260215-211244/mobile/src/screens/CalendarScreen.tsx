import {useCallback, useEffect, useMemo, useState} from "react";
import {RefreshControl, ScrollView, Text, View} from "react-native";
import {Calendar} from "react-native-calendars";
import {createApi} from "../lib/api";
import type {Task} from "../types";

interface CalendarScreenProps {
    getToken: () => Promise<string | null>;
    onDueTasksLoaded?: (tasks: Task[]) => Promise<void> | void;
}

export function CalendarScreen({getToken, onDueTasksLoaded}: CalendarScreenProps) {
    const api = useMemo(() => createApi(getToken), [getToken]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
    const [refreshing, setRefreshing] = useState(false);

    const loadTasks = useCallback(async () => {
        setRefreshing(true);
        try {
            const dueTasks = await api.getDueTasks();
            setTasks(dueTasks);
            await onDueTasksLoaded?.(dueTasks);
        } finally {
            setRefreshing(false);
        }
    }, [api, onDueTasksLoaded]);

    useEffect(() => {
        void loadTasks();
    }, [loadTasks]);

    const markedDates = useMemo(() => {
        const base: Record<string, { marked?: boolean; selected?: boolean; selectedColor?: string }> = {};
        for (const task of tasks) {
            if (!task.due_date) continue;
            base[task.due_date] = {...(base[task.due_date] ?? {}), marked: true};
        }
        base[selectedDate] = {...(base[selectedDate] ?? {}), selected: true, selectedColor: "#0ea5e9"};
        return base;
    }, [selectedDate, tasks]);

    const selectedTasks = tasks.filter((task) => task.due_date === selectedDate);

    return (
        <ScrollView
            style={{flex: 1, backgroundColor: "#f1f5f9"}}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadTasks()}/>}
            contentContainerStyle={{padding: 16}}
        >
            <Text style={{fontSize: 24, fontWeight: "800", color: "#0f172a", marginBottom: 12}}>Calendar</Text>

            <View style={{borderRadius: 16, overflow: "hidden", backgroundColor: "white", paddingBottom: 8}}>
                <Calendar markedDates={markedDates}
                          onDayPress={(day: { dateString: string }) => setSelectedDate(day.dateString)}/>
            </View>

            <Text style={{marginTop: 16, fontSize: 18, fontWeight: "700", color: "#0f172a"}}>{selectedDate}</Text>
            {selectedTasks.length === 0 ? (
                <View style={{marginTop: 10, borderRadius: 14, backgroundColor: "white", padding: 14}}>
                    <Text style={{color: "#64748b"}}>No tasks due on this date.</Text>
                </View>
            ) : (
                selectedTasks.map((task) => (
                    <View key={task.id}
                          style={{marginTop: 10, borderRadius: 14, backgroundColor: "white", padding: 14}}>
                        <Text style={{fontWeight: "700", color: "#0f172a"}}>{task.title}</Text>
                        <Text style={{color: "#64748b", marginTop: 5}}>{task.description || "No description"}</Text>
                    </View>
                ))
            )}
        </ScrollView>
    );
}
