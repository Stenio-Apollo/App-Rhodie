"use client";

import * as React from "react";
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
import {Button} from "@/components/ui/button";

type Props = {
    taskId: string;
    onDelete: () => Promise<void> | void;
};

export function DeleteTaskButton({taskId, onDelete}: Props) {
    const [loading, setLoading] = React.useState(false);

    async function handleDelete() {
        try {
            setLoading(true);
            await onDelete();
        } catch (err) {
            console.error("Delete task failed:", err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    size="sm"
                    variant="destructive"
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    Delete
                </Button>
            </AlertDialogTrigger>

            <AlertDialogContent onPointerDown={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete task?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction disabled={loading} onClick={handleDelete}>
                        {loading ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
