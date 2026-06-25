import {useState} from "react";
import {ImageBackground, KeyboardAvoidingView, Platform, Text, TextInput, View} from "react-native";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";
import {Button} from "../components/ui/Button";
import type {EncryptionState} from "../state/useEncryption";

const passphraseBackground = require("../../public/images/rhelk1.jpg");

interface PrivacyPassphraseScreenProps {
    encryption: EncryptionState;
    onSignOut: () => void;
}

export function PrivacyPassphraseScreen({encryption, onSignOut}: PrivacyPassphraseScreenProps) {
    const needsSetup = encryption.status === "needs_setup";
    const [passphrase, setPassphrase] = useState("");
    const [confirmPassphrase, setConfirmPassphrase] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function waitForUiFrame(): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, 80));
    }

    async function handleSubmit() {
        const trimmed = passphrase.trim();
        setError(null);

        if (needsSetup && trimmed.length < 12) {
            setError("Use at least 12 characters. A longer phrase is safer.");
            return;
        }

        if (!needsSetup && trimmed.length === 0) {
            setError("Enter your Privacy Passphrase.");
            return;
        }

        if (needsSetup && trimmed !== confirmPassphrase.trim()) {
            setError("The passphrases do not match.");
            return;
        }

        setBusy(true);
        try {
            await waitForUiFrame();
            if (needsSetup) {
                await encryption.setup(trimmed);
            } else {
                await encryption.unlock(trimmed);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not unlock encrypted data.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <ImageBackground
            source={passphraseBackground}
            resizeMode="cover"
            style={tw`flex-1`}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={tw`flex-1 justify-center bg-black/45 px-5`}
            >
                <View style={tw`rounded-[32px] border border-[#E1B996]/70 bg-[#000000]/90 p-5`}>
                    <Text style={[tw`text-center text-2xl text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                        {needsSetup ? "Create Privacy Passphrase" : "Retrieve encrypted entries"}
                    </Text>
                    {needsSetup ? (
                        <>
                            <Text style={[tw`mt-3 text-sm leading-5 text-slate-300`, {fontFamily: fonts.body}]}>
                                Your entries will be encrypted on this device before they are stored in the backend.
                            </Text>
                            <Text style={[tw`mt-3 text-xs leading-5 text-amber-200`, {fontFamily: fonts.body}]}>
                                Rhodie does not store this passphrase. If you forget it, encrypted entries cannot be recovered.
                            </Text>
                        </>
                    ) : null}

                    <TextInput
                        value={passphrase}
                        onChangeText={setPassphrase}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardAppearance="dark"
                        placeholder={needsSetup ? "Create passphrase" : "Privacy passphrase"}
                        placeholderTextColor="#6b7280"
                        style={[tw`mt-5 rounded-2xl border border-slate-50/15 bg-black/39 px-4 py-3 text-[#E4E0D4]`, {fontFamily: fonts.body}]}
                    />

                    {needsSetup ? (
                        <TextInput
                            value={confirmPassphrase}
                            onChangeText={setConfirmPassphrase}
                            secureTextEntry
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardAppearance="dark"
                            placeholder="Confirm passphrase"
                            placeholderTextColor="#6b7280"
                            style={[tw`mt-3 rounded-2xl border border-slate-50/15 bg-black/39 px-4 py-3 text-[#E4E0D4]`, {fontFamily: fonts.body}]}
                        />
                    ) : null}

                    {error || encryption.error ? (
                        <Text style={[tw`mt-3 text-xs text-rose-300`, {fontFamily: fonts.body}]}>
                            {error ?? encryption.error}
                        </Text>
                    ) : null}

                    <View style={tw`mt-5 flex-row`}>
                        <Button
                            label={busy ? needsSetup ? "Encrypting..." : "Unlocking..." : needsSetup ? "Encrypt my data" : "Unlock"}
                            onPress={() => {
                                void handleSubmit();
                            }}
                            disabled={busy}
                            shine
                            style={[tw`mr-1.5 flex-1`, {backgroundColor: "#E1B996"}]}
                            textStyle={{color: "#111111"}}
                        />
                        <Button
                            label="Sign out"
                            onPress={onSignOut}
                            variant="glossy"
                            disabled={busy}
                            style={tw`ml-1.5 flex-1`}
                        />
                    </View>
                </View>
            </KeyboardAvoidingView>
        </ImageBackground>
    );
}
