import {useEffect, useState} from "react";
import {KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View} from "react-native";
import {Button} from "../components/ui/Button";
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

    useEffect(() => {
        setError(null);
        setMessage(null);
        setSent(false);
        setCode("");
    }, []);

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

    async function upsertProfile(userId: string) {
        if (!name.trim() && !birthday) return null;
        const {error: profileError} = await supabase.from("profiles").upsert({
            id: userId,
            full_name: name.trim() || null,
            birthday,
        });
        return profileError;
    }

    async function handleSendCode() {
        setLoading(true);
        setError(null);
        setMessage(null);
        const err = await signInMagicLink(email.trim());
        setLoading(false);
        if (err) {
            setError(err.message);
            return;
        }
        setSent(true);
        setMessage("Check your email for the login code.");
    }

    async function handleVerify() {
        setLoading(true);
        setError(null);
        setMessage(null);
        const {error: err, userId} = await verifyEmailOtp(email.trim(), code.trim());
        if (err) {
            setError(err.message);
            setLoading(false);
            return;
        }
        if (userId) {
            const profileError = await upsertProfile(userId);
            if (profileError) {
                setError(profileError.message);
            }
        }
        setLoading(false);
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={tw`flex-1 bg-black`}>
            <ScrollView contentContainerStyle={tw`flex-grow justify-center px-6 py-10`} keyboardShouldPersistTaps="handled">
                <Text style={[tw`text-2xl text-center`, {fontFamily: fonts.heading, color: "#E4E0D4"}]}>Sign in</Text>
                <Text style={[tw`mt-2 text-sm text-slate-300 text-center`, {fontFamily: fonts.body}]}>
                    Enter your email to get a login code, then paste the code here to continue.
                </Text>

                <Input
                    placeholder="Your name"
                    value={name}
                    onChangeText={setName}
                    style={tw`mt-4 px-4 py-3`}
                />

                <View style={tw`mt-3 rounded-xl border border-[#2c2c2c] bg-[#0f0f0f] px-4 py-3`}>
                    <Text style={[tw`text-xs text-slate-400`, {fontFamily: fonts.body}]}>
                        Birthday
                    </Text>
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
                            <View style={tw`flex-1 rounded-lg border border-[#2c2c2c] bg-black/20`}>
                                <Text style={[tw`px-3 pt-3 text-[11px] text-slate-400`, {fontFamily: fonts.body}]}>
                                    Month
                                </Text>
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
                                                <Text style={[tw`text-sm`, {
                                                    fontFamily: fonts.body,
                                                    color: active ? "#fbf7f3" : "#94a3b8",
                                                }]}>
                                                    {option.label}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </ScrollView>
                            </View>

                            <View style={tw`flex-1 rounded-lg border border-[#2c2c2c] bg-black/20`}>
                                <Text style={[tw`px-3 pt-3 text-[11px] text-slate-400`, {fontFamily: fonts.body}]}>
                                    Day
                                </Text>
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
                                                <Text style={[tw`text-sm`, {
                                                    fontFamily: fonts.body,
                                                    color: active ? "#fbf7f3" : "#94a3b8",
                                                }]}>
                                                    {Number(option)}
                                                </Text>
                                            </Pressable>
                                        );
                                    }) : (
                                        <Text style={[tw`px-3 py-3 text-sm text-slate-500`, {fontFamily: fonts.body}]}>
                                            Pick a month first
                                        </Text>
                                    )}
                                </ScrollView>
                            </View>
                        </View>
                    ) : null}
                </View>

                <Input
                    placeholder="you@example.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={tw`mt-4 px-4 py-3`}
                />

                <View style={tw`mt-4`}>
                    <Button label={loading && !sent ? "Sending..." : sent ? "Code sent" : "Send code"} variant="primary" onPress={handleSendCode}/>
                </View>

                {sent ? (
                    <>
                        <Input
                            placeholder="6-digit code"
                            value={code}
                            onChangeText={setCode}
                            keyboardType="number-pad"
                            style={tw`mt-4 px-4 py-3`}
                        />
                        <View style={tw`mt-3`}>
                            <Button label={loading ? "Verifying..." : "Verify code"} variant="primary" onPress={handleVerify}/>
                        </View>
                    </>
                ) : null}

                {error ? <Text style={[tw`mt-3 text-sm text-rose-400 text-center`, {fontFamily: fonts.body}]}>{error}</Text> : null}
                {message ? <Text style={[tw`mt-3 text-sm text-emerald-400 text-center`, {fontFamily: fonts.body}]}>{message}</Text> : null}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
