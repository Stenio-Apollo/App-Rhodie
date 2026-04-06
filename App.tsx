import {useState} from "react";
import {Pressable, SafeAreaView, Text, View} from "react-native";
import {StatusBar} from "expo-status-bar";
import {CalendarScreen} from "./src/screens/CalendarScreen";
import {KanbanScreen} from "./src/screens/KanbanScreen";
import {JournalScreen} from "./src/screens/JournalScreen";
import {TodayScreen} from "./src/screens/TodayScreen";
import tw from "./src/lib/tw";
import {useTasks} from "./src/state/useTasks";
import {GradientBackground} from "./src/components/GradientBackground";
import {fonts, useAppFonts} from "./src/theme/fonts";

type Tab = "today" | "journal" | "board" | "calendar";

export default function App() {
    const [tab, setTab] = useState<Tab>("today");
    const tasksState = useTasks();
    const [fontsLoaded] = useAppFonts();

    if (!fontsLoaded) return null;

    return (
        <GradientBackground>
            <SafeAreaView style={tw`flex-1`}>
                <StatusBar style="light"/>

                <View
                    style={tw`flex-row items-center justify-between px-4 py-3`}>
                    <Text style={[tw`text-xl text-white rounded-lg border border-white px-2 py-1`, {
                        fontFamily: fonts.heading,
                        letterSpacing: 0.5
                    }]}>rh.</Text>
                    <View style={tw`flex-row gap-2`}>
                        {([
                            {key: "today", label: "Home"},
                            {key: "journal", label: "Journal"},
                            {key: "board", label: "Board"},
                            {key: "calendar", label: "Calendar"},
                        ] as const).map((item) => {
                            const active = tab === item.key;
                            return (
                                <Pressable
                                    key={item.key}
                                    onPress={() => setTab(item.key)}
                                    style={({pressed}) => [
                                        tw`px-3 py-2 rounded-xl border`,
                                        active ? tw`border-white bg-black/3` : tw`border-transparent`,
                                        pressed && tw`bg-white/5`,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            tw`text-sm font-bold`,
                                            {fontFamily: fonts.heading, color: active ? "white" : "#E4E0D4"},
                                        ]}
                                    >
                                        {item.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>

                <View style={tw`flex-1 bg-[#0f0f0f] rounded-t-3xl overflow-hidden border-t border-[#2c2c2c]`}>
                    {tab === "today" && <TodayScreen tasks={tasksState.tasks}/>}
                    {tab === "journal" && <JournalScreen/>}
                    {tab === "board" && <KanbanScreen tasksState={tasksState}/>}
                    {tab === "calendar" && <CalendarScreen tasks={tasksState.tasks}/>}
                </View>
            </SafeAreaView>
        </GradientBackground>
    );
}
