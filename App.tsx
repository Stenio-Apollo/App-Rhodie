import {useEffect, useRef, useState} from "react";
import {Alert, Platform, Pressable, SafeAreaView, Text, View} from "react-native";
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
import {AccountScreen} from "./src/screens/AccountScreen";
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
import {BirthdayConfetti} from "./src/components/BirthdayConfetti";
import {clearTasksStorage} from "./src/lib/storage";
import {clearJournalStorage} from "./src/state/useJournal";
import {getPrivacyPolicyUrl, getTermsOfUseUrl} from "./src/lib/subscriptions";

type Tab = "today" | "journal" | "board" | "calendar" | "insights";

export default function App() {
    const [tab, setTab] = useState<Tab>("today");
    const [accountOpen, setAccountOpen] = useState(false);
    const [transitioning, setTransitioning] = useState(false);
    const [birthdayBurstKey, setBirthdayBurstKey] = useState("initial");
    const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const birthdayBurstTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const {session, loading: authLoading, signOut, deleteAccount} = useSupabaseAuth();
    const subscription = useSubscription(session);
    const {profile, upsertProfile} = useProfile(session);
    const tasksState = useTasks(session);
    const [fontsLoaded] = useAppFonts();
    const birthdayActive = Boolean(profile?.birthday && isToday(profile.birthday));
    const appLoading = !fontsLoaded || authLoading || (session && subscription.loading) || (session && !tasksState.isLoaded);

    useEffect(() => {
        if (!session) {
            setAccountOpen(false);
        }
    }, [session]);

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
            if (birthdayBurstTimeoutRef.current) {
                clearTimeout(birthdayBurstTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (birthdayBurstTimeoutRef.current) {
            clearTimeout(birthdayBurstTimeoutRef.current);
            birthdayBurstTimeoutRef.current = null;
        }

        if (!birthdayActive || transitioning || appLoading || !session) {
            return;
        }

        birthdayBurstTimeoutRef.current = setTimeout(() => {
            setBirthdayBurstKey(`${tab}-${Date.now()}`);
            birthdayBurstTimeoutRef.current = null;
        }, 260);

        return () => {
            if (birthdayBurstTimeoutRef.current) {
                clearTimeout(birthdayBurstTimeoutRef.current);
                birthdayBurstTimeoutRef.current = null;
            }
        };
    }, [appLoading, birthdayActive, session, tab, transitioning]);

    function handleTabChange(nextTab: Tab) {
        if (accountOpen) {
            setAccountOpen(false);
            if (nextTab === tab) return;
        }
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

    async function handleSignOut() {
        setAccountOpen(false);
        await signOut();
    }

    async function handleSaveProfile(payload: { full_name: string; birthday: string | null }) {
        const error = await upsertProfile(payload);
        return error?.message ?? null;
    }

    async function handleDeleteAccount() {
        const errorMessage = await deleteAccount();
        if (errorMessage) {
            Alert.alert("Delete failed", errorMessage);
            return errorMessage;
        }

        await Promise.all([clearTasksStorage(), clearJournalStorage()]);
        setAccountOpen(false);
        return null;
    }

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
        return (
            <GradientBackground>
                <StatusBar style="light"/>
                <SubscriptionScreen
                    loading={subscription.loading}
                    trialActive={subscription.trialActive}
                    purchaseEnabled={subscription.billingConfigured && !subscription.setupIssue}
                    purchaseBusy={subscription.purchaseBusy}
                    restoreBusy={subscription.restoreBusy}
                    error={subscription.setupIssue ?? subscription.error}
                    privacyPolicyUrl={getPrivacyPolicyUrl()}
                    termsOfUseUrl={getTermsOfUseUrl()}
                    trialEndsAt={subscription.trialEndsAt}
                    plans={subscription.plans.map((plan) => ({
                        id: plan.id,
                        title: plan.title,
                        subtitle: plan.subtitle,
                        priceLabel: plan.priceLabel,
                        productIdentifier: plan.productIdentifier,
                    }))}
                    onPurchasePlan={subscription.purchasePlan}
                    onRestore={subscription.restore}
                    onSignOut={handleSignOut}
                />
            </GradientBackground>
        );
    }

    const headerSubtitle = accountOpen
        ? "Account settings"
        : birthdayActive
            ? "Happy birthday! Tap here"
            : "Tap to manage account";

    return (
        <GradientBackground>
            <SafeAreaView style={tw`bg-black flex-1`}>
                <StatusBar style="light"/>

                <View style={tw`flex-row items-center justify-between px-4 py-3`}>
                    <View style={tw`flex-row items-center gap-3`}>
                        <Text
                            style={[
                                tw`text-xl rounded-lg border border-white px-2 py-1`,
                                {color: "#E4E0D4", fontFamily: fonts.heading, letterSpacing: 0.5},
                            ]}
                        >
                            rh.
                        </Text>
                        <Pressable
                            onPress={() => setAccountOpen((current) => !current)}
                            style={({pressed}) => [
                                tw`rounded-2xl px-2 py-1.5`,
                                accountOpen ? {borderWidth: 1, borderColor: "#B55941"} : null,
                                pressed && tw`bg-white/5`,
                            ]}
                        >
                            <Text style={[tw`text-sm`, {fontFamily: fonts.heading, color: "#E4E0D4"}]}> 
                                {profile?.full_name ? `Welcome, ${profile.full_name}` : "Welcome back"}
                            </Text>
                            <Text
                                style={[
                                    tw`text-[11px]`,
                                    {
                                        fontFamily: fonts.body,
                                        color: accountOpen ? "#B55941" : "rgba(228,224,212,0.72)",
                                    },
                                ]}
                            >
                                {headerSubtitle}
                            </Text>
                        </Pressable>
                    </View>
                    <Pressable
                        onPress={() => {
                            void handleSignOut();
                        }}
                        style={({pressed}) => [
                            tw`px-3 py-1 rounded-xl border border-white/30`,
                            pressed && tw`bg-white/10`,
                        ]}
                    >
                        <Text style={[tw`text-xs`, {fontFamily: fonts.body, color: "#E4E0D4"}]}>Sign out</Text>
                    </Pressable>
                </View>

                <View style={tw`flex-1 bg-[#0f0f0f] rounded-t-3xl overflow-hidden`}>
                    {accountOpen ? (
                        <AccountScreen
                            session={session}
                            profile={profile}
                            subscription={subscription}
                            onClose={() => setAccountOpen(false)}
                            onSignOut={handleSignOut}
                            onSaveProfile={handleSaveProfile}
                            onDeleteAccount={handleDeleteAccount}
                        />
                    ) : null}
                    {!accountOpen && tab === "today" ? <TodayScreen tasks={tasksState.tasks} session={session}/> : null}
                    {!accountOpen && tab === "journal" ? <JournalScreen session={session}/> : null}
                    {!accountOpen && tab === "board" ? <KanbanScreen tasksState={tasksState} session={session}/> : null}
                    {!accountOpen && tab === "calendar" ? (
                        <CalendarScreen tasks={tasksState.tasks} session={session} googleCalendar={tasksState.googleCalendar}/>
                    ) : null}
                    {!accountOpen && tab === "insights" ? <InsightsScreen/> : null}
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
                            const active = !accountOpen && tab === item.key;
                            const uri = Asset.fromModule(item.icon).uri;
                            const iconColor = active ? "#B55941" : "#E4E0D4";
                            const labelColor = active ? "#B55941" : "#E4E0D4";
                            return (
                                <Pressable
                                    key={item.key}
                                    onPress={() => handleTabChange(item.key)}
                                    style={({pressed}) => [
                                        tw`px-3 py-1 rounded-xl items-center`,
                                        active ? {borderColor: "#B55941", borderWidth: 1} : tw`border-transparent`,
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
                <BirthdayConfetti visible={birthdayActive} triggerKey={birthdayBurstKey}/>
                <LoadingVideoOverlay visible={transitioning} message="Loading screen..."/>
            </SafeAreaView>
        </GradientBackground>
    );
}
