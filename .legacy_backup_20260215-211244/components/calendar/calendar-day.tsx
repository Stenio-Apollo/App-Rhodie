import {Task} from "@/types/task"
import {format} from "date-fns"

export function CalendarDay({
                                date,
                                tasks,
                            }: {
    date: Date
    tasks: Task[]
}) {
    return (
        <div className="border rounded-md p-2 min-h-[120px]">
            <p className="text-xs font-semibold">{format(date, "d")}</p>

            <div className="space-y-1 mt-1">
                {tasks.map(task => (
                    <div
                        key={task.id}
                        className="text-xs bg-muted rounded px-1 py-0.5"
                    >
                        {task.title}
                    </div>
                ))}
            </div>
        </div>
    )
}
