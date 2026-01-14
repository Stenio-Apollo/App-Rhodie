"use client";

import * as React from "react";
import {Loader2, Trash2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {deleteTask} from "@/lib/queries/task";

type Props = {
    taskId: string;
    onDeleted?: () => void; // lets parent refresh/remove item from UI
};

export function DeleteTaskButton({taskId, onDeleted}: Props) {
    const [loading, setLoading] = React.useState(false);

    async function handleDelete() {
        try {
            setLoading(true);
            await deleteTask(taskId);
            onDeleted?.();
        } catch (err) {
            console.error("Delete task failed:", err);
            // optionally show toast here
        } finally {
            setLoading(false);
        }
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4"/>
                    Delete
                </Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete this task?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action can’t be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        Confirm delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
