import {useEffect, useRef, useState} from "react";
import {Alert, AppState, Platform, SafeAreaView, View} from "react-native";
import {StatusBar} from "expo-status-bar";
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
import {useAppFonts} from "./src/theme/fonts";
import {useSupabaseAuth} from "./src/state/useSupabaseAuth";
import {useProfile} from "./src/state/useProfile";
import {isToday, toLocalISODate} from "./src/lib/date-utils";
import {registerForPushNotificationsAsync} from "./src/lib/notifications";
import {supabase} from "./src/lib/supabase";
import {useSubscription} from "./src/state/useSubscription";
import {LoadingVideoOverlay} from "./src/components/LoadingVideoOverlay";
import {BirthdayConfetti} from "./src/components/BirthdayConfetti";
import {clearTasksStorage} from "./src/lib/storage";
import {clearJournalStorage, useJournal} from "./src/state/useJournal";
import {getPrivacyPolicyUrl, getTermsOfUseUrl} from "./src/lib/subscriptions";
import {clearWeeklyGoalStorage, useWeeklyGoal} from "./src/state/useWeeklyGoal";
import {haptics} from "./src/lib/haptics";
import {AppHeader} from "./src/components/AppHeader";
import {BottomTabBar, type Tab} from "./src/components/BottomTabBar";
import {GoalCheckModal} from "./src/components/GoalCheckModal";
import {GoalFeedbackModal} from "./src/components/GoalFeedbackModal";

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
    const {
        session,
        loading: authLoading,
        signOut,
        deleteAccount,
        signInMagicLink,
        verifyEmailOtp,
        signInWithPassword,
        signUpWithPassword,
    } = useSupabaseAuth();
    const subscription = useSubscription(session);
    const {profile, upsertProfile} = useProfile(session);
    const tasksState = useTasks(session);
    const weeklyGoalState = useWeeklyGoal(session?.user.id);
    const journalState = useJournal(session);
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
                <AuthScreen
                    signInMagicLink={signInMagicLink}
                    verifyEmailOtp={verifyEmailOtp}
                    signInWithPassword={signInWithPassword}
                    signUpWithPassword={signUpWithPassword}
                />
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

    return (
        <GradientBackground>
            <SafeAreaView style={tw`bg-black flex-1`}>
                <StatusBar style="light"/>

                <AppHeader
                    fullName={profile?.full_name}
                    accountOpen={accountOpen}
                    birthdayActive={birthdayActive}
                    onToggleAccount={() => setAccountOpen((current) => !current)}
                    onSignOut={() => {
                        void handleSignOut();
                    }}
                />

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
                            profile={profile}
                            journalByDate={journalState.byDate}
                            weeklyGoal={weeklyGoalState.goal}
                            weeklyGoalProgress={weeklyGoalState.progress}
                        />
                    ) : null}
                    {!accountOpen && tab === "journal" ? <JournalScreen journal={journalState}/> : null}
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
                    <BottomTabBar activeTab={tab} accountOpen={accountOpen} onTabPress={handleTabChange}/>
                </View>
                <BirthdayConfetti visible={birthdayActive} triggerKey={birthdayBurstKey}/>
                <GoalCheckModal
                    visible={goalCheckVisible}
                    goal={weeklyGoalState.goal}
                    onSelect={(achieved) => {
                        void handleGoalCheck(achieved);
                    }}
                    onRequestClose={() => setGoalCheckVisible(false)}
                />
                <GoalFeedbackModal
                    visible={goalFeedbackVisible}
                    message={goalFeedbackMessage}
                    goal={weeklyGoalState.goal}
                    onContinue={() => setGoalFeedbackVisible(false)}
                />
            </SafeAreaView>
        </GradientBackground>
    );
}
