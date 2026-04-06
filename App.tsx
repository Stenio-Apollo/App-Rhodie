import {useState} from "react";
import {Pressable, SafeAreaView, Text, View} from "react-native";
import {StatusBar} from "expo-status-bar";
import {Asset} from "expo-asset";
import {SvgUri} from "react-native-svg";
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
            <SafeAreaView style={tw`bg-black flex-1`}>
                <StatusBar style="light"/>

                <View
                    style={tw`flex-row items-center justify-between px-4 py-3`}>
                    <Text style={[tw`text-xl text-white rounded-lg border border-white px-2 py-1`, {
                        fontFamily: fonts.heading,
                        letterSpacing: 0.5
                    }]}>rh.</Text>
                </View>

                <View style={tw`flex-1 bg-[#0f0f0f] rounded-t-3xl overflow-hidden`}>
                    {tab === "today" && <TodayScreen tasks={tasksState.tasks}/>}
                    {tab === "journal" && <JournalScreen/>}
                    {tab === "board" && <KanbanScreen tasksState={tasksState}/>}
                    {tab === "calendar" && <CalendarScreen tasks={tasksState.tasks}/>}
                </View>

                <View style={tw`px-4 py-3 bg-black`}>
                    <View style={tw`flex-row justify-between`}>
                        {([
                            {key: "today", label: "Home", icon: require("./public/images/home.svg")},
                            {key: "journal", label: "Journal", icon: require("./public/images/journal.svg")},
                            {key: "board", label: "Tasks", icon: require("./public/images/to-do-list.svg")},
                            {key: "calendar", label: "Calendar", icon: require("./public/images/calendar.svg")},
                        ] as const).map((item) => {
                            const active = tab === item.key;
                            const uri = Asset.fromModule(item.icon).uri;
                            const iconColor = active ? tw.color("orange-200") ?? "black" : tw.color("white") ?? "#cbd5e1";
                            const labelColor = active ? tw.color("orange-200") ?? "#fb923c" : "#E4E0D4";
                            return (
                                <Pressable
                                    key={item.key}
                                    onPress={() => setTab(item.key)}
                                    style={({pressed}) => [
                                        tw`px-3 py-1 rounded-xl  items-center`,
                                        active ? tw`border-orange-200 bg-slate-700/10` : tw`border-transparent`,
                                        pressed && tw`bg-white/5`,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            tw`text-[11px] font-bold mb-1`,
                                            {fontFamily: fonts.heading, color: labelColor},
                                        ]}
                                    >
                                        {item.label}
                                    </Text>
                                    <SvgUri width={24} height={24} uri={uri} fill={iconColor} stroke={iconColor}/>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            </SafeAreaView>
        </GradientBackground>
    );
}
