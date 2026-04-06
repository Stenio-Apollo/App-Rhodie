import {useMemo, useState} from "react";
import {ImageBackground, Pressable, ScrollView, Text, TextInput, View} from "react-native";
import tw from "../lib/tw";
import {getDailyStoicQuote} from "../lib/quotes";
import {useJournal} from "../state/useJournal";
import {Button} from "../components/ui/Button";
import {fonts} from "../theme/fonts";

function isoToday(): string {
    return new Date().toISOString().slice(0, 10);
}

function shiftDate(date: string, delta: number): string {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + delta);
    return d.toISOString().slice(0, 10);
}

export function JournalScreen() {
    const {entries, byDate, addEntry, deleteEntry, editEntry} = useJournal();
    const [selectedDate, setSelectedDate] = useState<string>(isoToday());
    const [text, setText] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState("");
    const bg = require("../../public/images/rh6.jpg");

    const todaysQuote = useMemo(() => getDailyStoicQuote(selectedDate), [selectedDate]);
    const todaysEntries = byDate[selectedDate] ?? [];

    return (
        <ImageBackground source={bg} style={tw`flex-1`} imageStyle={tw`opacity-49`}>
            <View style={tw`flex-1 bg-black/7`}>
                <ScrollView style={tw`flex-1`} contentContainerStyle={tw`px-4 pt-3 pb-6`}>
                    <View
                        style={tw`rounded-3xl bg-black/23 p-4 border border-orange-50/9 flex-row gap-4 items-center`}>
                        <View style={tw`flex-1`}>
                            <Text
                                style={[tw`self-center text-center px-4 py-1 text-lg font-semibold text-white`, {fontFamily: fonts.heading}]}>
                                QUOTE OF THE DAY
                            </Text>
                            <Text
                                style={[tw`self-center text-center text-xs font-semibold text-white/70`, {fontFamily: fonts.body}]}>{selectedDate}</Text>

                            <Text
                                style={[tw`self-center text-center mt-9 mb-3 text-lg text-white leading-tight`, {fontFamily: fonts.body}]}
                                numberOfLines={3}>{todaysQuote}</Text>
                        </View>
                    </View>

                    <View style={tw`mt-4 flex-row items-center justify-between`}>
                        <Pressable
                            onPress={() => setSelectedDate(shiftDate(selectedDate, -1))}
                            style={({pressed}) => [
                                tw`rounded-xl px-4 py-2 border`,
                                {
                                    borderColor: "#B56941",
                                    backgroundColor: pressed ? "rgba(181,105,65,0.15)" : "transparent",
                                },
                            ]}
                        >
                            <Text style={[tw`text-sm text-white font-bold`, {fontFamily: fonts.heading}]}>Prev</Text>
                        </Pressable>

                        <Text
                            style={[tw`text-base font-bold text-[#E4E0D4]`, {fontFamily: fonts.body}]}>{selectedDate}</Text>

                        <Pressable
                            onPress={() => setSelectedDate(shiftDate(selectedDate, 1))}
                            style={({pressed}) => [
                                tw`rounded-xl px-4 py-2 border`,
                                {
                                    borderColor: "#B56941",
                                    backgroundColor: pressed ? "rgba(181,105,65,0.15)" : "transparent",
                                },
                            ]}
                        >
                            <Text style={[tw`text-sm text-white font-bold`, {fontFamily: fonts.heading}]}>Next</Text>
                        </Pressable>
                    </View>

                    <View style={tw`mt-4 rounded-2xl border border-orange-50/9 bg-black/33 p-3`}>
                        <Text style={[tw`text-sm font-semibold text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>Gratitude
                            for Today</Text>
                        <TextInput
                            value={text}
                            onChangeText={setText}
                            placeholder="Write what you're grateful for..."
                            placeholderTextColor="#6b7280"
                            multiline
                            style={[tw`mt-2 min-h-[100px] rounded-xl border border-slate-50/11 bg-black/13 px-3 py-2 text-[#E4E0D4]`, {fontFamily: fonts.body}]}
                        />
                        <View style={tw`mt-3 flex-row justify-end`}>
                            <Button
                                label="Add Entry"
                                variant="primary"
                                onPress={() => {
                                    if (text.trim()) {
                                        addEntry(text, selectedDate);
                                        setText("");
                                    }
                                }}
                            />
                        </View>
                    </View>

                    <View style={tw`mt-4 gap-2`}>
                        {todaysEntries.length === 0 ? (
                            <Text style={[tw`text-sm text-slate-300`, {fontFamily: fonts.body}]}>No entries yet for this
                                date.</Text>
                        ) : (
                            todaysEntries.map((entry) => {
                                const isEditing = editingId === entry.id;
                                return (
                                    <View key={entry.id}
                                          style={tw`rounded-2xl bg-black/23 backdrop-blur-md border border-orange-50/9 p-3`}>
                                        {isEditing ? (
                                            <TextInput
                                                value={editingText}
                                                onChangeText={setEditingText}
                                                multiline
                                                style={[tw`mt-1 rounded-xl border border-slate-50/11 bg-black/13 px-3 py-2 text-[#E4E0D4]`, {fontFamily: fonts.body}]}
                                            />
                                        ) : (
                                            <Text
                                                style={[tw`text-sm text-[#E4E0D4]`, {fontFamily: fonts.body}]}>{entry.text}</Text>
                                        )}
                                        <View style={tw`mt-2 flex-row items-center justify-between`}>
                                            <Text
                                                style={[tw`text-[11px] font-semibold text-slate-400`, {fontFamily: fonts.body}]}>Added {new Date(entry.createdAt).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit"
                                            })}</Text>
                                            {isEditing ? (
                                                <View style={tw`flex-row gap-2`}>
                                                    <Button label="Cancel" variant="secondary"
                                                            onPress={() => {
                                                                setEditingId(null);
                                                                setEditingText("");
                                                            }}/>
                                                    <Button label="Save" variant="primary"
                                                            onPress={() => {
                                                                if (!editingId) return;
                                                                editEntry(editingId, editingText);
                                                                setEditingId(null);
                                                                setEditingText("");
                                                            }}/>
                                                </View>
                                            ) : (
                                                <View style={tw`flex-row gap-2`}>
                                                    <Button label="Edit" variant="secondary"
                                                            onPress={() => {
                                                                setEditingId(entry.id);
                                                                setEditingText(entry.text);
                                                            }}/>
                                                    <Button label="Delete" variant="secondary"
                                                            onPress={() => deleteEntry(entry.id)}/>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </View>

                    <View style={tw`mt-6 rounded-2xl border border-slate-800/49 bg-black/23 p-3`}>
                        <Text style={[tw`text-sm font-semibold text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>Recent
                            days</Text>
                        <View style={tw`mt-2 flex-row flex-wrap gap-2`}>
                            {[...new Set(entries.map((e) => e.date))]
                                .sort((a, b) => (a > b ? -1 : 1))
                                .slice(0, 7)
                                .map((d) => (
                                    <Button key={d} label={d} variant={d === selectedDate ? "primary" : "secondary"}
                                            onPress={() => setSelectedDate(d)}/>
                                ))}
                        </View>
                    </View>
                </ScrollView>
            </View>
        </ImageBackground>
    );
}
