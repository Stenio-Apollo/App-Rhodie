import {useState} from "react";
import {Animated, Image, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View,} from "react-native";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";
import {haptics} from "../lib/haptics";
import type {EncryptionState} from "../state/useEncryption";
import {useKeyboardInset} from "../lib/useKeyboardInset";

const passphraseIcon = require("../../assets/iconNew.png");
const PASSPHRASE_ICON_SIZE = 190;

interface PrivacyPassphraseScreenProps {
    encryption: EncryptionState;
    onSignOut: () => void;
}

type SetupStage = "create" | "confirm";
type LegacyStage = "create" | "confirm";
type RecoveryStage = "code" | "create" | "confirm";

const keypadRows = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["", "0", "delete"],
];

export function PrivacyPassphraseScreen({encryption, onSignOut}: PrivacyPassphraseScreenProps) {
    const needsSetup = encryption.status === "needs_setup";
    const isLegacyProfile = !needsSetup && encryption.legacyUpgradeRequired;

    const [pin, setPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [legacyPassphrase, setLegacyPassphrase] = useState("");
    const [newPin, setNewPin] = useState("");
    const [confirmNewPin, setConfirmNewPin] = useState("");
    const [resetCodeSent, setResetCodeSent] = useState(false);
    const [emailCode, setEmailCode] = useState("");
    const [recoveryPin, setRecoveryPin] = useState("");
    const [confirmRecoveryPin, setConfirmRecoveryPin] = useState("");
    const [setupStage, setSetupStage] = useState<SetupStage>("create");
    const [legacyStage, setLegacyStage] = useState<LegacyStage>("create");
    const [recoveryStage, setRecoveryStage] = useState<RecoveryStage>("code");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function waitForUiFrame(): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, 80));
    }

    function errorMessage(err: unknown, fallback: string): string {
        if (err instanceof Error) return err.message;
        if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
            return err.message;
        }
        return fallback;
    }

    function displayErrorMessage(message: string): string {
        return message.includes("unlock your encrypted data") ? "try again" : message;
    }

    function currentPinValue(): string {
        if (resetCodeSent) {
            if (recoveryStage === "code") return emailCode;
            if (recoveryStage === "create") return recoveryPin;
            return confirmRecoveryPin;
        }

        if (isLegacyProfile) {
            return legacyStage === "create" ? newPin : confirmNewPin;
        }

        if (needsSetup) {
            return setupStage === "create" ? pin : confirmPin;
        }

        return pin;
    }

    function setCurrentPinValue(value: string) {
        if (resetCodeSent) {
            if (recoveryStage === "code") {
                setEmailCode(value);
                return;
            }
            if (recoveryStage === "create") {
                setRecoveryPin(value);
                return;
            }
            setConfirmRecoveryPin(value);
            return;
        }

        if (isLegacyProfile) {
            if (legacyStage === "create") {
                setNewPin(value);
                return;
            }
            setConfirmNewPin(value);
            return;
        }

        if (needsSetup) {
            if (setupStage === "create") {
                setPin(value);
                return;
            }
            setConfirmPin(value);
            return;
        }

        setPin(value);
    }

    async function unlockWithPin(value: string) {
        setBusy(true);
        try {
            await waitForUiFrame();
            await encryption.unlock(value);
        } catch (err) {
            setPin("");
            setError(errorMessage(err, "Could not unlock encrypted data."));
        } finally {
            setBusy(false);
        }
    }

    async function createInitialPin(value: string) {
        setBusy(true);
        try {
            await waitForUiFrame();
            await encryption.setup(value);
        } catch (err) {
            setPin("");
            setConfirmPin("");
            setSetupStage("create");
            setError(errorMessage(err, "Could not create your PIN."));
        } finally {
            setBusy(false);
        }
    }

    async function saveLegacyPin(value: string) {
        if (legacyPassphrase.trim().length === 0) {
            setConfirmNewPin("");
            setError("Enter your current privacy passphrase.");
            return;
        }

        setBusy(true);
        try {
            await waitForUiFrame();
            await encryption.changePin(legacyPassphrase.trim(), value);
        } catch (err) {
            setNewPin("");
            setConfirmNewPin("");
            setLegacyStage("create");
            setError(errorMessage(err, "Could not save your new PIN."));
        } finally {
            setBusy(false);
        }
    }

    async function verifyResetCode(value: string) {
        setBusy(true);
        try {
            await waitForUiFrame();
            await encryption.verifyPinResetCode(value);
            setRecoveryStage("create");
            setRecoveryPin("");
            setError(null);
        } catch (err) {
            setEmailCode("");
            setRecoveryStage("code");
            setError(errorMessage(err, "That email code did not verify."));
        } finally {
            setBusy(false);
        }
    }

    async function saveRecoveredPin(value: string) {
        setBusy(true);
        try {
            await waitForUiFrame();
            await encryption.resetPinAfterEmailVerification(value);
        } catch (err) {
            setRecoveryPin("");
            setConfirmRecoveryPin("");
            setRecoveryStage("create");
            setError(errorMessage(err, "Could not save your new PIN."));
        } finally {
            setBusy(false);
        }
    }

    function handlePinComplete(value: string) {
        setError(null);

        if (resetCodeSent) {
            if (recoveryStage === "code") {
                void verifyResetCode(value);
                return;
            }

            if (recoveryStage === "create") {
                setRecoveryStage("confirm");
                setConfirmRecoveryPin("");
                return;
            }

            if (value !== recoveryPin) {
                setConfirmRecoveryPin("");
                setError("The new PINs do not match.");
                return;
            }

            void saveRecoveredPin(recoveryPin);
            return;
        }

        if (needsSetup) {
            if (setupStage === "create") {
                setSetupStage("confirm");
                setConfirmPin("");
                return;
            }

            if (value !== pin) {
                setConfirmPin("");
                setError("The PINs do not match.");
                return;
            }

            void createInitialPin(pin);
            return;
        }

        if (isLegacyProfile) {
            if (legacyStage === "create") {
                setLegacyStage("confirm");
                setConfirmNewPin("");
                return;
            }

            if (value !== newPin) {
                setConfirmNewPin("");
                setError("The new PINs do not match.");
                return;
            }

            void saveLegacyPin(newPin);
            return;
        }

        void unlockWithPin(value);
    }

    function targetLength(): number {
        return resetCodeSent && recoveryStage === "code" ? 8 : 4;
    }

    function handleDigit(value: string) {
        if (busy) return;
        if (isLegacyProfile && legacyPassphrase.trim().length === 0) {
            setError("Enter your old passphrase first.");
            return;
        }
        haptics.selection();
        const nextValue = `${currentPinValue()}${value}`.slice(0, targetLength());
        setCurrentPinValue(nextValue);
        if (nextValue.length === targetLength()) {
            setTimeout(() => handlePinComplete(nextValue), 80);
        }
    }

    function handleDelete() {
        if (busy) return;
        haptics.selection();
        const value = currentPinValue();

        if (value.length > 0) {
            setCurrentPinValue(value.slice(0, -1));
            return;
        }

        if (resetCodeSent) {
            if (recoveryStage === "confirm") {
                setRecoveryStage("create");
                setRecoveryPin("");
            } else if (recoveryStage === "create") {
                setRecoveryStage("code");
                setEmailCode("");
            }
            return;
        }

        if (needsSetup && setupStage === "confirm") {
            setSetupStage("create");
            setPin("");
            return;
        }

        if (isLegacyProfile && legacyStage === "confirm") {
            setLegacyStage("create");
            setNewPin("");
        }
    }

    async function handleForgotPin() {
        setBusy(true);
        setError(null);
        try {
            const sent = await encryption.requestPinResetCode();
            setResetCodeSent(sent === true);
            setEmailCode("");
            setRecoveryPin("");
            setConfirmRecoveryPin("");
            setRecoveryStage("code");
            setPin("");
        } catch (err) {
            setError(errorMessage(err, "Could not send a reset code."));
        } finally {
            setBusy(false);
        }
    }

    const title = resetCodeSent
        ? recoveryStage === "code"
            ? "Enter reset code"
            : recoveryStage === "create"
                ? "Create new PIN"
                : "Confirm new PIN"
        : needsSetup
            ? setupStage === "create"
                ? "Create your PIN"
                : "Confirm your PIN"
            : isLegacyProfile
                ? legacyStage === "create"
                    ? "Upgrade to PIN"
                    : "Confirm new PIN"
                : "Enter your PIN";

    const helperText = resetCodeSent
        ? recoveryStage === "code"
            ? "8-digit email code"
            : recoveryStage === "create"
                ? "New PIN"
                : "Confirm PIN"
        : isLegacyProfile
            ? "New PIN"
            : needsSetup
                ? "Privacy PIN"
                : null;

    const pinValue = currentPinValue();
    const pinLength = resetCodeSent && recoveryStage === "code" ? 8 : 4;
    const shouldShowForgotPin = !needsSetup && !isLegacyProfile && !resetCodeSent;
    const visibleError = error ?? encryption.error;
    const {keyboardInset} = useKeyboardInset();

    return (
        <View style={tw`flex-1 bg-black`}>
            <View
                pointerEvents="none"
                style={[
                    StyleSheet.absoluteFill,
                    tw`items-center justify-center`,
                    {transform: [{translateY: -44}]},
                ]}
            >
                <Image
                    source={passphraseIcon}
                    resizeMode="contain"
                    style={{
                        width: PASSPHRASE_ICON_SIZE,
                        height: PASSPHRASE_ICON_SIZE,
                    }}
                />
            </View>
            <Animated.View style={[tw`flex-1`, {paddingBottom: keyboardInset}]}>
                <SafeAreaView style={tw`flex-1 px-7`}>
                    <View style={tw`pt-4`}>
                        <View style={tw`min-h-[44px] flex-row items-center justify-center`}>
                            <Text style={[tw`text-center text-2xl text-[#F6F0E7]`, {fontFamily: fonts.heading}]}>
                                {title}
                            </Text>
                            <Pressable
                                onPress={onSignOut}
                                disabled={busy}
                                style={({pressed}) => [
                                    tw`absolute right-0 rounded-xl px-2 py-2`,
                                    pressed && tw`opacity-70`,
                                    busy && tw`opacity-50`,
                                ]}
                            >
                                <Text style={[tw`text-base text-[#F6F0E7]`, {fontFamily: fonts.body}]}>
                                    Logout
                                </Text>
                            </Pressable>
                        </View>

                        {isLegacyProfile ? (
                            <>
                                <Text
                                    style={[tw`mt-4 text-center text-sm leading-5 text-[#F6F0E7]/80`, {fontFamily: fonts.body}]}>
                                    Enter your old passphrase once, then choose a 4-digit PIN.
                                </Text>
                                <TextInput
                                    value={legacyPassphrase}
                                    onChangeText={(value) => {
                                        setLegacyPassphrase(value);
                                        setError(null);
                                    }}
                                    secureTextEntry
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    keyboardAppearance="dark"
                                    placeholder="Old passphrase"
                                    placeholderTextColor="rgba(246,240,231,0.56)"
                                    style={[
                                        tw`mt-4 rounded-2xl border border-[#F6F0E7]/25 bg-black/35 px-4 py-3 text-[#F6F0E7]`,
                                        {fontFamily: fonts.body},
                                    ]}
                                />
                            </>
                        ) : null}
                    </View>

                    <View style={tw`flex-1 items-center justify-center`}>
                        {resetCodeSent && recoveryStage === "code" ? (
                            <View
                                style={tw`mb-8 items-center rounded-2xl border border-[#F6F0E7]/30 bg-black/35 px-8 py-4`}>
                                <Text
                                    style={[tw`text-xs uppercase tracking-[2px] text-[#F6F0E7]/70`, {fontFamily: fonts.strong}]}>
                                    Check your email
                                </Text>
                                <Text
                                    style={[tw`mt-2 text-center text-sm leading-5 text-[#F6F0E7]`, {fontFamily: fonts.body}]}>
                                    Enter the 8-digit reset code from your Rhodie email.
                                </Text>
                            </View>
                        ) : null}

                        {helperText ? (
                            <Text
                                style={[tw`mb-5 text-xs uppercase tracking-[2px] text-[#F6F0E7]/70`, {fontFamily: fonts.strong}]}>
                                {helperText}
                            </Text>
                        ) : null}

                        <View
                            style={[tw`w-full flex-row items-center justify-center`, pinLength === 8 ? tw`gap-4` : tw`gap-12`]}>
                            {Array.from({length: pinLength}, (_, item) => (
                                <View
                                    key={item}
                                    style={[
                                        tw`h-4 w-4 rounded-full border-2 border-[#F6F0E7]`,
                                        item < pinValue.length ? tw`bg-[#F6F0E7]` : null,
                                    ]}
                                />
                            ))}
                        </View>

                        {visibleError ? (
                            <Text
                                style={[tw`mt-8 text-center text-sm leading-5 text-[#FF3800]`, {fontFamily: fonts.body}]}>
                                {displayErrorMessage(visibleError)}
                            </Text>
                        ) : null}

                        {shouldShowForgotPin ? (
                            <Pressable
                                onPress={() => {
                                    void handleForgotPin();
                                }}
                                disabled={busy}
                                style={({pressed}) => [
                                    tw`rounded-xl px-4 py-2`,
                                    visibleError ? tw`mt-2` : tw`mt-8`,
                                    pressed && tw`opacity-70`,
                                    busy && tw`opacity-50`,
                                ]}
                            >
                                <Text style={[tw`text-sm text-[#F6F0E7]`, {fontFamily: fonts.button}]}>
                                    Forgot PIN?
                                </Text>
                            </Pressable>
                        ) : null}
                    </View>

                    <View style={tw`pb-8`}>
                        {keypadRows.map((row, rowIndex) => (
                            <View key={rowIndex} style={tw`mb-4 flex-row items-center justify-between`}>
                                {row.map((item, itemIndex) => {
                                    if (!item) {
                                        return <View key={`blank-${itemIndex}`} style={tw`h-20 w-20`}/>;
                                    }

                                    const isDelete = item === "delete";
                                    return (
                                        <Pressable
                                            key={item}
                                            onPress={() => {
                                                if (isDelete) {
                                                    handleDelete();
                                                } else {
                                                    handleDigit(item);
                                                }
                                            }}
                                            disabled={busy}
                                            style={({pressed}) => [
                                                tw`h-20 w-20 items-center justify-center rounded-full`,
                                                pressed && tw`rounded-2xl bg-[#DAC8AE]/79`,
                                                busy && tw`opacity-50`,
                                            ]}
                                        >
                                            {({pressed}) => (
                                                <Text
                                                    style={[
                                                        tw`text-center text-3xl text-[#F6F0E7]`,
                                                        pressed && tw`text-black`,
                                                        {fontFamily: isDelete ? fonts.heading : fonts.body},
                                                    ]}
                                                >
                                                    {isDelete ? "x" : item}
                                                </Text>
                                            )}
                                        </Pressable>
                                    );
                                })}
                            </View>
                        ))}
                    </View>
                </SafeAreaView>
            </Animated.View>
        </View>
    );
}
