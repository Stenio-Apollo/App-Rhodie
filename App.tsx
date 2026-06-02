import {useEffect, useRef, useState} from "react";
import {Alert, AppState, Image, Modal, Platform, Pressable, SafeAreaView, Text, View} from "react-native";
import {StatusBar} from "expo-status-bar";
import {BlurView} from "expo-blur";
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
import {isToday, toLocalISODate} from "./src/lib/date-utils";
import {registerForPushNotificationsAsync} from "./src/lib/notifications";
import {supabase} from "./src/lib/supabase";
import {useSubscription} from "./src/state/useSubscription";
import {LoadingVideoOverlay} from "./src/components/LoadingVideoOverlay";
import {BirthdayConfetti} from "./src/components/BirthdayConfetti";
import {clearTasksStorage} from "./src/lib/storage";
import {clearJournalStorage} from "./src/state/useJournal";
import {getPrivacyPolicyUrl, getTermsOfUseUrl} from "./src/lib/subscriptions";
import {clearWeeklyGoalStorage, useWeeklyGoal} from "./src/state/useWeeklyGoal";
import {haptics} from "./src/lib/haptics";

type Tab = "today" | "journal" | "board" | "calendar" | "insights";

export default function App() {
    const [tab, setTab] = useState<Tab>("today");
    const [accountOpen, setAccountOpen] = useState(false);
    const [subscriptionOfferOpen, setSubscriptionOfferOpen] = useState(false);
    const [goalCheckVisible, setGoalCheckVisible] = useState(false);
    const [goalFeedbackVisible, setGoalFeedbackVisible] = useState(false);
    const [goalFeedbackMessage, setGoalFeedbackMessage] = useState("");
    const [goalCheckRunKey, setGoalCheckRunKey] = useState(0);
    const [birthdayBurstKey, setBirthdayBurstKey] = useState("initial");
    const birthdayBurstTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const appStateRef = useRef(AppState.currentState);
    const lastHandledGoalCheckRunKeyRef = useRef(0);
    const {session, loading: authLoading, signOut, deleteAccount} = useSupabaseAuth();
    const subscription = useSubscription(session);
    const {profile, upsertProfile} = useProfile(session);
    const tasksState = useTasks(session);
    const weeklyGoalState = useWeeklyGoal(session?.user.id);
    const [fontsLoaded] = useAppFonts();
    const birthdayActive = Boolean(profile?.birthday && isToday(profile.birthday));
    const appLoading = !fontsLoaded ||
        authLoading ||
        (session && subscription.loading) ||
        (session && (!tasksState.isLoaded || !weeklyGoalState.isLoaded));

    useEffect(() => {
        if (!session) {
            setAccountOpen(false);
            setSubscriptionOfferOpen(false);
            setGoalCheckVisible(false);
            setGoalFeedbackVisible(false);
        }
    }, [session]);

    useEffect(() => {
        if (!session || appLoading) return;
        setGoalCheckRunKey((current) => current + 1);
    }, [appLoading, session]);

    useEffect(() => {
        const subscription = AppState.addEventListener("change", (nextState) => {
            const wasBackground = /inactive|background/.test(appStateRef.current);
            appStateRef.current = nextState;
            if (!session || appLoading) return;
            if (wasBackground && nextState === "active") {
                setGoalCheckRunKey((current) => current + 1);
            }
        });

        return () => {
            subscription.remove();
        };
    }, [appLoading, session]);

    useEffect(() => {
        if (!session || appLoading || goalCheckRunKey === 0) return;
        if (lastHandledGoalCheckRunKeyRef.current === goalCheckRunKey) return;
        lastHandledGoalCheckRunKeyRef.current = goalCheckRunKey;

        const goal = weeklyGoalState.goal;
        if (!goal || goal.achievedAt) return;
        if (goalCheckVisible || goalFeedbackVisible) return;

        const today = toLocalISODate();
        const lastCheckedDate = goal.lastCheckedAt ? toLocalISODate(new Date(goal.lastCheckedAt)) : null;
        if (lastCheckedDate === today) return;

        setGoalCheckVisible(true);
    }, [appLoading, goalCheckRunKey, goalCheckVisible, goalFeedbackVisible, session, weeklyGoalState.goal]);

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

        if (!birthdayActive || appLoading || !session) {
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
    }, [appLoading, birthdayActive, session, tab]);

    function handleTabChange(nextTab: Tab) {
        haptics.navigation();

        if (accountOpen) {
            setAccountOpen(false);
            if (nextTab === tab) return;
        }
        if (nextTab === tab) return;

        setTab(nextTab);
    }

    async function handleSignOut() {
        setAccountOpen(false);
        setSubscriptionOfferOpen(false);
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

        await Promise.all([
            clearTasksStorage(session?.user.id),
            clearJournalStorage(session?.user.id),
            clearWeeklyGoalStorage(session?.user.id),
        ]);
        setAccountOpen(false);
        return null;
    }

    async function handleGoalCheck(achieved: boolean) {
        setGoalCheckVisible(false);
        await weeklyGoalState.recordGoalCheck(achieved);
        if (achieved) {
            haptics.reachStreakMilestone();
        }
        setGoalFeedbackMessage(achieved ? "keep crushing it" : "lets not forget");
        setGoalFeedbackVisible(true);
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

    if (subscription.requiresPaywall || subscriptionOfferOpen) {
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
                    allowDismiss={!subscription.requiresPaywall}
                    onDismiss={() => setSubscriptionOfferOpen(false)}
                />
            </GradientBackground>
        );
    }

    const headerSubtitle = accountOpen
        ? "Account settings"
        : birthdayActive
            ? "Happy birthday! Tap here"
            : "Tap to manage account";
    const profileIconColor = accountOpen ? "#B55941" : "#E4E0D4";

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
                            onPress={() => {
                                haptics.selection();
                                setAccountOpen((current) => !current);
                            }}
                            style={({pressed}) => [
                                tw`rounded-2xl px-2 py-1.5`,
                                accountOpen ? {borderWidth: 1, borderColor: "#B55941"} : null,
                                pressed && tw`bg-white/5`,
                            ]}
                        >
                            <Text style={[tw`text-sm`, {fontFamily: fonts.heading, color: "#E4E0D4"}]}>
                                {profile?.full_name ? `Welcome, ${profile.full_name}` : "Welcome back"}
                            </Text>
                            <View style={tw`mt-0.5 flex-row items-center gap-1.5`}>
                                <Image
                                    source={require("./public/images/profile.png")}
                                    style={{width: 13, height: 13, tintColor: profileIconColor}}
                                    resizeMode="contain"
                                />
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
                            </View>
                        </Pressable>
                    </View>
                    <Pressable
                        onPress={() => {
                            haptics.selection();
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

                <View style={tw`relative flex-1 bg-[#0f0f0f] rounded-t-3xl overflow-hidden`}>
                    {accountOpen ? (
                        <AccountScreen
                            session={session}
                            profile={profile}
                            privacyPolicyUrl={getPrivacyPolicyUrl()}
                            termsOfUseUrl={getTermsOfUseUrl()}
                            onOpenSubscriptionOffers={() => setSubscriptionOfferOpen(true)}
                            subscription={subscription}
                            onClose={() => setAccountOpen(false)}
                            onSignOut={handleSignOut}
                            onSaveProfile={handleSaveProfile}
                            onDeleteAccount={handleDeleteAccount}
                        />
                    ) : null}
                    {!accountOpen && tab === "today" ? (
                        <TodayScreen
                            tasks={tasksState.tasks}
                            session={session}
                            weeklyGoal={weeklyGoalState.goal}
                            weeklyGoalProgress={weeklyGoalState.progress}
                        />
                    ) : null}
                    {!accountOpen && tab === "journal" ? <JournalScreen session={session}/> : null}
                    {!accountOpen && tab === "board" ? <KanbanScreen tasksState={tasksState} session={session}/> : null}
                    {!accountOpen && tab === "calendar" ? (
                        <CalendarScreen
                            tasks={tasksState.tasks}
                            googleCalendar={tasksState.googleCalendar}
                            weeklyGoal={weeklyGoalState.goal}
                            weeklyGoalPresets={weeklyGoalState.presets}
                            onSaveWeeklyGoal={weeklyGoalState.saveGoal}
                        />
                    ) : null}
                    {!accountOpen && tab === "insights" ? <InsightsScreen/> : null}
                    <View style={tw`absolute bottom-0 left-0 right-0 px-4 pb-3 pt-2`}>
                        <View
                            style={tw`overflow-hidden rounded-2xl border border-[#B55941]/33 bg-black/10 p-1`}
                        >
                            <BlurView
                                intensity={72}
                                tint="dark"
                                style={tw`overflow-hidden rounded-2xl border border-[#B55941]/69`}
                            >
                                <View style={tw`flex-row justify-between bg-black/47 px-2 py-2`}>
                                    {([
                                        {key: "today", label: "Home", icon: require("./public/images/home.svg")},
                                        {key: "journal", label: "Journal", icon: require("./public/images/journal.svg")},
                                        {key: "board", label: "Tasks", icon: require("./public/images/to-do-list.svg")},
                                        {key: "calendar", label: "Calendar", icon: require("./public/images/calendar.svg")},
                                        {
                                            key: "insights",
                                            label: "Insights",
                                            icon: require("./public/images/insight (1).svg")
                                        },
                                    ] as const).map((item) => {
                                        const active = !accountOpen && tab === item.key;
                                        const uri = Asset.fromModule(item.icon).uri;
                                        const activeNavColor = "rgb(181 89 65)";
                                        const iconColor = active ? activeNavColor : "#E4E0D4";
                                        const labelColor = "#E4E0D4";
                                        return (
                                            <Pressable
                                                key={item.key}
                                                onPress={() => handleTabChange(item.key)}
                                                style={({pressed}) => [
                                                    tw`px-3 py-1 rounded-xl mt-1 mb-1 items-center border border-[#B55941]/19 bg-black/11`,
                                                    active
                                                        ? {borderColor: activeNavColor}
                                                        : {},
                                                    pressed && tw`bg-white/5`,
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        tw`text-[11px] font-bold mb-2`,
                                                        {fontFamily: fonts.heading, color: labelColor},
                                                    ]}
                                                >
                                                    {item.label}
                                                </Text>
                                                <SvgUri width={24} height={24} uri={uri} fill={iconColor}
                                                        stroke={iconColor}/>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </BlurView>
                        </View>
                    </View>
                </View>
                <BirthdayConfetti visible={birthdayActive} triggerKey={birthdayBurstKey}/>
                <Modal
                    visible={goalCheckVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setGoalCheckVisible(false)}
                >
                    <View style={tw`flex-1 items-center justify-center bg-black/72 px-5`}>
                        <View style={tw`w-full rounded-[28px] border border-[#B55941] bg-[#0f0f0f] p-5`}>
                            <Text style={[tw`text-center text-xl text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                                Weekly goal check-in
                            </Text>
                            <Text
                                style={[tw`mt-3 text-center text-sm leading-5 text-slate-300`, {fontFamily: fonts.body}]}>
                                Have you achieved this week's goal?
                            </Text>
                            {weeklyGoalState.goal ? (
                                <View style={tw`mt-4 rounded-2xl border border-[#2c2c2c] bg-black/42 px-3 py-3`}>
                                    <Text
                                        style={[tw`text-center text-base text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                                        {weeklyGoalState.goal.text}
                                    </Text>
                                </View>
                            ) : null}
                            <View style={tw`mt-5 flex-row gap-3`}>
                                <Pressable
                                    onPress={() => {
                                        haptics.selection();
                                        void handleGoalCheck(false);
                                    }}
                                    style={({pressed}) => [
                                        tw`flex-1 rounded-xl border border-[#2c2c2c] px-3 py-3`,
                                        {backgroundColor: "rgba(0,0,0,0.35)"},
                                        pressed && tw`opacity-80`,
                                    ]}
                                >
                                    <Text style={[tw`text-center text-sm text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                                        Not yet
                                    </Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => {
                                        void handleGoalCheck(true);
                                    }}
                                    style={({pressed}) => [
                                        tw`flex-1 rounded-xl px-3 py-3`,
                                        {backgroundColor: "#B55941"},
                                        pressed && tw`opacity-80`,
                                    ]}
                                >
                                    <Text style={[tw`text-center text-sm text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                                        Yes
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </Modal>
                <Modal
                    visible={goalFeedbackVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setGoalFeedbackVisible(false)}
                >
                    <View style={tw`flex-1 items-center justify-center bg-black/72 px-5`}>
                        <View style={tw`w-full rounded-[28px] border border-[#B55941] bg-[#0f0f0f] p-5`}>
                            <Text style={[tw`text-center text-xl text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                                {goalFeedbackMessage}
                            </Text>
                            {weeklyGoalState.goal ? (
                                <View style={tw`mt-4 rounded-2xl border border-[#2c2c2c] bg-black/42 px-3 py-3`}>
                                    <Text
                                        style={[tw`text-center text-base text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                                        {weeklyGoalState.goal.text}
                                    </Text>
                                </View>
                            ) : null}
                            <View style={tw`mt-5`}>
                                <Pressable
                                    onPress={() => {
                                        haptics.selection();
                                        setGoalFeedbackVisible(false);
                                    }}
                                    style={({pressed}) => [
                                        tw`rounded-xl px-3 py-3`,
                                        {backgroundColor: "#B55941"},
                                        pressed && tw`opacity-80`,
                                    ]}
                                >
                                    <Text style={[tw`text-center text-sm text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                                        Continue
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </GradientBackground>
    );
}
