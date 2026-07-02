import {useEffect, useMemo, useRef, useState} from "react";
import {Alert, Animated, AppState, Easing, ImageBackground, PanResponder, Platform, StyleSheet, Text, View} from "react-native";
import {SafeAreaProvider, SafeAreaView} from "react-native-safe-area-context";
import {StatusBar} from "expo-status-bar";
import * as Updates from "expo-updates";
import {CalendarScreen} from "./src/screens/CalendarScreen";
import {KanbanScreen} from "./src/screens/KanbanScreen";
import {JournalScreen} from "./src/screens/JournalScreen";
import {TodayScreen} from "./src/screens/TodayScreen";
import {AuthScreen} from "./src/screens/AuthScreen";
import {SubscriptionScreen} from "./src/screens/SubscriptionScreen";
import {InsightsScreen} from "./src/screens/InsightsScreen";
import {CommunityScreen} from "./src/screens/CommunityScreen";
import {DirectMessagesScreen, type DmStartTarget} from "./src/screens/DirectMessagesScreen";
import {AccountScreen} from "./src/screens/AccountScreen";
import tw from "./src/lib/tw";
import {useTasks} from "./src/state/useTasks";
import {GradientBackground} from "./src/components/GradientBackground";
import {useAppFonts} from "./src/theme/fonts";
import {useSupabaseAuth} from "./src/state/useSupabaseAuth";
import {useProfile} from "./src/state/useProfile";
import {isToday, toLocalISODate} from "./src/lib/date-utils";
import {registerForPushNotificationsAsync, syncDailyReflectionReminderNotifications} from "./src/lib/notifications";
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
import {UpdateAvailableBanner} from "./src/components/UpdateAvailableBanner";
import {DayPlanScreen} from "./src/screens/DayPlanScreen";
import {usePlannerEvents} from "./src/state/usePlannerEvents";
import {OnboardingScreen} from "./src/screens/OnboardingScreen";
import {useOnboarding} from "./src/state/useOnboarding";
import {clearStickyNoteStorage, useStickyNote} from "./src/state/useStickyNote";
import {clearVisualModeStorage, useVisualMode, type VisualMode} from "./src/state/useVisualMode";
import {useEncryption} from "./src/state/useEncryption";
import {PrivacyPassphraseScreen} from "./src/screens/PrivacyPassphraseScreen";
import {fonts} from "./src/theme/fonts";
import {AppErrorBoundary} from "./src/components/AppErrorBoundary";
import {useCommunity, type CommunityAuthor} from "./src/state/useCommunity";
import {useDirectMessages} from "./src/state/useDirectMessages";

type HomeAction =
    | { key: number; target: "journalPrompt"; entryId: string | null }
    | { key: number; target: "gratitude"; entryId: string | null }
    | { key: number; target: "weeklyGoal" }
    | { key: number; target: "tasks" };

type HomeActionInput =
    | { target: "journalPrompt"; entryId: string | null }
    | { target: "gratitude"; entryId: string | null }
    | { target: "weeklyGoal" }
    | { target: "tasks" };

const TAB_ORDER: Tab[] = ["today", "plan", "journal", "calendar", "community"];
const SWIPE_DISTANCE_THRESHOLD = 70;
const SWIPE_VERTICAL_LIMIT = 55;

function getVisualModeShellColor(visualMode: VisualMode): string {
    if (visualMode === "georgia") return "#111111";
    if (visualMode === "river") return "#DDEAF2";
    if (visualMode === "sonny") return "#000000";
    return "#708090";
}

