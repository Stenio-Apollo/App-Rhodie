"use client"

import Navbar from "@/components/navbar";
import {useBoard} from "@/lib/hooks/useBoards";
import {useParams} from "next/navigation";
import {useState} from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";

export default function BoardPage() {
    const {id} = useParams<{ id: string }>();
    const {board} = useBoard(id);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newColor, setNewColor] = useState("");
    return (
        <div className="min-h-screen bg-gradient-to-b from-black via-gray-800 to-black">
            <Navbar
                boardTitle={board?.title}
                onEditBoard={() => {
                    setNewTitle(board?.title ?? "");
                    setNewColor(board?.color ?? "");
                    setIsEditingTitle(true);

                }}/>
            <Dialog open={isEditingTitle} onOpenChange={setIsEditingTitle}>
                <DialogContent className={"w-[95vw] max-w-[425px] mx-auto"}>
                    <DialogHeader>
                        <DialogTitle>
                            Edit Board
                        </DialogTitle>
                        <form>
                            <div>
                                <Label htmlFor={"boardTitle"}>Board Title</Label>
                                <Input
                                    id="boardTitle"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder={"Enter your board title..."}
                                    required/>


                            </div>
                        </form>

                    </DialogHeader>

                </DialogContent>
            </Dialog>
        </div>
    );
}