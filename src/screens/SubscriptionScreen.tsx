import {type PropsWithChildren} from "react";
import {ImageBackground, Linking, ScrollView, StyleSheet, Text, View} from "react-native";
import {BlurView} from "expo-blur";
import {LinearGradient} from "expo-linear-gradient";
import {Button} from "../components/ui/Button";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";
import {haptics} from "../lib/haptics";

type SubscriptionPlanViewModel = {
    id: "yearly" | "monthly";
    title: string;
    subtitle: string;
    priceLabel: string | null;
    productIdentifier: string | null;
};

interface SubscriptionScreenProps {
    loading: boolean;
    trialActive: boolean;
    trialEndsAt: string | null;
    purchaseEnabled: boolean;
    purchaseBusy: boolean;
    restoreBusy: boolean;
    error: string | null;
    privacyPolicyUrl: string | null;
    termsOfUseUrl: string | null;
    plans: SubscriptionPlanViewModel[];
    onPurchasePlan: (planId: SubscriptionPlanViewModel["id"]) => void;
    onRestore: () => void;
    onSignOut: () => void;
    allowDismiss?: boolean;
    onDismiss?: () => void;
}

function FrostedPanel({children, compact = false}: PropsWithChildren<{ compact?: boolean }>) {
    return (
        <View
            style={[
                {
                    borderRadius: compact ? 20 : 28,
                    shadowColor: "#000000",
                    shadowOffset: {width: 0, height: compact ? 6 : 14},
                    shadowOpacity: compact ? 0.24 : 0.34,
                    shadowRadius: compact ? 12 : 22,
                    elevation: compact ? 7 : 10,
                },
            ]}
        >
            <BlurView
                intensity={38}
                tint="dark"
                style={[
                    tw`overflow-hidden border`,
                    {
                        borderRadius: compact ? 20 : 28,
                        borderColor: "rgba(255,255,255,0.24)",
                    },
                ]}
            >
                <View pointerEvents="none" style={[StyleSheet.absoluteFill, {backgroundColor: "rgba(0,0,0,0.32)"}]}/>
                <LinearGradient
                    colors={["rgba(255,255,255,0.16)", "rgba(255,255,255,0.04)", "rgba(0,0,0,0.28)"]}
                    locations={[0, 0.52, 1]}
                    pointerEvents="none"
                    style={StyleSheet.absoluteFill}
                />
                {children}
            </BlurView>
        </View>
    );
}

