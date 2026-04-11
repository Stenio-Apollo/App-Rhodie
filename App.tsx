import {useEffect, useRef, useState} from "react";
import {Platform, Pressable, SafeAreaView, Text, View} from "react-native";
import {StatusBar} from "expo-status-bar";
import {Asset} from "expo-asset";
import {SvgUri} from "react-native-svg";
import {CalendarScreen} from "./src/screens/CalendarScreen";
import {KanbanScreen} from "./src/screens/KanbanScreen";
import {JournalScreen} from "./src/screens/JournalScreen";
import {TodayScreen} from "./src/screens/TodayScreen";
import {AuthScreen} from "./src/screens/AuthScreen";
import {SubscriptionScreen} from "./src/screens/SubscriptionScreen";
import {InsightsScreen} from "./src/screens/InsightsScreen";
import tw from "./src/lib/tw";
import {useTasks} from "./src/state/useTasks";
import {GradientBackground} from "./src/components/GradientBackground";
import {fonts, useAppFonts} from "./src/theme/fonts";
import {useSupabaseAuth} from "./src/state/useSupabaseAuth";
import {useProfile} from "./src/state/useProfile";
import {isToday} from "./src/lib/date-utils";
import {registerForPushNotificationsAsync} from "./src/lib/notifications";
import {supabase} from "./src/lib/supabase";
import {useSubscription} from "./src/state/useSubscription";
import {LoadingVideoOverlay} from "./src/components/LoadingVideoOverlay";

type Tab = "today" | "journal" | "board" | "calendar" | "insights";

export default function App() {
    const [tab, setTab] = useState<Tab>("today");
    const [transitioning, setTransitioning] = useState(false);
    const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const {session, loading: authLoading, signOut} = useSupabaseAuth();
    const subscription = useSubscription(session);
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

    useEffect(() => {
        return () => {
            if (transitionTimeoutRef.current) {
                clearTimeout(transitionTimeoutRef.current);
            }
        };
    }, []);

    function handleTabChange(nextTab: Tab) {
        if (nextTab === tab) return;
        setTransitioning(true);
        setTab(nextTab);
        if (transitionTimeoutRef.current) {
            clearTimeout(transitionTimeoutRef.current);
        }
        transitionTimeoutRef.current = setTimeout(() => {
            setTransitioning(false);
            transitionTimeoutRef.current = null;
        }, 700);
    }

    const appLoading = !fontsLoaded || authLoading || (session && subscription.loading) || (session && !tasksState.isLoaded);
    if (appLoading) {
        return (
            <GradientBackground>
                <StatusBar style="light"/>
                <LoadingVideoOverlay visible message="Starting Rhodie..."/>
            </GradientBackground>
        );
    }

    if (!session) {
        return (
            <GradientBackground>
                <StatusBar style="light"/>
                <AuthScreen/>
            </GradientBackground>
        );
    }

    if (subscription.requiresPaywall) {
        const priceLabel = subscription.primaryPackage?.product.priceString
            ? `${subscription.primaryPackage.product.priceString}/month`
            : "$3.99/month";
        return (
            <GradientBackground>
                <StatusBar style="light"/>
                <SubscriptionScreen
                    loading={subscription.loading}
                    trialActive={subscription.trialActive}
                    priceLabel={priceLabel}
                    purchaseBusy={subscription.purchaseBusy}
                    restoreBusy={subscription.restoreBusy}
                    error={subscription.error}
                    onSubscribe={subscription.purchase}
                    onRestore={subscription.restore}
                    onSignOut={signOut}
                />
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
                        <Text style={[tw`text-xl rounded-lg border border-white px-2 py-1`, {
                            color: "#E4E0D4",
                            fontFamily: fonts.heading,
                            letterSpacing: 0.5
                        }]}>rh.</Text>
                        <View>
                            <Text style={[tw`text-sm`, {fontFamily: fonts.heading, color: "#E4E0D4"}]}>
                                {profile?.full_name ? `Welcome, ${profile.full_name}` : "Welcome back"}
                            </Text>
                            {profile?.birthday && isToday(profile.birthday) ? (
                                <Text style={[tw`text-xs text-orange-200`, {fontFamily: fonts.body}]}>Happy birthday!
                                    🎉</Text>
                            ) : null}
                        </View>
                    </View>
                    <Pressable onPress={signOut}
                               style={({pressed}) => [tw`px-3 py-1 rounded-xl border border-white/30`, pressed && tw`bg-white/10`]}>
                        <Text style={[tw`text-xs`, {fontFamily: fonts.body, color: "#E4E0D4"}]}>Sign out</Text>
                    </Pressable>
                </View>

                <View style={tw`flex-1 bg-[#0f0f0f] rounded-t-3xl overflow-hidden`}>
                    {tab === "today" && <TodayScreen tasks={tasksState.tasks} session={session}/>}
                    {tab === "journal" && <JournalScreen session={session}/>}
                    {tab === "board" && <KanbanScreen tasksState={tasksState} session={session}/>}
                    {tab === "calendar" &&
                        <CalendarScreen tasks={tasksState.tasks} session={session}
                                        googleCalendar={tasksState.googleCalendar}/>}
                    {tab === "insights" && <InsightsScreen/>}
                </View>

                <View style={tw`px-4 py-3 bg-black`}>
                    <View style={tw`flex-row justify-between`}>
                        {([
                            {key: "today", label: "Home", icon: require("./public/images/home.svg")},
                            {key: "journal", label: "Journal", icon: require("./public/images/journal.svg")},
                            {key: "board", label: "Tasks", icon: require("./public/images/to-do-list.svg")},
                            {key: "calendar", label: "Calendar", icon: require("./public/images/calendar.svg")},
                            {key: "insights", label: "Insights", icon: require("./public/images/insight (1).svg")},
                        ] as const).map((item) => {
                            const active = tab === item.key;
                            const uri = Asset.fromModule(item.icon).uri;
                            const iconColor = active ? "#B55941" : "#E4E0D4";
                            const labelColor = active ? "#B55941" : "#E4E0D4";
                            return (
                                <Pressable
                                    key={item.key}
                                    onPress={() => handleTabChange(item.key)}
                                    style={({pressed}) => [
                                        tw`px-3 py-1 rounded-xl  items-center`,
                                        active ? {
                                            borderColor: "#B55941",
                                            borderWidth: 1
                                        } : tw`border-transparent`,
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
                <LoadingVideoOverlay visible={transitioning} message="Loading screen..."/>
            </SafeAreaView>
        </GradientBackground>
    );
}
