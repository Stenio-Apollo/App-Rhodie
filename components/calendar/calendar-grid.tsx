// components/calendar/calendar-grid.tsx
"use client"  //

import {Task} from "@/types/task"
import {eachDayOfInterval, endOfMonth, format, startOfMonth} from "date-fns"

export default function CalendarGrid({tasks}: { tasks: Task[] }) {
    const today = new Date()

    const days = eachDayOfInterval({
        start: startOfMonth(today),
        end: endOfMonth(today),
    })

    return (
        <div className="grid grid-cols-7 gap-2">
            {days.map(day => (
                <div key={day.toISOString()} className="border rounded-md min-h-[120px] p-2 flex flex-col">
                    <p className="text-xs font-semibold">{format(day, "d")}</p>

                    <div className="space-y-1 mt-1 flex-1 overflow-y-auto">
                        {tasks
                            .filter(t => t.due_date && t.due_date.startsWith(format(day, "yyyy-MM-dd")))
                            .map(task => (
                                <div key={task.id} className="text-xs rounded bg-muted px-1 py-0.5">
                                    {task.title}
                                </div>
                            ))}
                    </div>
                </div>
            ))}
        </div>
    )
}