export function SubscriptionScreen({
                                       loading,
                                       trialActive,
                                       trialEndsAt,
                                       purchaseEnabled,
                                       purchaseBusy,
                                       restoreBusy,
                                       error,
                                       privacyPolicyUrl,
                                       termsOfUseUrl,
                                       plans,
                                       onPurchasePlan,
                                       onRestore,
                                       onSignOut,
                                       allowDismiss = false,
                                       onDismiss,
                                   }: SubscriptionScreenProps) {
    const legalLinksReady = Boolean(privacyPolicyUrl && termsOfUseUrl);
    const trialEndsLabel = trialEndsAt
        ? new Date(trialEndsAt).toLocaleDateString(undefined, {month: "short", day: "numeric", year: "numeric"})
        : null;
    const paywallBackground = require("../../public/images/ambient.jpg");
    const orangeButtonStyle = {
        backgroundColor: "#DAC8AE",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.18)",
        shadowColor: "#DAC8AE",
        shadowOffset: {width: 0, height: 8},
        shadowOpacity: 0.3,
        shadowRadius: 14,
        elevation: 6,
    };
    const restoreButtonStyle = {
        backgroundColor: "#DAC8AE",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.24)",
    };
    const restoreButtonTextStyle = {color: "#111111"};
    const orangeButtonTextStyle = {color: "#111111"};

    return (
        <ImageBackground source={paywallBackground} style={tw`flex-1`} imageStyle={tw`opacity-95`}>
            <ScrollView
                style={tw`flex-1 bg-black/40`}
                contentContainerStyle={[tw`flex-grow px-5 py-8`, {justifyContent: "space-between"}]}
            >
                <View style={tw`pt-20 px-1`}>
                    <View style={tw`flex-row items-start justify-between gap-4`}>
                        <View style={tw`flex-1`}>
                            <Text style={[tw`text-xs uppercase tracking-[2px]`, {
                                fontFamily: fonts.strong,
                                color: "#DAC8AE"
                            }]}>
                                Rhodie Pro
                            </Text>
                            <Text style={[tw`mt-2 text-4xl leading-10`, {fontFamily: fonts.heading, color: "#FFFFFF"}]}>
                            </Text>
                        </View>
                        {allowDismiss && onDismiss ? (
                            <Button
                                label="Back"
                                onPress={onDismiss}
                                shine
                                style={restoreButtonStyle}
                                textStyle={restoreButtonTextStyle}
                            />
                        ) : null}
                    </View>

                    <Text
                        style={[tw`mt-1 text-sm leading-5`, {fontFamily: fonts.body, color: "#FFFFFF"}]}>
                        Full access to encrypted journaling, gratitude entries, goal tracking, task management, calendar
                        planning,
                        insights, and social connection with others who are also embarking on the journey to betterment.
                    </Text>

                    <View style={tw`mt-5 flex-row flex-wrap gap-2`}>
                        {["14-day free access", "Private by design", "Cancel in App Store"].map((label) => (
                            <View
                                key={label}
                                style={[
                                    tw`rounded-full border px-3 py-2`,
                                    {
                                        backgroundColor: "rgba(255,255,255,0.14)",
                                        borderColor: "rgba(255,255,255,0.18)",
                                    },
                                ]}
                            >
                                <Text style={[tw`text-[11px]`, {fontFamily: fonts.button, color: "#FFFFFF"}]}>
                                    {label}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {trialActive ? (
                        <Text style={[tw`mt-5 text-xs`, {fontFamily: fonts.body, color: "#BBF7D0"}]}>
                            Free access active{trialEndsLabel ? ` until ${trialEndsLabel}` : ""}.
                        </Text>
                    ) : trialEndsLabel ? (
                        <Text style={[tw`mt-5 text-xs`, {fontFamily: fonts.body, color: "#FED7AA"}]}>
                            Free access ended on {trialEndsLabel}. Choose a plan to continue.
                        </Text>
                    ) : null}

                    <View style={tw`mt-4`}>
                        <Button
                            label={restoreBusy ? "Restoring..." : "Restore purchase"}
                            onPress={onRestore}
                            shine
                            style={restoreButtonStyle}
                            textStyle={restoreButtonTextStyle}
                        />
                    </View>

                    {error ? (
                        <Text style={[tw`mt-4 text-xs`, {fontFamily: fonts.body, color: "#FECACA"}]}>
                            {error}
                        </Text>
                    ) : null}
                </View>

                <View style={tw`mt-8`}>
                    <View style={tw`gap-3`}>
                        {plans.map((plan) => {
                            return (
                                <FrostedPanel key={plan.id} compact>
                                    <View style={tw`p-4`}>
                                        <View style={tw`flex-row items-center justify-between gap-3`}>
                                            <View style={tw`flex-1`}>
                                                <Text style={[tw`text-lg`, {
                                                    fontFamily: fonts.heading,
                                                    color: "#FFFFFF"
                                                }]}>
                                                    {plan.id === "yearly" ? "Yearly Access" : "Monthly Access"}
                                                </Text>
                                                <Text style={[tw`mt-1 text-xs`, {
                                                    fontFamily: fonts.body,
                                                    color: "rgba(255,255,255,0.74)"
                                                }]}>
                                                    {plan.priceLabel ?? "Unavailable"}
                                                </Text>
                                            </View>
                                            <Button
                                                label={purchaseBusy ? "Starting..." : "Buy"}
                                                onPress={() => onPurchasePlan(plan.id)}
                                                disabled={!purchaseEnabled || purchaseBusy}
                                                shine
                                                style={[orangeButtonStyle, tw`min-w-[92px]`]}
                                                textStyle={orangeButtonTextStyle}
                                            />
                                        </View>
                                    </View>
                                </FrostedPanel>
                            );
                        })}
                    </View>

                    <View style={tw`mt-4`}>
                        {legalLinksReady ? (
                            <Text style={[tw`text-center text-xs leading-5`, {
                                fontFamily: fonts.body,
                                color: "rgba(255,255,255,0.78)"
                            }]}>
                                By continuing, you agree to the{" "}
                                <Text
                                    onPress={() => {
                                        haptics.selection();
                                        if (termsOfUseUrl) void Linking.openURL(termsOfUseUrl);
                                    }}
                                    style={{color: "#DAC8AE"}}
                                >
                                    Terms of Use
                                </Text>
                                {" "}(
                                <Text
                                    onPress={() => {
                                        haptics.selection();
                                        if (termsOfUseUrl) void Linking.openURL(termsOfUseUrl);
                                    }}
                                    style={{color: "#DAC8AE"}}
                                >
                                    EULA
                                </Text>
                                )
                                {" "}and{" "}
                                <Text
                                    onPress={() => {
                                        haptics.selection();
                                        if (privacyPolicyUrl) void Linking.openURL(privacyPolicyUrl);
                                    }}
                                    style={{color: "#DAC8AE"}}
                                >
                                    Privacy Policy
                                </Text>
                                .
                            </Text>
                        ) : (
                            <Text
                                style={[tw`text-center text-xs leading-5`, {fontFamily: fonts.body, color: "#FED7AA"}]}>
                                Add `EXPO_PUBLIC_TERMS_OF_USE_URL` and `EXPO_PUBLIC_PRIVACY_POLICY_URL` before
                                submission.
                            </Text>
                        )}
                    </View>
                </View>

            </ScrollView>
        </ImageBackground>
    );
}
