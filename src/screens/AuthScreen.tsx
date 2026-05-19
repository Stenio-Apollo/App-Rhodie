import {useEffect, useMemo, useState} from "react";
import {ImageBackground, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View} from "react-native";
import {Input} from "../components/ui/Input";
import {fonts} from "../theme/fonts";
import tw from "../lib/tw";
import {useSupabaseAuth} from "../state/useSupabaseAuth";
import {supabase} from "../lib/supabase";

const MONTH_OPTIONS = [
    {value: "01", label: "Jan"},
    {value: "02", label: "Feb"},
    {value: "03", label: "Mar"},
    {value: "04", label: "Apr"},
    {value: "05", label: "May"},
    {value: "06", label: "Jun"},
    {value: "07", label: "Jul"},
    {value: "08", label: "Aug"},
    {value: "09", label: "Sep"},
    {value: "10", label: "Oct"},
    {value: "11", label: "Nov"},
    {value: "12", label: "Dec"},
] as const;

const DAY_OPTIONS = Array.from({length: 31}, (_, index) => `${index + 1}`.padStart(2, "0"));
type AuthMode = "signIn" | "create";

function daysInMonth(month: string): number {
    return new Date(2000, Number(month), 0).getDate();
}

function formatBirthday(month: string, day: string): string | null {
    if (!month || !day) return null;
    return `2000-${month}-${day}`;
}

function birthdayLabel(month: string, day: string): string {
    if (!month || !day) return "Select birthday";
    const monthLabel = MONTH_OPTIONS.find((option) => option.value === month)?.label ?? month;
    return `${monthLabel} ${Number(day)}`;
}

