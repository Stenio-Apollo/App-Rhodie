"use client";

import {useEffect, useState} from "react";
import {useUser} from "@clerk/nextjs";
import {useSupabase} from "@/lib/supabase/SupabaseProvider";
import CalendarGrid from "@/components/calendar/calendar-grid";
import Navbar3 from "@/components/nav3";

type Task = {
    id: string;
    title: string;
    due_date: string;
};

export default function CalendarPage() {
    const {supabase} = useSupabase();
    const {user} = useUser();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch tasks for logged-in user
    useEffect(() => {
        if (!supabase || !user) return;

        const fetchTasks = async () => {
            setLoading(true);
            try {
                const {data, error} = await supabase
                    .from("tasks")
                    .select("*")
                    .eq("user_id", user.id)
                    .not("due_date", "is", null);

                if (error) {
                    console.error("Supabase fetch error:", error);
                    setTasks([]);
                } else {
                    setTasks(data);
                }
            } catch (err) {
                console.error("Error loading tasks:", err);
                setTasks([]);
            } finally {
                setLoading(false);
            }
        };

        fetchTasks();
    }, [supabase, user]);

    const handleTaskAdded = (task: Task) => {
        setTasks((prev) => [...prev, task]);
    };

    if (!user) return <div>Please log in to see your calendar</div>;
    if (loading) return <div>Loading tasks...</div>;

    return (
        <div className={"min-h-screen bg-gradient-to-r from-orange-100 via-orange-50 to-orange-100"}>
            <Navbar3/>

            <div className="p-6">
                <h1 className="text-2xl font-bold mb-4">My Calendar</h1>
                <CalendarGrid tasks={tasks} user={user} onTaskAdded={handleTaskAdded}/>
            </div>
        </div>
    );
}
