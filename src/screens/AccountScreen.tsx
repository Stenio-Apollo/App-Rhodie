import {type ComponentProps, useEffect, useMemo, useRef, useState} from "react";
import {Alert, Linking, Pressable, ScrollView, Text, View,} from "react-native";
import type {Session} from "@supabase/supabase-js";
import {Ionicons} from "@expo/vector-icons";
import tw from "../lib/tw";
import {Button} from "../components/ui/Button";
import {Input} from "../components/ui/Input";
import {fonts} from "../theme/fonts";
import type {Profile} from "../state/useProfile";
import {BirthdayPicker, formatBirthday, parseBirthdayParts} from "../components/BirthdayPicker";
import type {VisualMode} from "../state/useVisualMode";
import {TranslucentCard} from "../components/TranslucentCard";
import {haptics} from "../lib/haptics";
import {ScreenBackground} from "../components/ScreenBackground";
import {
    BACKGROUND_MUSIC_OPTIONS,
    type BackgroundMusicTrackId,
} from "../state/useBackgroundMusic";

type AccountRoute = "account" | "support" | "guide" | "subscription";

const GEORGIA_ACCENT_COLOR = "#DAC8AE";

function AccountRouteEntry({
                               label,
                               icon,
                               active,
                               onPress,
                               activeColor,
                               darkContent = false,
                               whiteContent = false,
                           }: {
    label: string;
    icon: ComponentProps<typeof Ionicons>["name"];
    active: boolean;
    onPress: () => void;
    activeColor?: string;
    darkContent?: boolean;
    whiteContent?: boolean;
}) {
    const badgeColor = "#ba885a";
    const color = active ? activeColor ?? badgeColor : whiteContent ? "#E4E0D4" : darkContent ? "#000000" : "#E4E0D4";

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => {
                haptics.navigation();
                onPress();
            }}
            style={({pressed}) => [
                tw`items-center justify-center px-1 py-0.5`,
                pressed && {transform: [{scale: 0.94}], opacity: 0.85},
            ]}
        >
            <Text
                numberOfLines={1}
                style={[
                    tw`mb-1 text-[10px] font-bold`,
                    {fontFamily: fonts.heading, color},
                ]}
            >
                {label}
            </Text>
            <Ionicons name={icon} size={22} color={color}/>
        </Pressable>
    );
}

interface AccountScreenProps {
    session: Session;
    profile: Profile | null;
    privacyPolicyUrl: string | null;
    termsOfUseUrl: string | null;
    onOpenSubscriptionOffers: () => void;
    subscription: {
        billingConfigured: boolean;
        isSubscribed: boolean;
        trialActive: boolean;
        trialEndsAt: string | null;
        trialDaysRemaining: number;
        activeSubscription: {
            expirationDate: string | null;
            willRenew: boolean;
            productIdentifier: string;
            unsubscribeDetectedAt: string | null;
            billingIssueDetectedAt: string | null;
        } | null;
        restoreBusy: boolean;
        manageBusy: boolean;
        error: string | null;
        restore: () => void;
        openManageSubscriptions: () => Promise<boolean>;
    };
    onClose: () => void;
    onSignOut: () => void;
    onSaveProfile: (payload: {
        full_name: string;
        birthday: string | null;
        avatar_url?: string | null
    }) => Promise<string | null>;
    onDeleteAccount: () => Promise<string | null>;
    onResetOnboarding: () => Promise<void>;
    visualMode: VisualMode;
    backgroundMusic: {
        trackId: BackgroundMusicTrackId;
        setTrackId: (trackId: BackgroundMusicTrackId) => void;
    };
}

