import {useState} from "react";
import {Pressable, SafeAreaView, Text, View, Platform} from "react-native";
import {StatusBar} from "expo-status-bar";
import {Asset} from "expo-asset";
import {SvgUri} from "react-native-svg";
import {CalendarScreen} from "./src/screens/CalendarScreen";
import {KanbanScreen} from "./src/screens/KanbanScreen";
import {JournalScreen} from "./src/screens/JournalScreen";
import {TodayScreen} from "./src/screens/TodayScreen";
import {AuthScreen} from "./src/screens/AuthScreen";
import tw from "./src/lib/tw";
import {useTasks} from "./src/state/useTasks";
import {GradientBackground} from "./src/components/GradientBackground";
import {fonts, useAppFonts} from "./src/theme/fonts";
import {useSupabaseAuth} from "./src/state/useSupabaseAuth";
import {useProfile} from "./src/state/useProfile";
import {isToday} from "./src/lib/date-utils";
import {useEffect} from "react";
import {registerForPushNotificationsAsync} from "./src/lib/notifications";
import {supabase} from "./src/lib/supabase";

type Tab = "today" | "journal" | "board" | "calendar";

export default function App() {
    const [tab, setTab] = useState<Tab>("today");
    const {session, loading: authLoading, signOut} = useSupabaseAuth();
    const {profile} = useProfile(session);
    const tasksState = useTasks(session);
    const [fontsLoaded] = useAppFonts();

    useEffect(() => {
        if (!session) return;
        let cancelled = false;
        (async () => {
            const token = await registerForPushNotificationsAsync();
            if (!token || cancelled) return;
            await supabase.from("push_tokens").upsert({
                user_id: session.user.id,
                token,
                platform: Platform.OS,
            });
        })();
        return () => {
            cancelled = true;
        };
    }, [session]);

    if (!fontsLoaded || authLoading) return null;

    if (!session) {
        return (
            <GradientBackground>
                <StatusBar style="light"/>
                <AuthScreen/>
            </GradientBackground>
        );
    }

    return (
        <GradientBackground>
            <SafeAreaView style={tw`bg-black flex-1`}>
                <StatusBar style="light"/>

                <View
                    style={tw`flex-row items-center justify-between px-4 py-3`}>
                    <View style={tw`flex-row items-center gap-3`}>
                        <Text style={[tw`text-xl text-white rounded-lg border border-white px-2 py-1`, {
                            fontFamily: fonts.heading,
                            letterSpacing: 0.5
                        }]}>rh.</Text>
                        <View>
                            <Text style={[tw`text-sm text-white`, {fontFamily: fonts.heading}]}>
                                {profile?.full_name ? `Welcome, ${profile.full_name}` : "Welcome back"}
                            </Text>
                            {profile?.birthday && isToday(profile.birthday) ? (
                                <Text style={[tw`text-xs text-orange-200`, {fontFamily: fonts.body}]}>Happy birthday! 🎉</Text>
                            ) : null}
                        </View>
                    </View>
                    <Pressable onPress={signOut} style={({pressed}) => [tw`px-3 py-1 rounded-xl border border-white/30`, pressed && tw`bg-white/10`]}>
                        <Text style={[tw`text-xs text-white`, {fontFamily: fonts.body}]}>Sign out</Text>
                    </Pressable>
                </View>

                <View style={tw`flex-1 bg-[#0f0f0f] rounded-t-3xl overflow-hidden`}>
                    {tab === "today" && <TodayScreen tasks={tasksState.tasks} session={session}/>}
                    {tab === "journal" && <JournalScreen session={session}/>}
                    {tab === "board" && <KanbanScreen tasksState={tasksState} session={session}/>}
                    {tab === "calendar" && <CalendarScreen tasks={tasksState.tasks} session={session}/>}
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
