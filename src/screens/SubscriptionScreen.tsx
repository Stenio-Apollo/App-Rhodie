import {ImageBackground, Linking, ScrollView, Text, View} from "react-native";
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
    const paywallBackground = require("../../public/images/rhelk1.jpg");
    const buttonStyle = {
        backgroundColor: "#E1B996",
        borderWidth: 1,
        borderColor: "rgba(43,43,43,0.22)",
        shadowColor: "#000000",
        shadowOffset: {width: 0, height: 5},
        shadowOpacity: 0.24,
        shadowRadius: 8,
        elevation: 6,
    };
    const burntOrangeButtonStyle = {
        ...buttonStyle,
        backgroundColor: "#B55941",
        borderColor: "rgba(255,255,255,0.18)",
    };
    const blackButtonStyle = {
        ...buttonStyle,
        backgroundColor: "#111111",
        borderColor: "rgba(255,255,255,0.16)",
    };
    const buttonTextStyle = {color: "#111111"};
    const lightButtonTextStyle = {color: "#FFF6E8"};

    return (
        <ImageBackground source={paywallBackground} style={tw`flex-1`} imageStyle={tw`opacity-70`}>
            <ScrollView
                style={[tw`flex-1 bg-black/25`, {paddingHorizontal: 1}]}
                contentContainerStyle={tw`flex-grow justify-center px-6 py-8`}
            >
                <View
                    style={[
                        tw`rounded-3xl border p-6`,
                        {
                            backgroundColor: "rgba(223,196,170,0.78)",
                            borderColor: "rgba(223,196,170,0.72)",
                            shadowColor: "#000000",
                            shadowOffset: {width: 0, height: 10},
                            shadowOpacity: 0.28,
                            shadowRadius: 18,
                            elevation: 9,
                        },
                    ]}
                >
                    <Text style={[tw`text-3xl`, {fontFamily: fonts.heading, color: "#111111"}]}>
                        Rhodie Pro
                    </Text>
                    <Text style={[tw`mt-2 text-sm`, {fontFamily: fonts.body, color: "#111111"}]}>
                        Continue with Rhodie Pro to keep full access after your free trial.
                    </Text>
                    {allowDismiss && onDismiss ? (
                        <View style={tw`mt-4 self-start`}>
                            <Button
                                label="Back"
                                onPress={onDismiss}
                                shine
                                style={buttonStyle}
                                textStyle={buttonTextStyle}
                            />
                        </View>
                    ) : null}

                    <View style={tw`mt-5 gap-2`}>
                        <Text style={[tw`text-sm`, {fontFamily: fonts.body, color: "#111111"}]}>
                            • Full access to journaling, task planning, calendar tools, and insights
                        </Text>
                        <Text style={[tw`text-sm`, {fontFamily: fonts.body, color: "#111111"}]}>
                            • 14 days of free access from the moment your account is created
                        </Text>
                        <Text style={[tw`text-sm`, {fontFamily: fonts.body, color: "#111111"}]}>
                            • Monthly or yearly auto-renewing plans after the trial ends
                        </Text>
                        <Text style={[tw`text-sm`, {fontFamily: fonts.body, color: "#111111"}]}>
                            • Restore purchases any time from your App Store account
                        </Text>
                    </View>

                    {trialActive ? (
                        <Text style={[tw`mt-5 text-xs`, {fontFamily: fonts.body, color: "#14532d"}]}>
                            Your free access is active{trialEndsLabel ? ` until ${trialEndsLabel}` : ""}.
                        </Text>
                    ) : trialEndsLabel ? (
                        <Text style={[tw`mt-5 text-xs`, {fontFamily: fonts.body, color: "#7c2d12"}]}>
                            Your 14-day free access ended on {trialEndsLabel}. Choose a plan to continue.
                        </Text>
                    ) : null}

                    {error ? (
                        <Text style={[tw`mt-5 text-xs`, {fontFamily: fonts.body, color: "#7f1d1d"}]}>
                            {error}
                        </Text>
                    ) : null}

                    <View style={tw`mt-5 gap-3`}>
                        {plans.map((plan) => (
                            <View
                                key={plan.id}
                                style={[
                                    tw`rounded-2xl border p-4`,
                                    {
                                        backgroundColor: "#DFC4AA",
                                        borderColor: "rgba(43,43,43,0.18)",
                                        shadowColor: "#000000",
                                        shadowOffset: {width: 0, height: 5},
                                        shadowOpacity: 0.18,
                                        shadowRadius: 9,
                                        elevation: 5,
                                    },
                                ]}
                            >
                                <View style={tw`flex-row items-start justify-between gap-3`}>
                                    <View style={tw`flex-1`}>
                                        <Text style={[tw`text-base`, {fontFamily: fonts.heading, color: "#111111"}]}>
                                            {plan.title}
                                        </Text>
                                        <Text style={[tw`mt-1 text-xs`, {fontFamily: fonts.body, color: "#2B2B2B"}]}>
                                            {plan.subtitle}
                                        </Text>
                                        <Text style={[tw`mt-2 text-lg`, {fontFamily: fonts.heading, color: "#111111"}]}>
                                            {plan.priceLabel ?? "Not in current offering"}
                                        </Text>
                                        {plan.productIdentifier ? (
                                            <Text
                                                style={[tw`mt-1 text-[11px]`, {
                                                    fontFamily: fonts.body,
                                                    color: "rgba(17,17,17,0.58)",
                                                }]}>
                                                {plan.productIdentifier}
                                            </Text>
                                        ) : null}
                                    </View>

                                    <View style={tw`w-28`}>
                                        <Button
                                            label={purchaseBusy ? "Starting..." : `Buy ${plan.title}`}
                                            onPress={() => onPurchasePlan(plan.id)}
                                            disabled={!purchaseEnabled || purchaseBusy}
                                            shine
                                            style={buttonStyle}
                                            textStyle={buttonTextStyle}
                                        />
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>

                    <View style={tw`mt-3`}>
                        <Button
                            label={restoreBusy ? "Restoring..." : "Restore purchases"}
                            onPress={onRestore}
                            shine
                            style={burntOrangeButtonStyle}
                            textStyle={buttonTextStyle}
                        />
                    </View>

                    {legalLinksReady ? (
                        <Text style={[tw`mt-5 text-xs`, {fontFamily: fonts.body, color: "#111111"}]}>
                            By continuing, you agree to the{" "}
                            <Text
                                onPress={() => {
                                    haptics.selection();
                                    if (termsOfUseUrl) void Linking.openURL(termsOfUseUrl);
                                }}
                                style={{color: "#5f2f20"}}
                            >
                                Terms of Use
                            </Text>
                            {" "}(
                            <Text
                                onPress={() => {
                                    haptics.selection();
                                    if (termsOfUseUrl) void Linking.openURL(termsOfUseUrl);
                                }}
                                style={{color: "#5f2f20"}}
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
                                style={{color: "#5f2f20"}}
                            >
                                Privacy Policy
                            </Text>
                            .
                        </Text>
                    ) : (
                        <Text style={[tw`mt-5 text-xs`, {fontFamily: fonts.body, color: "#7c2d12"}]}>
                            Add `EXPO_PUBLIC_TERMS_OF_USE_URL` and `EXPO_PUBLIC_PRIVACY_POLICY_URL` before submission.
                        </Text>
                    )}

                    <View style={tw`mt-6`}>
                        <Button
                            label={loading ? "Checking access..." : "Sign out"}
                            onPress={onSignOut}
                            disabled={loading}
                            shine
                            style={blackButtonStyle}
                            textStyle={lightButtonTextStyle}
                        />
                    </View>
                </View>
            </ScrollView>
        </ImageBackground>
    );
}