function formatDateLabel(value: string | null | undefined): string | null {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function getSubscriptionStatusLabel(props: AccountScreenProps["subscription"]): string {
    if (!props.billingConfigured) return "Billing not configured";
    if (props.trialActive) return "Free trial active";
    if (props.isSubscribed) return "Rhodie Pro active";
    return "No active subscription";
}

function getSubscriptionDetail(props: AccountScreenProps["subscription"]): string {
    if (props.trialActive) {
        const trialEndsLabel = formatDateLabel(props.trialEndsAt);
        return trialEndsLabel
            ? `Full access until ${trialEndsLabel}`
            : `Free access with ${props.trialDaysRemaining} day(s) remaining.`;
    }

    const activeSubscription = props.activeSubscription;
    if (!activeSubscription) {
        return props.billingConfigured
            ? "Your trial has ended and there is no active store subscription on this account."
            : "Store billing is not enabled in this build.";
    }

    const expirationLabel = formatDateLabel(activeSubscription.expirationDate);
    if (!expirationLabel) {
        return activeSubscription.productIdentifier;
    }

    return activeSubscription.willRenew
        ? `Renews ${expirationLabel}`
        : `Access ends ${expirationLabel}`;
}

export function AccountScreen({
                                  session,
                                  profile,
                                  privacyPolicyUrl,
                                  termsOfUseUrl,
                                  onOpenSubscriptionOffers,
                                  subscription,
                                  onClose,
                                  onSignOut,
                                  onSaveProfile,
                                  onDeleteAccount,
                                  onResetOnboarding,
                                  visualMode,
                                  backgroundMusic,
                              }: AccountScreenProps) {
    const mountedRef = useRef(true);
    const [name, setName] = useState(profile?.full_name ?? "");
    const [birthdayMonth, setBirthdayMonth] = useState(parseBirthdayParts(profile?.birthday).month);
    const [birthdayDay, setBirthdayDay] = useState(parseBirthdayParts(profile?.birthday).day);
    const [saveBusy, setSaveBusy] = useState(false);
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [noticeTone, setNoticeTone] = useState<"success" | "error">("success");
    const [route, setRoute] = useState<AccountRoute>("account");
    const [musicDropdownOpen, setMusicDropdownOpen] = useState(false);
    const bg = visualMode === "georgia"
        ? require("../../public/images/rh11.jpg")
        : require("../../public/images/newspaper 1.jpg");
    const georgiaMode = visualMode === "georgia";
    const riverMode = visualMode === "river";
    const sonnyMode = visualMode === "sonny";
    const badgeColor = "#ba885a";
    const themeAccentColor = "#FF3800";
    const themeAccentBorderColor = sonnyMode ? "#CB0000" : "#C82D00";
    const accountButtonDepthStyle = {
        shadowColor: "#000000",
        shadowOffset: {width: 0, height: 5},
        shadowOpacity: 0.24,
        shadowRadius: 8,
        elevation: 6,
    };
    const subscriptionAccentButtonStyle = {
        ...accountButtonDepthStyle,
        backgroundColor: "#DFC4AA",
        borderWidth: 1,
        borderColor: "rgba(223,196,170,0.33)",
    };
    const accentButtonStyle = {
        ...accountButtonDepthStyle,
        backgroundColor: themeAccentColor,
        borderWidth: 1,
        borderColor: themeAccentBorderColor,
    };
    const blackButtonStyle = {
        ...accountButtonDepthStyle,
        backgroundColor: "#111111",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.16)",
    };
    const deleteButtonStyle = {
        ...accountButtonDepthStyle,
        backgroundColor: themeAccentColor,
        borderWidth: 1,
        borderColor: themeAccentBorderColor,
    };
    const lightButtonTextStyle = {color: "#FFF6E8"};
    const darkButtonTextStyle = {color: "#111111"};
    const accountHeaderColorStyle = georgiaMode
            ? {color: GEORGIA_ACCENT_COLOR}
        : riverMode
            ? {color: badgeColor}
            : {color: "#DFC4AA", opacity: 0.7};
    const accountBodyTextStyle = {color: georgiaMode ? "#FFFFFF" : riverMode ? "rgba(17,17,17,0.72)" : "#cbd5e1"};
    const accountMutedTextStyle = {color: georgiaMode ? "#FFFFFF" : riverMode ? "rgba(17,17,17,0.58)" : "#94a3b8"};
    const frostedControlBorderColor = georgiaMode
        ? "rgba(255,255,255,0.22)"
        : riverMode ? "rgba(255,255,255,0.34)" : "rgba(223,196,170,0.24)";
    const frostedControlSurfaceColor = georgiaMode
        ? "rgba(0,0,0,0.24)"
        : riverMode ? "rgba(255,255,255,0.30)" : "rgba(0,0,0,0.22)";
    const frostedDropdownSurfaceColor = georgiaMode
        ? "rgba(0,0,0,0.34)"
        : riverMode ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.32)";
    const frostedControlTextColor = georgiaMode ? "#FFFFFF" : riverMode ? "#111111" : "#E4E0D4";
    const frostedPlaceholderTextColor = georgiaMode ? "rgba(255,255,255,0.48)" : riverMode ? "rgba(17,17,17,0.45)" : "#6b7280";
    const frostedControlStyle = {
        borderColor: frostedControlBorderColor,
        backgroundColor: frostedControlSurfaceColor,
    };
    const profileInputStyle = [
        tw`mt-4 px-4 py-3 opacity-100`,
        frostedControlStyle,
        {color: frostedControlTextColor},
    ];
    const profileEmailInputStyle = [
        tw`mt-3 px-4 py-3 opacity-100`,
        frostedControlStyle,
        {color: frostedControlTextColor},
    ];

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        setName(profile?.full_name ?? "");
        const nextBirthday = parseBirthdayParts(profile?.birthday);
        setBirthdayMonth(nextBirthday.month);
        setBirthdayDay(nextBirthday.day);
    }, [profile?.birthday, profile?.full_name]);

    const supportEmailUrl = useMemo(() => {
        const subject = encodeURIComponent("Rhodie Support");
        const body = encodeURIComponent(
            `Hi Stenio,\n\nI need help with Rhodie.\n\nName: ${profile?.full_name ?? ""}\nEmail: ${session.user.email ?? ""}\nUser ID: ${session.user.id}\n\n`,
        );
        return `mailto:s3.gerlin@gmail.com?subject=${subject}&body=${body}`;
    }, [profile?.full_name, session.user.email, session.user.id]);
    const selectedMusicOption = useMemo(
        () => BACKGROUND_MUSIC_OPTIONS.find((option) => option.id === backgroundMusic.trackId) ?? BACKGROUND_MUSIC_OPTIONS[0],
        [backgroundMusic.trackId],
    );

    async function handleSaveProfile() {
        const birthday = formatBirthday(birthdayMonth, birthdayDay);
        if ((birthdayMonth && !birthdayDay) || (!birthdayMonth && birthdayDay)) {
            setNoticeTone("error");
            setNotice("Pick both a month and a day, or clear the birthday.");
            return;
        }

        setSaveBusy(true);
        setNotice(null);
        const errorMessage = await onSaveProfile({
            full_name: name,
            birthday,
        });

        if (!mountedRef.current) return;
        setSaveBusy(false);
        if (errorMessage) {
            setNoticeTone("error");
            setNotice(errorMessage);
            return;
        }

        setNoticeTone("success");
        setNotice("Account details updated.");
    }

    async function handleOpenSupportEmail() {
        const supported = await Linking.canOpenURL(supportEmailUrl);
        if (!supported) {
            Alert.alert("Email unavailable", "Your device could not open the support email composer.");
            return;
        }
        await Linking.openURL(supportEmailUrl);
    }

    async function handleManageSubscription() {
        const opened = await subscription.openManageSubscriptions();
        if (!opened) {
            Alert.alert("Unavailable", "Subscription settings could not be opened on this device.");
        }
    }

    async function handleOpenExternalUrl(url: string | null, label: "Terms of Use" | "Privacy Policy" | "EULA") {
        if (!url) {
            Alert.alert("Unavailable", `${label} is not configured in this build.`);
            return;
        }
        const supported = await Linking.canOpenURL(url);
        if (!supported) {
            Alert.alert("Unavailable", `${label} could not be opened on this device.`);
            return;
        }
        await Linking.openURL(url);
    }

    async function runDeleteAccount() {
        setDeleteBusy(true);
        setNotice(null);
        const errorMessage = await onDeleteAccount();
        if (!mountedRef.current) return;
        setDeleteBusy(false);
        if (errorMessage) {
            setNoticeTone("error");
            setNotice(errorMessage);
        }
    }

    function confirmDeleteAccount() {
        Alert.alert(
            "Delete account?",
            "This permanently deletes your profile, journal entries, tasks, calendar connection, notification tokens, and sign-in for this account. Your App Store subscription is managed separately and may need to be cancelled there first.",
            [
                {text: "Cancel", style: "cancel"},
                {
                    text: "Delete account",
                    style: "destructive",
                    onPress: () => {
                        void runDeleteAccount();
                    },
                },
            ],
        );
    }

    function confirmResetOnboarding() {
        Alert.alert(
            "Replay onboarding?",
            "This will show the onboarding flow and tutorial cards again on this device.",
            [
                {text: "Cancel", style: "cancel"},
                {
                    text: "Replay",
                    onPress: () => {
                        void onResetOnboarding();
                    },
                },
            ],
        );
    }

    function confirmSignOut() {
        Alert.alert(
            "Sign out?",
            "Are you sure you want to sign out of Rhodie?",
            [
                {text: "Cancel", style: "cancel"},
                {
                    text: "Sign out",
                    style: "destructive",
                    onPress: onSignOut,
                },
            ],
        );
    }

    const subscriptionWarning = subscription.activeSubscription?.billingIssueDetectedAt
        ? "There is a billing issue on this subscription."
        : subscription.activeSubscription?.unsubscribeDetectedAt
            ? "This subscription is set to end unless it is renewed."
            : null;

    return (
        <ScreenBackground visualMode={visualMode} source={bg}>
            <View
                style={[
                    tw`flex-1`,
                    {paddingHorizontal: 1},
                ]}
            >
                <View style={tw`absolute right-3 top-16 z-20 items-center gap-5`}>
                    <AccountRouteEntry
                        label="Support"
                        icon="mail-outline"
                        active={route === "support"}
                        onPress={() => setRoute("support")}
                        activeColor={georgiaMode ? GEORGIA_ACCENT_COLOR : undefined}
                        darkContent={riverMode || georgiaMode}
                        whiteContent={georgiaMode}
                    />
                    <AccountRouteEntry
                        label="Replay"
                        icon="refresh-circle-outline"
                        active={route === "guide"}
                        onPress={() => setRoute("guide")}
                        activeColor={georgiaMode ? GEORGIA_ACCENT_COLOR : undefined}
                        darkContent={riverMode || georgiaMode}
                        whiteContent={georgiaMode}
                    />
                    <AccountRouteEntry
                        label="Subscription"
                        icon="card-outline"
                        active={route === "subscription"}
                        onPress={() => setRoute("subscription")}
                        activeColor={georgiaMode ? GEORGIA_ACCENT_COLOR : undefined}
                        darkContent={riverMode || georgiaMode}
                        whiteContent={georgiaMode}
                    />
                </View>
                {route !== "account" ? (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Close account route"
                        onPress={() => {
                            haptics.navigation();
                            setRoute("account");
                        }}
                        hitSlop={10}
                        style={({pressed}) => [
                            tw`absolute right-4 top-2 z-30 h-9 w-9 items-center justify-center`,
                            pressed && {opacity: 0.6, transform: [{translateY: 1}]},
                        ]}
                    >
                        <Ionicons name="close" size={18} color={georgiaMode ? "#FFFFFF" : riverMode ? "#111111" : "#E4E0D4"}/>
                    </Pressable>
                ) : null}
                <ScrollView
                    style={tw`flex-1`}
                    contentContainerStyle={tw`pl-4 pr-20 pb-32 pt-4 gap-4`}
                    showsVerticalScrollIndicator={false}
                >
                    {route === "account" ? (
                        <>
                            <TranslucentCard radius={24} style={tw`p-4`}>
                                <Text style={[tw`text-sm`, {fontFamily: fonts.heading, ...accountHeaderColorStyle}]}>Background
                                    music</Text>
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel="Select background music"
                                    accessibilityState={{expanded: musicDropdownOpen}}
                                    onPress={() => {
                                        haptics.selection();
                                        setMusicDropdownOpen((current) => !current);
                                    }}
                                    style={({pressed}) => [
                                        tw`mt-3 flex-row items-center justify-between rounded-xl border px-4 py-3`,
                                        frostedControlStyle,
                                        pressed && {opacity: 0.78, transform: [{translateY: 1}]},
                                    ]}
                                >
                                    <Text
                                        style={[
                                            tw`text-sm font-semibold`,
                                            {
                                                fontFamily: fonts.body,
                                                color: frostedControlTextColor,
                                            },
                                        ]}
                                    >
                                        {selectedMusicOption.label}
                                    </Text>
                                    <Ionicons
                                        name={musicDropdownOpen ? "chevron-up" : "chevron-down"}
                                        size={18}
                                        color={frostedControlTextColor}
                                    />
                                </Pressable>
                                {musicDropdownOpen ? (
                                    <View
                                        style={[
                                            tw`mt-2 overflow-hidden rounded-xl border`,
                                            {
                                                borderColor: frostedControlBorderColor,
                                                backgroundColor: frostedDropdownSurfaceColor,
                                            },
                                        ]}
                                    >
                                        {BACKGROUND_MUSIC_OPTIONS.map((option) => {
                                            const active = backgroundMusic.trackId === option.id;
                                            return (
                                                <Pressable
                                                    key={option.id}
                                                    accessibilityRole="button"
                                                    accessibilityState={{selected: active}}
                                                    onPress={() => {
                                                        haptics.selection();
                                                        backgroundMusic.setTrackId(option.id);
                                                        setMusicDropdownOpen(false);
                                                    }}
                                                    style={({pressed}) => [
                                                        tw`flex-row items-center justify-between px-4 py-3`,
                                                        active ? {backgroundColor: georgiaMode ? GEORGIA_ACCENT_COLOR : badgeColor} : null,
                                                        pressed && {opacity: 0.78},
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            tw`text-sm font-semibold`,
                                                            {
                                                                fontFamily: fonts.body,
                                                                color: active ? "#111111" : frostedControlTextColor,
                                                            },
                                                        ]}
                                                    >
                                                        {option.label}
                                                    </Text>
                                                    {active ? (
                                                        <Ionicons name="checkmark" size={17} color="#111111"/>
                                                    ) : null}
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                ) : null}
                            </TranslucentCard>

                            <TranslucentCard radius={24} style={tw`p-4`}>
                                <View>
                                    <Text style={[tw`text-2xl`, {
                                        fontFamily: fonts.heading,
                                        ...accountHeaderColorStyle,
                                    }]}>Account</Text>
                                    <Text style={[tw`mt-2 text-sm`, {fontFamily: fonts.body, ...accountBodyTextStyle}]}>
                                        Manage your Rhodie profile and account security from one place.
                                    </Text>
                                </View>
                            </TranslucentCard>

                            <TranslucentCard radius={24} style={tw`p-4`}>
                                <Text
                                    style={[tw`text-sm`, {fontFamily: fonts.heading, ...accountHeaderColorStyle}]}>Profile</Text>
                                <Text style={[tw`mt-1 text-xs`, {fontFamily: fonts.body, ...accountMutedTextStyle}]}>Update the
                                    name and
                                    birthday used across the app.</Text>

                                <Input
                                    placeholder="Your name"
                                    value={name}
                                    onChangeText={setName}
                                    placeholderTextColor={frostedPlaceholderTextColor}
                                    keyboardAppearance={visualMode === "river" ? "light" : "dark"}
                                    style={profileInputStyle}
                                />

                                <Input
                                    placeholder="Email"
                                    value={session.user.email ?? "No email on file"}
                                    editable={false}
                                    placeholderTextColor={frostedPlaceholderTextColor}
                                    keyboardAppearance={visualMode === "river" ? "light" : "dark"}
                                    style={profileEmailInputStyle}
                                />

                                <View
                                    style={[
                                        tw`mt-3 rounded-xl border px-4 py-3`,
                                        frostedControlStyle,
                                    ]}
                                >
                                    <BirthdayPicker
                                        month={birthdayMonth}
                                        day={birthdayDay}
                                        onChange={({month, day}) => {
                                            setBirthdayMonth(month);
                                            setBirthdayDay(day);
                                        }}
                                        placeholder="Optional birthday"
                                        showClear
                                        clearTextColor={georgiaMode ? GEORGIA_ACCENT_COLOR : undefined}
                                        pickerBackgroundClass={georgiaMode ? "bg-black/20" : riverMode ? "bg-white/30" : "bg-black/47"}
                                        lightMode={riverMode}
                                        georgiaMode={georgiaMode}
                                        sonnyMode={sonnyMode}

                                    />
                                </View>

                                <View style={tw`mt-4 flex-row justify-end`}>
                                    <Button
                                        label={saveBusy ? "Saving..." : "Save changes"}
                                        onPress={() => {
                                            void handleSaveProfile();
                                        }}
                                        variant="outlineAccent"
                                        disabled={saveBusy}
                                        shine
                                        style={[tw`rounded-xl px-3 py-1.5`, accentButtonStyle]}
                                        textStyle={[tw`text-[10px]`, lightButtonTextStyle]}
                                    />
                                </View>

                                {notice ? (
                                    <Text style={[tw`mt-3 text-xs`, {
                                        fontFamily: fonts.body,
                                        color: noticeTone === "success" ? "#86efac" : "#fca5a5",
                                    }]}>
                                        {notice}
                                    </Text>
                                ) : null}
                            </TranslucentCard>

                            <TranslucentCard radius={24} style={tw`p-4`}>
                                <Text style={[tw`text-sm`, {fontFamily: fonts.heading, ...accountHeaderColorStyle}]}>Account
                                    security</Text>
                                <Text style={[tw`mt-1 text-sm`, {fontFamily: fonts.body, ...accountBodyTextStyle}]}>Deleting your
                                    account
                                    is permanent. It removes your app data, but store subscriptions still need to be
                                    managed in
                                    the App Store if they are active.</Text>
                                <View style={tw`mt-4 flex-row flex-wrap gap-2`}>
                                    <Button
                                        label="Sign out"
                                        onPress={confirmSignOut}
                                        variant="secondary"
                                        shine
                                        style={blackButtonStyle}
                                        textStyle={lightButtonTextStyle}
                                    />
                                    <Button
                                        label={deleteBusy ? "Deleting..." : "Delete account"}
                                        onPress={confirmDeleteAccount}
                                        variant="danger"
                                        disabled={deleteBusy}
                                        shine
                                        style={deleteButtonStyle}
                                        textStyle={lightButtonTextStyle}
                                    />
                                </View>
                            </TranslucentCard>
                        </>
                    ) : null}

                    {route === "support" ? (
                        <TranslucentCard radius={24} style={tw`p-4`}>
                            <Text style={[tw`text-sm`, {fontFamily: fonts.heading, ...accountHeaderColorStyle}]}>Support</Text>
                            <Text style={[tw`mt-1 text-sm`, {fontFamily: fonts.body, ...accountBodyTextStyle}]}>Need help with
                                billing, syncing, or your account? Reach out directly and we’ll open your email
                                app.</Text>
                            <Text
                                style={[tw`mt-3 text-xs`, {fontFamily: fonts.body, ...accountMutedTextStyle}]}>s3.gerlin@gmail.com</Text>
                            <View style={tw`mt-4 flex-row justify-end`}>
                                <Button
                                    label="Email support"
                                    onPress={() => {
                                        void handleOpenSupportEmail();
                                    }}
                                    variant="outlineAccent"
                                    shine
                                    style={[tw`rounded-xl px-3 py-1.5`, accentButtonStyle]}
                                    textStyle={[tw`text-[10px]`, lightButtonTextStyle]}
                                />
                            </View>
                        </TranslucentCard>
                    ) : null}

                    {route === "guide" ? (
                        <TranslucentCard radius={24} style={tw`p-4`}>
                            <Text style={[tw`text-sm`, {fontFamily: fonts.heading, ...accountHeaderColorStyle}]}>App guide</Text>
                            <Text style={[tw`mt-1 text-sm`, {fontFamily: fonts.body, ...accountBodyTextStyle}]}>
                                Replay the first-run onboarding and restore the in-app tutorial cards.
                            </Text>
                            <View style={tw`mt-4 flex-row justify-end`}>
                                <Button
                                    label="Replay guide"
                                    onPress={confirmResetOnboarding}
                                    variant="outlineAccent"
                                    shine
                                    style={[tw`rounded-xl px-3 py-1.5`, accentButtonStyle]}
                                    textStyle={[tw`text-[10px]`, lightButtonTextStyle]}
                                />
                            </View>
                        </TranslucentCard>
                    ) : null}

                    {route === "subscription" ? (
                        <TranslucentCard radius={24} style={tw`p-4`}>
                            <Text
                                style={[tw`text-sm`, {fontFamily: fonts.heading, ...accountHeaderColorStyle}]}>Subscription</Text>
                            <Text style={[tw`mt-1 text-xs`, {fontFamily: fonts.body, ...accountMutedTextStyle}]}>View your current
                                billing state and manage the store subscription.</Text>

                            <TranslucentCard radius={16} style={tw`mt-4 px-4 py-3`}>
                                <Text style={[tw`text-xs`, {fontFamily: fonts.body, ...accountHeaderColorStyle}]}>Status</Text>
                                <Text style={[tw`mt-1 text-lg`, {fontFamily: fonts.heading, color: georgiaMode ? GEORGIA_ACCENT_COLOR : riverMode ? "#111111" : "#E4E0D4"}]}>
                                    {getSubscriptionStatusLabel(subscription)}
                                </Text>
                                <Text style={[tw`mt-2 text-sm`, {fontFamily: fonts.body, ...accountBodyTextStyle}]}>
                                    {getSubscriptionDetail(subscription)}
                                </Text>
                                {subscriptionWarning ? (
                                    <Text style={[tw`mt-3 text-xs text-orange-200`, {fontFamily: fonts.body}]}>
                                        {subscriptionWarning}
                                    </Text>
                                ) : null}
                                {subscription.error ? (
                                    <Text style={[tw`mt-3 text-xs text-rose-300`, {fontFamily: fonts.body}]}>
                                        {subscription.error}
                                    </Text>
                                ) : null}
                            </TranslucentCard>

                            <View style={tw`mt-4 flex-row flex-wrap justify-center gap-2`}>
                                <Button
                                    label="Plans"
                                    onPress={onOpenSubscriptionOffers}
                                    variant="secondary"
                                    shine
                                    style={[tw`rounded-xl px-4 py-2`, subscriptionAccentButtonStyle]}
                                    textStyle={[tw`text-xs`, darkButtonTextStyle]}
                                />
                                <Button
                                    label="Manage"
                                    onPress={() => {
                                        void handleManageSubscription();
                                    }}
                                    variant="outlineAccent"
                                    disabled={subscription.manageBusy}
                                    shine
                                    style={[tw`rounded-xl px-4 py-2`, subscriptionAccentButtonStyle]}
                                    textStyle={[tw`text-xs`, darkButtonTextStyle]}
                                />
                                <Button
                                    label={subscription.restoreBusy ? "Restoring..." : "Restore"}
                                    onPress={subscription.restore}
                                    variant="secondary"
                                    disabled={subscription.restoreBusy}
                                    shine
                                    style={[tw`rounded-xl px-4 py-2`, accentButtonStyle]}
                                    textStyle={[tw`text-xs`, lightButtonTextStyle]}
                                />
                            </View>
                            <Text style={[tw`mt-4 text-xs`, {fontFamily: fonts.body, ...accountMutedTextStyle}]}>
                                By continuing, you agree to the{" "}
                                <Text
                                    onPress={() => {
                                        void handleOpenExternalUrl(termsOfUseUrl, "Terms of Use");
                                    }}
                                    style={{color: themeAccentColor}}
                                >
                                    Terms of Use
                                </Text>
                                {" "}(
                                <Text
                                    onPress={() => {
                                        void handleOpenExternalUrl(termsOfUseUrl, "EULA");
                                    }}
                                    style={{color: themeAccentColor}}
                                >
                                    EULA
                                </Text>
                                )
                                {" "}and{" "}
                                <Text
                                    onPress={() => {
                                        void handleOpenExternalUrl(privacyPolicyUrl, "Privacy Policy");
                                    }}
                                    style={{color: themeAccentColor}}
                                >
                                    Privacy Policy
                                </Text>
                                .
                            </Text>
                        </TranslucentCard>
                    ) : null}
                </ScrollView>
            </View>
        </ScreenBackground>
    );
}
