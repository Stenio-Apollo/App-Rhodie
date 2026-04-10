import {useState} from "react";
import {KeyboardAvoidingView, Platform, Text, TextInput, View} from "react-native";
import {Button} from "../components/ui/Button";
import {fonts} from "../theme/fonts";
import tw from "../lib/tw";
import {useSupabaseAuth} from "../state/useSupabaseAuth";
import {useProfile} from "../state/useProfile";

export function AuthScreen() {
    const {signInMagicLink, verifyEmailOtp} = useSupabaseAuth();
    const {upsertProfile} = useProfile(null);
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [birthday, setBirthday] = useState("");
    const [code, setCode] = useState("");
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSend() {
        setLoading(true);
        setError(null);
        const err = await signInMagicLink(email.trim());
        setLoading(false);
        if (err) {
            setError(err.message);
            return;
        }
        setSent(true);
    }

    async function handleVerify() {
        setLoading(true);
        setError(null);
        const err = await verifyEmailOtp(email.trim(), code.trim());
        if (err) {
            setError(err.message);
            setLoading(false);
            return;
        }
        if (name.trim()) {
            await upsertProfile({full_name: name.trim(), birthday: birthday.trim() || null});
        }
        setLoading(false);
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={tw`flex-1 bg-black`}>
            <View style={tw`flex-1 justify-center px-6`}>
                <Text style={[tw`text-2xl text-white text-center`, {fontFamily: fonts.heading}]}>Sign in</Text>
                <Text style={[tw`mt-2 text-sm text-slate-300 text-center`, {fontFamily: fonts.body}]}>
                    Enter your name, birthday, and email to get a code, then paste the code here.
                </Text>

                <TextInput
                    placeholder="Your name"
                    placeholderTextColor="#6b7280"
                    value={name}
                    onChangeText={setName}
                    style={[tw`mt-4 rounded-xl border border-slate-700 bg-[#0f0f0f] px-4 py-3 text-white`, {fontFamily: fonts.body}]}
                />

                <TextInput
                    placeholder="Birthday (YYYY-MM-DD)"
                    placeholderTextColor="#6b7280"
                    value={birthday}
                    onChangeText={setBirthday}
                    keyboardType="numbers-and-punctuation"
                    style={[tw`mt-3 rounded-xl border border-slate-700 bg-[#0f0f0f] px-4 py-3 text-white`, {fontFamily: fonts.body}]}
                />

                <TextInput
                    placeholder="you@example.com"
                    placeholderTextColor="#6b7280"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={[tw`mt-6 rounded-xl border border-slate-700 bg-[#0f0f0f] px-4 py-3 text-white`, {fontFamily: fonts.body}]}
                />

                <View style={tw`mt-4`}>
                    <Button label={loading && !sent ? "Sending..." : sent ? "Code sent" : "Send code"} variant="primary" onPress={handleSend}/>
                </View>

                {sent && (
                    <>
                        <TextInput
                            placeholder="6-digit code"
                            placeholderTextColor="#6b7280"
                            value={code}
                            onChangeText={setCode}
                            keyboardType="number-pad"
                            style={[tw`mt-4 rounded-xl border border-slate-700 bg-[#0f0f0f] px-4 py-3 text-white`, {fontFamily: fonts.body}]}
                        />
                        <View style={tw`mt-3`}>
                            <Button label={loading && sent ? "Verifying..." : "Verify code"} variant="primary" onPress={handleVerify}/>
                        </View>
                    </>
                )}

                {error ? <Text style={[tw`mt-3 text-sm text-rose-400 text-center`, {fontFamily: fonts.body}]}>{error}</Text> : null}
                {sent ? <Text style={[tw`mt-3 text-sm text-emerald-400 text-center`, {fontFamily: fonts.body}]}>Check your email for the code.</Text> : null}
            </View>
        </KeyboardAvoidingView>
    );
}
