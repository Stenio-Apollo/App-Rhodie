import {useEffect, useMemo, useRef, useState} from "react";
import {Alert, ImageBackground, Linking, ScrollView, Text, View,} from "react-native";
import type {Session} from "@supabase/supabase-js";
import tw from "../lib/tw";
import {Button} from "../components/ui/Button";
import {Input} from "../components/ui/Input";
import {fonts} from "../theme/fonts";
import type {Profile} from "../state/useProfile";
import {haptics} from "../lib/haptics";
import {BirthdayPicker, formatBirthday, parseBirthdayParts} from "../components/BirthdayPicker";

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
    onSaveProfile: (payload: { full_name: string; birthday: string | null }) => Promise<string | null>;
    onDeleteAccount: () => Promise<string | null>;
    onResetOnboarding: () => Promise<void>;
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
                              }: AccountScreenProps) {
    const mountedRef = useRef(true);
    const [name, setName] = useState(profile?.full_name ?? "");
    const [birthdayMonth, setBirthdayMonth] = useState(parseBirthdayParts(profile?.birthday).month);
    const [birthdayDay, setBirthdayDay] = useState(parseBirthdayParts(profile?.birthday).day);
    const [saveBusy, setSaveBusy] = useState(false);
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [noticeTone, setNoticeTone] = useState<"success" | "error">("success");
    const bg = require("../../public/images/rh11.jpg");

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

    const subscriptionWarning = subscription.activeSubscription?.billingIssueDetectedAt
        ? "There is a billing issue on this subscription."
        : subscription.activeSubscription?.unsubscribeDetectedAt
            ? "This subscription is set to end unless it is renewed."
            : null;

    return (
        <ImageBackground source={bg} style={tw`flex-1`} imageStyle={tw`opacity-60`}>
            <View style={[tw`flex-1 bg-black/35`, {paddingHorizontal: 1}]}>
                <ScrollView
                    style={tw`flex-1`}
                    contentContainerStyle={tw`px-4 pb-32 pt-4 gap-4`}
                    showsVerticalScrollIndicator={false}
                >
                    <View
                        style={tw`flex-row items-start justify-between rounded-3xl border border-[#2c2c2c] bg-black/30 p-4`}>
                        <View style={tw`flex-1 pr-4`}>
                            <Text style={[tw`text-2xl`, {fontFamily: fonts.heading, color: "#E4E0D4"}]}>Account</Text>
                            <Text style={[tw`mt-2 text-sm text-slate-300`, {fontFamily: fonts.body}]}>
                                Manage your Rhodie profile, subscription, and support from one place.
                            </Text>
                        </View>
                        <Button label="Done" onPress={onClose} variant="outlineAccent"/>
                    </View>

                    <View style={tw`rounded-3xl border border-[#2c2c2c] bg-black/45 p-4`}>
                        <Text style={[tw`text-sm`, {fontFamily: fonts.heading, color: "#E4E0D4"}]}>Profile</Text>
                        <Text style={[tw`mt-1 text-xs text-slate-400`, {fontFamily: fonts.body}]}>Update the name and
                            birthday used across the app.</Text>

                        <Input
                            placeholder="Your name"
                            value={name}
                            onChangeText={setName}
                            style={tw`mt-4 px-4 py-3`}
                        />

                        <Input
                            placeholder="Email"
                            value={session.user.email ?? "No email on file"}
                            editable={false}
                            style={tw`mt-3 px-4 py-3 opacity-75`}
                        />

                        <View style={tw`mt-3 rounded-xl border border-[#2c2c2c] bg-[#0f0f0f] px-4 py-3`}>
                            <BirthdayPicker
                                month={birthdayMonth}
                                day={birthdayDay}
                                onChange={({month, day}) => {
                                    setBirthdayMonth(month);
                                    setBirthdayDay(day);
                                }}
                                placeholder="Optional birthday"
                                showClear
                                pickerBackgroundClass="bg-black/20"
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
                    </View>

                    <View style={tw`rounded-3xl border border-[#B55941] bg-black/45 p-4`}>
                        <Text style={[tw`text-sm`, {fontFamily: fonts.heading, color: "#E4E0D4"}]}>Subscription</Text>
                        <Text style={[tw`mt-1 text-xs text-slate-400`, {fontFamily: fonts.body}]}>View your current
                            billing state and manage the store subscription.</Text>

                        <View style={tw`mt-4 rounded-2xl border border-[#2c2c2c] bg-black/45 px-4 py-3`}>
                            <Text style={[tw`text-xs text-slate-400`, {fontFamily: fonts.body}]}>Status</Text>
                            <Text style={[tw`mt-1 text-lg`, {fontFamily: fonts.heading, color: "#E4E0D4"}]}>
                                {getSubscriptionStatusLabel(subscription)}
                            </Text>
                            <Text style={[tw`mt-2 text-sm text-slate-300`, {fontFamily: fonts.body}]}>
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
                        </View>

                        <View style={tw`mt-4 flex-row flex-wrap gap-2`}>
                            <Button
                                label="View plans"
                                onPress={onOpenSubscriptionOffers}
                                variant="secondary"
                            />
                            <Button label="Manage subscription" onPress={() => {
                                void handleManageSubscription();
                            }} variant="outlineAccent" disabled={subscription.manageBusy}/>
                            <Button
                                label={subscription.restoreBusy ? "Restoring..." : "Restore purchases"}
                                onPress={subscription.restore}
                                variant="secondary"
                                disabled={subscription.restoreBusy}
                            />
                        </View>
                        <Text style={[tw`mt-4 text-xs text-slate-400`, {fontFamily: fonts.body}]}>
                            By continuing, you agree to the{" "}
                            <Text
                                onPress={() => {
                                    void handleOpenExternalUrl(termsOfUseUrl, "Terms of Use");
                                }}
                                style={{color: "#B55941"}}
                            >
                                Terms of Use
                            </Text>
                            {" "}(
                            <Text
                                onPress={() => {
                                    void handleOpenExternalUrl(termsOfUseUrl, "EULA");
                                }}
                                style={{color: "#B55941"}}
                            >
                                EULA
                            </Text>
                            )
                            {" "}and{" "}
                            <Text
                                onPress={() => {
                                    void handleOpenExternalUrl(privacyPolicyUrl, "Privacy Policy");
                                }}
                                style={{color: "#B55941"}}
                            >
                                Privacy Policy
                            </Text>
                            .
                        </Text>
                    </View>

                    <View style={tw`rounded-3xl border border-[#2c2c2c] bg-black/45 p-4`}>
                        <Text style={[tw`text-sm`, {fontFamily: fonts.heading, color: "#E4E0D4"}]}>Support</Text>
                        <Text style={[tw`mt-1 text-sm text-slate-300`, {fontFamily: fonts.body}]}>Need help with
                            billing, syncing, or your account? Reach out directly and we’ll open your email app.</Text>
                        <Text
                            style={[tw`mt-3 text-xs text-slate-400`, {fontFamily: fonts.body}]}>s3.gerlin@gmail.com</Text>
                        <View style={tw`mt-4 flex-row justify-end`}>
                            <Button label="Email support" onPress={() => {
                                void handleOpenSupportEmail();
                            }} variant="outlineAccent"/>
                        </View>
                    </View>

                    <View style={tw`rounded-3xl border border-[#2c2c2c] bg-black/45 p-4`}>
                        <Text style={[tw`text-sm`, {fontFamily: fonts.heading, color: "#E4E0D4"}]}>App guide</Text>
                        <Text style={[tw`mt-1 text-sm text-slate-300`, {fontFamily: fonts.body}]}>
                            Replay the first-run onboarding and restore the in-app tutorial cards.
                        </Text>
                        <View style={tw`mt-4 flex-row justify-end`}>
                            <Button label="Replay guide" onPress={confirmResetOnboarding} variant="outlineAccent"/>
                        </View>
                    </View>

                    <View style={tw`rounded-3xl border border-[#7f1d1d] bg-black/45 p-4`}>
                        <Text style={[tw`text-sm`, {fontFamily: fonts.heading, color: "#E4E0D4"}]}>Account
                            security</Text>
                        <Text style={[tw`mt-1 text-sm text-slate-300`, {fontFamily: fonts.body}]}>Deleting your account
                            is permanent. It removes your app data, but store subscriptions still need to be managed in
                            the App Store if they are active.</Text>
                        <View style={tw`mt-4 flex-row flex-wrap gap-2`}>
                            <Button label="Sign out" onPress={onSignOut} variant="secondary"/>
                            <Button
                                label={deleteBusy ? "Deleting..." : "Delete account"}
                                onPress={confirmDeleteAccount}
                                variant="danger"
                                disabled={deleteBusy}
                            />
                        </View>
                    </View>
                </ScrollView>
            </View>
        </ImageBackground>
    );
}
