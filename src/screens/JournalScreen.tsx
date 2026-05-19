import {useMemo, useState} from "react";
import {ImageBackground, Pressable, ScrollView, Text, TextInput, View} from "react-native";
import tw from "../lib/tw";
import {getDailyStoicQuote} from "../lib/quotes";
import {getDailyJournalPrompt} from "../lib/prompts";
import {useJournal} from "../state/useJournal";
import {Button} from "../components/ui/Button";
import {fonts} from "../theme/fonts";
import type {Session} from "@supabase/supabase-js";
import {toLocalISODate} from "../lib/date-utils";

function isoToday(): string {
    return toLocalISODate();
}

export function JournalScreen({session}: { session: Session | null }) {
    const {entries, byDate, addEntry, deleteEntry, editEntry} = useJournal(session);
    const [selectedDate, setSelectedDate] = useState<string>(isoToday());
    const [text, setText] = useState("");
    const [promptText, setPromptText] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState("");
    const bg = require("../../public/images/rh201.jpg");

    const todaysQuote = useMemo(() => getDailyStoicQuote(selectedDate), [selectedDate]);
    const todaysPrompt = useMemo(() => getDailyJournalPrompt(selectedDate), [selectedDate]);
    const todaysEntries = byDate[selectedDate] ?? [];
    const gratitudeEntries = todaysEntries.filter((e) => e.category === "gratitude");
    const promptEntries = todaysEntries.filter((e) => e.category === "prompt");

    return (
        <ImageBackground source={bg} style={tw`flex-1`} imageStyle={tw`opacity-39`}>
            <View style={[tw`flex-1 bg-black/47`, {paddingHorizontal: 1}]}>
                <ScrollView style={tw`flex-1`} contentContainerStyle={tw`px-3 pt-3 pb-6`}>
                    <View
                        style={[
                            tw`rounded-3xl bg-black/63 p-4 border flex-row gap-4 items-center, border-[#B55941]/43`,
                            ,
                        ]}>
                        <View style={tw`flex-1`}>
                            <Text
                                style={[tw`self-center text-center px-4 py-1 text-lg font-semibold`, {
                                    fontFamily: fonts.heading,
                                    color: "#E4E0D4"
                                }]}>
                                QUOTE OF THE DAY
                            </Text>
                            <Text
                                style={[tw`self-center text-center text-xs font-semibold`, {
                                    fontFamily: fonts.body,
                                    color: "rgba(228,224,212,0.7)"
                                }]}>{selectedDate}</Text>

                            <Text
                                style={[tw`self-center text-center mt-9 mb-3 text-lg leading-tight`, {
                                    fontFamily: fonts.body,
                                    color: "#E4E0D4"
                                }]}
                                numberOfLines={3}>{todaysQuote}</Text>
                        </View>
                    </View>

                    <View style={tw`mt-3 rounded-3xl bg-black/63 border border-[#2c2c2c] p-3`}>
                        <Text style={[tw`text-sm font-semibold text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>Prompt of
                            the day</Text>
                        <Text style={[tw`mt-2 text-base leading-snug`, {fontFamily: fonts.body, color: "#E4E0D4"}]}
                              numberOfLines={4}>
                            {todaysPrompt}
                        </Text>
                        <TextInput
                            value={promptText}
                            onChangeText={setPromptText}
                            keyboardAppearance="dark"
                            placeholder="Respond to this prompt..."
                            placeholderTextColor="#6b7280"
                            multiline
                            style={[tw`mt-2 min-h-[90px] rounded-xl border border-[#2c2c2c] bg-black/39 px-3 py-2 text-[#E4E0D4]`, {fontFamily: fonts.body}]}
                        />
                        <View style={tw`mt-3 flex-row justify-end gap-2`}>
                            <Button
                                label="Add Response"
                                variant="primary"
                                onPress={() => {
                                    if (promptText.trim()) {
                                        addEntry(promptText, selectedDate, "prompt");
                                        setPromptText("");
                                    }
                                }}
                            />
                        </View>
                    </View>

                    <View style={tw`mt-4 rounded-2xl border border-[#2c2c2c] bg-black/63 p-3`}>
                        <Text style={[tw`text-sm font-semibold text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                            3 Good Things Today
                        </Text>
                        <Text style={[tw`mt-1 text-xs text-slate-400`, {fontFamily: fonts.body}]}>
                            What are three things you loved about today.
                        </Text>
                        {[0, 1, 2].map((idx) => (
                            <TextInput
                                key={idx}
                                value={text.split("\n")[idx] ?? ""}
                                onChangeText={(val) => {
                                    const parts = text.split("\n");
                                    parts[idx] = val;
                                    setText(parts.slice(0, 3).join("\n"));
                                }}
                                keyboardAppearance="dark"
                                placeholder="•"
                                placeholderTextColor="#6b7280"
                                style={[tw`mt-2 rounded-lg border border-slate-50/15 bg-black/39 px-3 py-2 text-[#E4E0D4]`, {fontFamily: fonts.body}]}
                            />
                        ))}
                        <View style={tw`mt-3 flex-row justify-end`}>
                            <Button
                                label="Add Gratitude"
                                variant="primary"
                                onPress={() => {
                                    const items = text
                                        .split("\n")
                                        .map((s) => s.trim())
                                        .filter(Boolean);
                                    if (items.length === 0) return;
                                    const bulletText = items.slice(0, 3).map((item) => `• ${item}`).join("\n");
                                    addEntry(bulletText, selectedDate, "gratitude");
                                    setText("");
                                }}
                            />
                        </View>
                    </View>

                    <View style={tw`mt-4 gap-2`}>
                        <Text style={[tw`text-sm font-semibold text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>Gratitude
                            entries</Text>
                        {gratitudeEntries.length === 0 ? (
                            <Text style={[tw`text-sm text-slate-300`, {fontFamily: fonts.body}]}>No gratitude entries
                                yet for this
                                date.</Text>
                        ) : (
                            gratitudeEntries.map((entry) => {
                                const isEditing = editingId === entry.id;
                                return (
                                    <View key={entry.id}
                                          style={tw`rounded-2xl bg-black/63 border border-[#2c2c2c] p-3`}>
                                        {isEditing ? (
                                            <TextInput
                                                value={editingText}
                                                onChangeText={setEditingText}
                                                keyboardAppearance="dark"
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

                    <View style={tw`mt-6 gap-2`}>
                        <Text style={[tw`text-sm font-semibold text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>Prompt
                            responses</Text>
                        {promptEntries.length === 0 ? (
                            <Text style={[tw`text-sm text-slate-300`, {fontFamily: fonts.body}]}>No prompt responses yet
                                for this
                                date.</Text>
                        ) : (
                            promptEntries.map((entry) => {
                                const isEditing = editingId === entry.id;
                                return (
                                    <View key={entry.id}
                                          style={tw`rounded-2xl bg-black/63 border border-orange-50/19 p-3`}>
                                        {isEditing ? (
                                            <TextInput
                                                value={editingText}
                                                onChangeText={setEditingText}
                                                keyboardAppearance="dark"
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

                    <View style={tw`mt-6 rounded-[28px] border border-[#B55941]/55 bg-black/48 p-4`}>
                        <Text style={[tw`text-sm`, {fontFamily: fonts.heading, color: "#E4E0D4"}]}>
                            Memory shelf
                        </Text>
                        <Text style={[tw`mt-1 text-xs`, {fontFamily: fonts.body, color: "rgba(228,224,212,0.68)"}]}>
                            Prompt responses and gratitude entries live here as individually dated keepsakes.
                        </Text>

                        {(promptEntries.length === 0 && gratitudeEntries.length === 0) ? (
                            <Text style={[tw`mt-3 text-sm text-slate-300`, {fontFamily: fonts.body}]}>
                                Nothing saved for this date yet.
                            </Text>
                        ) : (
                            <View style={tw`mt-4 gap-3`}>
                                {[...promptEntries, ...gratitudeEntries]
                                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                                    .map((entry) => {
                                        const isPrompt = entry.category === "prompt";

                                        return (
                                            <Pressable
                                                key={entry.id}
                                                onPress={() => setSelectedDate(entry.date)}
                                                style={({pressed}) => [
                                                    tw`rounded-[24px] border p-4`,
                                                    {
                                                        borderColor: entry.date === selectedDate ? "#B55941" : "rgba(228,224,212,0.12)",
                                                        backgroundColor: pressed ? "rgba(181,89,65,0.12)" : "rgba(10,10,10,0.4)",
                                                    },
                                                ]}
                                            >
                                                <View style={tw`flex-row items-center justify-between`}>
                                                    <Text style={[tw`text-sm`, {
                                                        fontFamily: fonts.heading,
                                                        color: "#F4E8D8"
                                                    }]}>
                                                        {entry.date}
                                                    </Text>
                                                    <View
                                                        style={[
                                                            tw`rounded-full px-3 py-1`,
                                                            {backgroundColor: isPrompt ? "rgba(181,89,65,0.18)" : "rgba(228,224,212,0.12)"}
                                                        ]}
                                                    >
                                                        <Text style={[tw`text-[10px]`, {
                                                            fontFamily: fonts.heading,
                                                            color: "#F4E8D8"
                                                        }]}>
                                                            {isPrompt ? "PROMPT" : "GRATITUDE"}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <Text style={[tw`mt-2 text-[11px]`, {
                                                    fontFamily: fonts.body,
                                                    color: "rgba(244,232,216,0.58)"
                                                }]}>
                                                    {new Date(entry.createdAt).toLocaleString([], {
                                                        month: "short",
                                                        day: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit"
                                                    })}
                                                </Text>
                                                <Text
                                                    style={[tw`mt-3 text-sm leading-5`, {
                                                        fontFamily: fonts.body,
                                                        color: "#E4E0D4"
                                                    }]}
                                                    numberOfLines={5}
                                                >
                                                    {entry.text}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                            </View>
                        )}
                    </View>

                    <View style={tw`mt-6 rounded-2xl border border-orange-50/19 bg-black/33 p-3`}>
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
