"use client";

import {useState} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,} from "@/components/ui/dialog";
import {useSupabase} from "@/lib/supabase/SupabaseProvider";

// Minimal user shape to avoid importing server-only Clerk types in a client component
type MinimalUser = { id: string };

type Task = {
    id: string;
    title: string;
    due_date: string;
};

type Props = {
    tasks: Task[];
    user: MinimalUser | null;
    onTaskAdded: (task: Task) => void;
};

export default function CalendarGrid({tasks, user, onTaskAdded}: Props) {
    const {supabase} = useSupabase();
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const startDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const days: Date[] = [];
    for (let d = new Date(startDay); d <= endDay; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d));
    }

    const tasksByDate = (date: Date) =>
        tasks.filter(
            (t) => t.due_date.slice(0, 10) === date.toISOString().slice(0, 10)
        );

    const prevMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    const nextMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

    const handleAddTask = async () => {
        if (!newTaskTitle || !selectedDate) return;
        if (!supabase || !user) return;

        try {
            const {data, error} = await supabase
                .from("tasks")
                .insert([
                    {
                        title: newTaskTitle,
                        due_date: selectedDate,
                        user_id: user.id,
                    },
                ])
                .select()
                .single();

            if (error) {
                console.error("Error creating task:", error.message || error);
                return;
            }

            onTaskAdded(data);
            setNewTaskTitle("");
            setIsModalOpen(false);
        } catch (err) {
            console.error("Unexpected error creating task:", err);
        }
    };

    const today = new Date();

    return (
        <>
            {/* Month navigation */}
            <div className="flex justify-between items-center mb-2">
                <Button onClick={prevMonth}>Prev</Button>
                <h2 className="font-bold text-lg">
                    {currentMonth.toLocaleString("default", {month: "long", year: "numeric"})}
                </h2>
                <Button onClick={nextMonth}>Next</Button>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                    <div key={d} className="text-center font-bold text-sm">{d}</div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
                {days.map((day) => {
                    const dayTasks = tasksByDate(day);
                    const isToday = day.toDateString() === today.toDateString();
                    const isSelected = selectedDate === day.toISOString().slice(0, 10);

                    return (
                        <div
                            key={day.toISOString()}
                            className={`p-2 border rounded cursor-pointer h-32 flex flex-col ${
                                isSelected ? "bg-blue-100" : isToday ? "bg-yellow-100" : "bg-white"
                            }`}
                            onClick={() => {
                                setSelectedDate(day.toISOString().slice(0, 10));
                                setIsModalOpen(true);
                            }}
                        >
                            <div className="font-bold text-sm">{day.getDate()}</div>
                            <div className="flex-1 overflow-y-auto mt-1 space-y-1">
                                {dayTasks.map((t) => (
                                    <div
                                        key={t.id}
                                        className="text-xs text-white bg-blue-500 rounded px-1 truncate"
                                    >
                                        {t.title}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal for adding a task */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Task for {selectedDate}</DialogTitle>
                    </DialogHeader>
                    <Input
                        placeholder="Task title"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        className="mb-4"
                    />
                    <DialogFooter className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddTask}>Add Task</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
