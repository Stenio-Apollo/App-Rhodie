// app/calendar/page.tsx
import {auth} from "@clerk/nextjs/server"
import {getTasks} from "@/lib/queries/task"
import CalendarGrid from "@/components/calendar/calendar-grid"

export default async function CalendarPage() {
    const {userId} = await auth() as { userId: string | null } // ✅ server-side

    if (!userId) return <div>Please log in to see your calendar</div>

    const tasks = await getTasks(userId)

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Calendar</h1>
            <CalendarGrid tasks={tasks}/>
        </div>
    )
}