function AppContent() {
    const [tab, setTab] = useState<Tab>("today");
    const [accountOpen, setAccountOpen] = useState(false);
    const [messagesOpen, setMessagesOpen] = useState(false);
    const [messageStartTarget, setMessageStartTarget] = useState<DmStartTarget | null>(null);
    const [journalPromptEntryOpen, setJournalPromptEntryOpen] = useState(false);
    const [journalMemoryOpen, setJournalMemoryOpen] = useState(false);
    const [calendarGoalsOpen, setCalendarGoalsOpen] = useState(false);
    const [subscriptionOfferOpen, setSubscriptionOfferOpen] = useState(false);
    const [homeAction, setHomeAction] = useState<HomeAction | null>(null);
    const [goalCheckVisible, setGoalCheckVisible] = useState(false);
    const [goalFeedbackVisible, setGoalFeedbackVisible] = useState(false);
    const [goalFeedbackMessage, setGoalFeedbackMessage] = useState("");
    const [goalCheckRunKey, setGoalCheckRunKey] = useState(0);
    const [birthdayBurstKey, setBirthdayBurstKey] = useState("initial");
    const birthdayBurstTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const appStateRef = useRef(AppState.currentState);
    const lastHandledGoalCheckRunKeyRef = useRef(0);
    const screenRouteOpacity = useRef(new Animated.Value(1)).current;
    const screenRouteTranslateY = useRef(new Animated.Value(0)).current;
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
    const encryption = useEncryption(session);
    const tasksState = useTasks(session, encryption);
    const weeklyGoalState = useWeeklyGoal(session?.user.id, encryption);
    const journalState = useJournal(session, encryption);
    const plannerState = usePlannerEvents(session, encryption);
    const communityState = useCommunity(session);
    const directMessagesState = useDirectMessages(session, encryption);
    const onboarding = useOnboarding(session?.user.id);
    const stickyNoteState = useStickyNote(session?.user.id, encryption);
    const visualModeState = useVisualMode(session?.user.id);
    const [fontsLoaded] = useAppFonts();
    const birthdayActive = Boolean(profile?.birthday && isToday(profile.birthday));
    const appLoading = !fontsLoaded ||
        authLoading ||
        (session && subscription.loading) ||
        (session && !encryption.isReady) ||
        (session && (!onboarding.isLoaded || !visualModeState.isLoaded));

    useEffect(() => {
        if (!session) {
            setAccountOpen(false);
            setMessagesOpen(false);
            setMessageStartTarget(null);
            setSubscriptionOfferOpen(false);
            setGoalCheckVisible(false);
            setGoalFeedbackVisible(false);
        }
    }, [session]);

    useEffect(() => {
        screenRouteOpacity.setValue(0);
        screenRouteTranslateY.setValue(-14);

        Animated.parallel([
            Animated.timing(screenRouteOpacity, {
                toValue: 1,
                duration: 260,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(screenRouteTranslateY, {
                toValue: 0,
                duration: 260,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();
    }, [accountOpen, screenRouteOpacity, screenRouteTranslateY, tab]);

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
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
            await supabase.from("push_tokens").upsert({
                user_id: session.user.id,
                token,
                platform: Platform.OS,
                timezone,
                updated_at: new Date().toISOString(),
            });
        })();
        return () => {
            cancelled = true;
        };
    }, [session]);

    useEffect(() => {
        if (!session || appLoading) return;
        void syncDailyReflectionReminderNotifications();
    }, [appLoading, session]);

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
        setHomeAction(null);
        setJournalPromptEntryOpen(false);
        setMessagesOpen(false);
        setMessageStartTarget(null);

        if (accountOpen) {
            setAccountOpen(false);
            if (nextTab === tab) return;
        }
        if (nextTab === tab) return;

        setTab(nextTab);
    }

    function handleOpenMessages(author?: CommunityAuthor) {
        setAccountOpen(false);
        setMessagesOpen(true);
        if (author) {
            setMessageStartTarget({key: Date.now(), author});
        } else {
            setMessageStartTarget(null);
        }
    }

    const screenSwipeResponder = useMemo(
        () =>
            PanResponder.create({
                onMoveShouldSetPanResponder: (_event, gestureState) => {
                    if (accountOpen) return false;
                    const horizontalMovement = Math.abs(gestureState.dx);
                    const verticalMovement = Math.abs(gestureState.dy);
                    return horizontalMovement > 18 && horizontalMovement > verticalMovement * 1.4;
                },
                onPanResponderRelease: (_event, gestureState) => {
                    if (accountOpen) return;
                    const horizontalMovement = Math.abs(gestureState.dx);
                    const verticalMovement = Math.abs(gestureState.dy);
                    if (horizontalMovement < SWIPE_DISTANCE_THRESHOLD || verticalMovement > SWIPE_VERTICAL_LIMIT) return;

                    const currentIndex = TAB_ORDER.indexOf(tab === "board" ? "calendar" : tab === "insights" ? "community" : tab);
                    if (currentIndex < 0) return;

                    const nextIndex = gestureState.dx < 0 ? currentIndex + 1 : currentIndex - 1;
                    const nextTab = TAB_ORDER[nextIndex];
                    if (!nextTab) return;

                    handleTabChange(nextTab);
                },
                onPanResponderTerminationRequest: () => true,
            }),
        [accountOpen, tab],
    );

    function openHomeAction(action: HomeActionInput) {
        haptics.navigation();
        setAccountOpen(false);
        setMessagesOpen(false);
        setMessageStartTarget(null);
        const key = Date.now();

        if (action.target === "gratitude" || action.target === "journalPrompt") {
            setHomeAction({key, target: action.target, entryId: action.entryId});
        } else {
            setHomeAction({key, target: action.target});
        }

        if (action.target === "weeklyGoal") {
            setTab("calendar");
            return;
        }

        if (action.target === "tasks") {
            setTab("board");
            return;
        }

        setTab("journal");
    }

    function openTasksRoute() {
        setHomeAction(null);
        setAccountOpen(false);
        setMessagesOpen(false);
        setMessageStartTarget(null);
        setTab("board");
    }

    function openInsightsRoute() {
        setHomeAction(null);
        setAccountOpen(false);
        setMessagesOpen(false);
        setMessageStartTarget(null);
        setTab("insights");
    }

    function openPeersRoute() {
        setHomeAction(null);
        setAccountOpen(false);
        setMessagesOpen(false);
        setMessageStartTarget(null);
        setTab("community");
    }

    async function handleSignOut() {
        setAccountOpen(false);
        setMessagesOpen(false);
        setMessageStartTarget(null);
        setSubscriptionOfferOpen(false);
        await encryption.forgetDeviceKey();
        await signOut();
    }

    async function handleSaveProfile(payload: { full_name: string; birthday: string | null; avatar_url?: string | null }) {
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
            encryption.forgetDeviceKey(),
            clearTasksStorage(session?.user.id),
            clearJournalStorage(session?.user.id),
            clearWeeklyGoalStorage(session?.user.id),
            clearStickyNoteStorage(session?.user.id),
            clearVisualModeStorage(session?.user.id),
        ]);
        setAccountOpen(false);
        setMessagesOpen(false);
        setMessageStartTarget(null);
        return null;
    }

    async function handleGoalCheck(achieved: boolean) {
        setGoalCheckVisible(false);
        try {
            await weeklyGoalState.recordGoalCheck(achieved);
            if (achieved) {
                haptics.reachStreakMilestone();
            }
            setGoalFeedbackMessage(achieved ? "keep crushing it" : "lets not forget");
            setGoalFeedbackVisible(true);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Weekly goal could not be saved.";
            Alert.alert("Goal sync failed", message);
        }
    }

    async function handleAddStickyNoteToTask() {
        const trimmed = stickyNoteState.note.text.trim();
        if (!trimmed) return;

        await tasksState.addTask({
            title: trimmed.split(/\r?\n/)[0],
            description: trimmed.split(/\r?\n/).slice(1).join("\n"),
            dueDate: null,
            dueTime: null,
            priority: "medium",
            status: "todo",
        });
        haptics.createNewTask();
    }

    async function handleCompleteOnboarding() {
        await onboarding.completeOnboarding();
        setTab("today");
        setHomeAction(null);
        setAccountOpen(false);
        setMessagesOpen(false);
        setMessageStartTarget(null);

        if (Updates.isEnabled) {
            try {
                await Updates.reloadAsync();
            } catch {
                // If reload fails, the state update above still lets the app continue.
            }
        }
    }

    if (appLoading) {
        if (session && encryption.status === "unlocked") {
            return (
                <GradientBackground>
                    <StatusBar style="light"/>
                    <View style={tw`flex-1 items-center justify-center bg-black px-6`}>
                        <Text style={[tw`text-center text-xl text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                            Unlocking your private data...
                        </Text>
                        <Text style={[tw`mt-3 text-center text-sm leading-5 text-slate-300`, {fontFamily: fonts.body}]}>
                            If your connection is slow, Rhodie will still open with your local encrypted data.
                        </Text>
                    </View>
                </GradientBackground>
            );
        }

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

    if (encryption.status !== "unlocked") {
        return (
            <GradientBackground>
                <StatusBar style="light"/>
                <PrivacyPassphraseScreen encryption={encryption} onSignOut={handleSignOut}/>
            </GradientBackground>
        );
    }

    if (!onboarding.hasCompletedOnboarding) {
        return (
            <GradientBackground>
                <StatusBar style="light"/>
                <OnboardingScreen
                    onComplete={handleCompleteOnboarding}
                />
            </GradientBackground>
        );
    }

    const showBottomTabBar =
        !journalPromptEntryOpen &&
        tab !== "board" &&
        tab !== "insights" &&
        !journalMemoryOpen &&
        !calendarGoalsOpen;
    const shellBackgroundColor = getVisualModeShellColor(visualModeState.mode);

    return (
        <AppErrorBoundary
            onReset={() => {
                void handleSignOut();
            }}
        >
            <SafeAreaProvider>
            <GradientBackground>
                <SafeAreaView
                    edges={["top", "left", "right"]}
                    style={[tw`flex-1`, {backgroundColor: shellBackgroundColor}]}
                >
                    <StatusBar style="light"/>
                    {visualModeState.mode === "georgia" ? (
                        <ImageBackground
                            source={require("./public/images/newspaper 1.jpg")}
                            resizeMode="cover"
                            style={StyleSheet.absoluteFill}
                            imageStyle={{opacity: 0.33}}
                            pointerEvents="none"
                        />
                    ) : null}

                <AppHeader
                    fullName={profile?.full_name}
                    avatarUrl={profile?.avatar_url}
                    accountOpen={accountOpen}
                    visualMode={visualModeState.mode}
                    onToggleVisualMode={() => {
                        visualModeState.setMode(
                            visualModeState.mode === "coast"
                                ? "georgia"
                                : visualModeState.mode === "georgia"
                                    ? "river"
                                    : visualModeState.mode === "river"
                                        ? "sonny"
                                        : "coast",
                        );
                    }}
                    onToggleAccount={() => {
                        setMessagesOpen(false);
                        setMessageStartTarget(null);
                        setAccountOpen((current) => !current);
                    }}
                />

                <UpdateAvailableBanner/>

                <View
                    style={tw`relative flex-1 rounded-t-3xl overflow-hidden`}
                    {...screenSwipeResponder.panHandlers}
                >
                    <Animated.View
                        style={[
                            tw`flex-1`,
                            {opacity: screenRouteOpacity, transform: [{translateY: screenRouteTranslateY}]},
                        ]}
                    >
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
                            onResetOnboarding={onboarding.resetOnboarding}
                            visualMode={visualModeState.mode}
                        />
                    ) : null}
                    {!accountOpen && tab === "today" ? (
                        <TodayScreen
                            tasks={tasksState.tasks}
                            profile={profile}
                            journalByDate={journalState.byDate}
                            weeklyGoal={weeklyGoalState.goal}
                            weeklyGoalProgress={weeklyGoalState.progress}
                            onOpenJournalPrompt={(entryId) => openHomeAction({target: "journalPrompt", entryId})}
                            onOpenWeeklyGoal={() => openHomeAction({target: "weeklyGoal"})}
                            onOpenGratitude={(entryId) => openHomeAction({target: "gratitude", entryId})}
                            onOpenTasks={() => openHomeAction({target: "tasks"})}
                            stickyNote={stickyNoteState.note}
                            onChangeStickyNote={stickyNoteState.setText}
                            onAddStickyNoteToTask={() => {
                                void handleAddStickyNoteToTask();
                            }}
                            onClearStickyNote={stickyNoteState.clear}
                            visualMode={visualModeState.mode}
                            showTutorial={onboarding.visibleTutorials.home}
                            onDismissTutorial={() => {
                                void onboarding.dismissTutorial("home");
                            }}
                        />
                    ) : null}
                    {!accountOpen && tab === "plan" ? (
                        <DayPlanScreen
                            planner={plannerState}
                            visualMode={visualModeState.mode}
                            showTutorial={onboarding.visibleTutorials.plan}
                            onDismissTutorial={() => {
                                void onboarding.dismissTutorial("plan");
                            }}
                        />
                    ) : null}
                    {!accountOpen && tab === "journal" ? (
                        <JournalScreen
                            journal={journalState}
                            homeAction={
                                homeAction?.target === "journalPrompt"
                                    ? {key: homeAction.key, target: "prompt", entryId: homeAction.entryId}
                                    : homeAction?.target === "gratitude"
                                        ? {key: homeAction.key, target: "gratitude", entryId: homeAction.entryId}
                                        : null
                            }
                            visualMode={visualModeState.mode}
                            badgeCount={weeklyGoalState.progress.badges}
                            showTutorial={onboarding.visibleTutorials.journal}
                            onDismissTutorial={() => {
                                void onboarding.dismissTutorial("journal");
                            }}
                            onPromptEntryOpenChange={setJournalPromptEntryOpen}
                            onMemoryRouteChange={setJournalMemoryOpen}
                        />
                    ) : null}
                    {!accountOpen && tab === "board" ? (
                        <KanbanScreen
                            tasksState={tasksState}
                            focusTaskFormKey={homeAction?.target === "tasks" ? homeAction.key : undefined}
                            visualMode={visualModeState.mode}
                            showTutorial={onboarding.visibleTutorials.tasks}
                            onDismissTutorial={() => {
                                void onboarding.dismissTutorial("tasks");
                            }}
                            onBack={() => {
                                setHomeAction(null);
                                setTab("calendar");
                            }}
                        />
                    ) : null}
                    {!accountOpen && tab === "calendar" ? (
                        <CalendarScreen
                            tasks={tasksState.tasks}
                            googleCalendar={tasksState.googleCalendar}
                            weeklyGoal={weeklyGoalState.goal}
                            weeklyGoalPresets={weeklyGoalState.presets}
                            weeklyGoalProgress={weeklyGoalState.progress}
                            onSaveWeeklyGoal={weeklyGoalState.saveGoal}
                            onMarkGoalAchieved={() => {
                                void handleGoalCheck(true);
                            }}
                            loadRecentAchievedGoals={weeklyGoalState.loadRecentAchievedGoals}
                            onOpenTasks={openTasksRoute}
                            focusWeeklyGoalKey={homeAction?.target === "weeklyGoal" ? homeAction.key : undefined}
                            visualMode={visualModeState.mode}
                            showTutorial={onboarding.visibleTutorials.calendar}
                            onDismissTutorial={() => {
                                void onboarding.dismissTutorial("calendar");
                            }}
                            onGoalsRouteChange={setCalendarGoalsOpen}
                        />
                    ) : null}
                    {!accountOpen && tab === "community" ? (
                        <CommunityScreen
                            community={communityState}
                            unreadMessageCount={directMessagesState.unreadCount}
                            onOpenMessages={() => handleOpenMessages()}
                            onOpenDirectMessage={(author) => handleOpenMessages(author)}
                            onOpenInsights={openInsightsRoute}
                            visualMode={visualModeState.mode}
                        />
                    ) : null}
                    {!accountOpen && tab === "insights" ? (
                        <InsightsScreen onBackToPeers={openPeersRoute} visualMode={visualModeState.mode}/>
                    ) : null}
                    </Animated.View>
                    {showBottomTabBar ? (
                        <BottomTabBar
                            activeTab={tab}
                            accountOpen={accountOpen}
                            visualMode={visualModeState.mode}
                            onTabPress={handleTabChange}
                        />
                    ) : null}
                    {messagesOpen ? (
                        <DirectMessagesScreen
                            dm={directMessagesState}
                            startTarget={messageStartTarget}
                            onClose={() => {
                                setMessagesOpen(false);
                                setMessageStartTarget(null);
                            }}
                            visualMode={visualModeState.mode}
                        />
                    ) : null}
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
            </SafeAreaProvider>
        </AppErrorBoundary>
    );
}

export default function App() {
    return (
        <AppErrorBoundary>
            <AppContent/>
        </AppErrorBoundary>
    );
}