export function AuthScreen() {
    const {signInMagicLink, verifyEmailOtp} = useSupabaseAuth();
    const [mode, setMode] = useState<AuthMode>("signIn");
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [birthdayMonth, setBirthdayMonth] = useState("");
    const [birthdayDay, setBirthdayDay] = useState("");
    const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
    const [code, setCode] = useState("");
    const [sent, setSent] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const bg = require("../../public/images/rh13.jpg");

    useEffect(() => {
        if (!birthdayMonth) {
            if (birthdayDay) {
                setBirthdayDay("");
            }
            return;
        }
        const maxDays = daysInMonth(birthdayMonth);
        if (Number(birthdayDay) > maxDays) {
            setBirthdayDay(`${maxDays}`.padStart(2, "0"));
        }
    }, [birthdayDay, birthdayMonth]);

    const birthday = formatBirthday(birthdayMonth, birthdayDay);
    const visibleDayOptions = birthdayMonth ? DAY_OPTIONS.slice(0, daysInMonth(birthdayMonth)) : [];
    const title = mode === "signIn" ? "Sign in" : "Create account";
    const subtitle = mode === "signIn"
        ? "Enter your email to receive a login code."
        : "Create your Rhodie account with a login code.";

    const segmentedContainerStyle = useMemo(
        () => [tw`mt-4 rounded-xl border border-[#2c2c2c] bg-black/50 p-0.5 flex-row`],
        [],
    );

    async function upsertProfile(userId: string): Promise<{ error: { message: string } | null; skipped: boolean }> {
        if (!name.trim() && !birthday) return {error: null, skipped: false};
        const {data: sessionData} = await supabase.auth.getSession();
        const activeSessionUserId = sessionData.session?.user.id ?? null;
        if (!activeSessionUserId || activeSessionUserId !== userId) {
            return {error: null, skipped: true};
        }
        const {error: profileError} = await supabase.from("profiles").upsert({
            id: userId,
            full_name: name.trim() || null,
            birthday,
        });
        return {error: profileError ? {message: profileError.message} : null, skipped: false};
    }

    async function handleSendCode() {
        setLoading(true);
        setError(null);
        setMessage(null);
        const sendError = await signInMagicLink(email.trim());
        setLoading(false);
        if (sendError) {
            setError(sendError.message);
            return;
        }
        setSent(true);
        setMessage("Check your email for the login code.");
    }

    async function handleVerify() {
        setLoading(true);
        setError(null);
        setMessage(null);
        const {error: verifyError, userId} = await verifyEmailOtp(email.trim(), code.trim());
        if (verifyError) {
            setLoading(false);
            setError(verifyError.message);
            return;
        }

        if (userId && mode === "create") {
            const {error: profileError, skipped} = await upsertProfile(userId);
            if (profileError) {
                setLoading(false);
                setError(profileError.message);
                return;
            }
            if (skipped) {
                setLoading(false);
                setMessage("Account confirmed. Sign in once to finish profile setup.");
                return;
            }
        }
        setLoading(false);
    }

    return (
        <ImageBackground source={bg} style={tw`flex-1`} imageStyle={tw`opacity-55`}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={[tw`flex-1 bg-black/20`, {paddingHorizontal: 1}]}
            >
                <ScrollView contentContainerStyle={tw`flex-grow justify-center px-6 py-10`} keyboardShouldPersistTaps="handled">
                    <Text style={[tw`text-center text-2xl`, {fontFamily: fonts.heading, color: "#E4E0D4"}]}>{title}</Text>
                    <Text style={[tw`mt-2 text-center text-sm text-slate-300`, {fontFamily: fonts.body}]}>
                        {subtitle}
                    </Text>

                    <View style={segmentedContainerStyle}>
                        <Pressable
                            onPress={() => {
                                setMode("signIn");
                                setSent(false);
                                setCode("");
                                setError(null);
                                setMessage(null);
                            }}
                            style={({pressed}) => [
                                tw`flex-1 rounded-lg px-2 py-2`,
                                mode === "signIn" ? {backgroundColor: "rgba(251,247,243,0.14)"} : null,
                                pressed && tw`opacity-90`,
                            ]}
                        >
                            <Text style={[tw`text-center text-xs text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>Sign in</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => {
                                setMode("create");
                                setSent(false);
                                setCode("");
                                setError(null);
                                setMessage(null);
                            }}
                            style={({pressed}) => [
                                tw`flex-1 rounded-lg px-2 py-2`,
                                mode === "create" ? {backgroundColor: "rgba(251,247,243,0.14)"} : null,
                                pressed && tw`opacity-90`,
                            ]}
                        >
                            <Text style={[tw`text-center text-xs text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>Create</Text>
                        </Pressable>
                    </View>

                    {mode === "create" ? (
                        <>
                            <Input placeholder="Your name" value={name} onChangeText={setName} style={tw`mt-4 px-4 py-3`}/>
                            <View style={tw`mt-3 rounded-xl border border-[#2c2c2c] bg-[#0f0f0f]/70 px-4 py-3`}>
                                <Text style={[tw`text-xs text-slate-400`, {fontFamily: fonts.body}]}>Birthday</Text>
                                <Pressable
                                    onPress={() => setShowBirthdayPicker((current) => !current)}
                                    style={({pressed}) => [tw`mt-2 rounded-lg border border-[#2c2c2c] px-3 py-3`, pressed && tw`opacity-90`]}
                                >
                                    <Text style={[tw`text-sm`, {fontFamily: fonts.body, color: "#fbf7f3"}]}>
                                        {birthdayLabel(birthdayMonth, birthdayDay)}
                                    </Text>
                                </Pressable>
                                {showBirthdayPicker ? (
                                    <View style={tw`mt-3 flex-row gap-3`}>
                                        <View style={tw`flex-1 rounded-lg border border-[#2c2c2c] bg-black/70`}>
                                            <Text style={[tw`px-3 pt-3 text-[11px] text-slate-400`, {fontFamily: fonts.body}]}>Month</Text>
                                            <ScrollView style={tw`max-h-40`} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                                                {MONTH_OPTIONS.map((option) => {
                                                    const active = option.value === birthdayMonth;
                                                    return (
                                                        <Pressable
                                                            key={option.value}
                                                            onPress={() => setBirthdayMonth(option.value)}
                                                            style={({pressed}) => [
                                                                tw`px-3 py-3`,
                                                                active ? {backgroundColor: "rgba(251,247,243,0.12)"} : null,
                                                                pressed && tw`opacity-90`,
                                                            ]}
                                                        >
                                                            <Text style={[tw`text-sm`, {fontFamily: fonts.body, color: active ? "#fbf7f3" : "#94a3b8"}]}>
                                                                {option.label}
                                                            </Text>
                                                        </Pressable>
                                                    );
                                                })}
                                            </ScrollView>
                                        </View>
                                        <View style={tw`flex-1 rounded-lg border border-[#2c2c2c] bg-black/70`}>
                                            <Text style={[tw`px-3 pt-3 text-[11px] text-slate-400`, {fontFamily: fonts.body}]}>Day</Text>
                                            <ScrollView style={tw`max-h-40`} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                                                {birthdayMonth ? visibleDayOptions.map((option) => {
                                                    const active = option === birthdayDay;
                                                    return (
                                                        <Pressable
                                                            key={option}
                                                            onPress={() => setBirthdayDay(option)}
                                                            style={({pressed}) => [
                                                                tw`px-3 py-3`,
                                                                active ? {backgroundColor: "rgba(251,247,243,0.12)"} : null,
                                                                pressed && tw`opacity-90`,
                                                            ]}
                                                        >
                                                            <Text style={[tw`text-sm`, {fontFamily: fonts.body, color: active ? "#fbf7f3" : "#94a3b8"}]}>
                                                                {Number(option)}
                                                            </Text>
                                                        </Pressable>
                                                    );
                                                }) : (
                                                    <Text style={[tw`px-3 py-3 text-sm text-slate-500`, {fontFamily: fonts.body}]}>Pick a month first</Text>
                                                )}
                                            </ScrollView>
                                        </View>
                                    </View>
                                ) : null}
                            </View>
                        </>
                    ) : null}

                    <Input
                        placeholder="you@example.com"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        style={tw`mt-4 px-4 py-3`}
                    />

                    <Pressable
                        disabled={loading || email.trim().length === 0}
                        onPress={() => void handleSendCode()}
                        style={({pressed}) => [
                            tw`mt-4 rounded-lg px-3.5 py-3`,
                            {backgroundColor: "#B55941"},
                            (loading || email.trim().length === 0) && tw`opacity-50`,
                            pressed && email.trim().length > 0 ? tw`opacity-90` : null,
                        ]}
                    >
                        <Text style={[tw`text-center text-sm text-[#E4E0D4]`, {fontFamily: fonts.button}]}>
                            {loading && !sent ? "Sending..." : sent ? "Code sent" : "Send code"}
                        </Text>
                    </Pressable>

                    {sent ? (
                        <>
                            <Input
                                placeholder="6-digit code"
                                value={code}
                                onChangeText={setCode}
                                keyboardType="number-pad"
                                style={tw`mt-4 px-4 py-3`}
                            />
                            <Pressable
                                disabled={loading || code.trim().length === 0}
                                onPress={() => void handleVerify()}
                                style={({pressed}) => [
                                    tw`mt-3 rounded-lg px-3.5 py-3`,
                                    {backgroundColor: "#B55941"},
                                    (loading || code.trim().length === 0) && tw`opacity-50`,
                                    pressed && code.trim().length > 0 ? tw`opacity-90` : null,
                                ]}
                            >
                                <Text style={[tw`text-center text-sm text-[#E4E0D4]`, {fontFamily: fonts.button}]}>
                                    {loading ? "Verifying..." : "Verify code"}
                                </Text>
                            </Pressable>
                        </>
                    ) : null}

                    {error ? (
                        <Text style={[tw`mt-3 text-center text-sm text-rose-400`, {fontFamily: fonts.body}]}>{error}</Text>
                    ) : null}
                    {message ? (
                        <Text style={[tw`mt-3 text-center text-sm text-emerald-400`, {fontFamily: fonts.body}]}>{message}</Text>
                    ) : null}
                </ScrollView>
            </KeyboardAvoidingView>
        </ImageBackground>
    );
}
