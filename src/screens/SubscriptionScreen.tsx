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
    const paywallBackground = require("../../public/images/rh21.jpg");

    return (
        <ImageBackground source={paywallBackground} style={tw`flex-1`} imageStyle={tw`opacity-45`}>
            <ScrollView
                style={[tw`flex-1 bg-black/35`, {paddingHorizontal: 1}]}
                contentContainerStyle={tw`flex-grow justify-center px-6 py-8`}
            >
                <View style={tw`rounded-3xl border border-[#2c2c2c] bg-black/55 p-6`}>
                    <Text style={[tw`text-3xl`, {fontFamily: fonts.heading, color: "#E4E0D4"}]}>
                        Rhodie Pro
                    </Text>
                    <Text style={[tw`mt-2 text-sm text-slate-300`, {fontFamily: fonts.body}]}>
                        Continue with Rhodie Pro to keep full access after your free trial.
                    </Text>
                    {allowDismiss && onDismiss ? (
                        <View style={tw`mt-4 self-start`}>
                            <Button label="Back" onPress={onDismiss} variant="secondary"/>
                        </View>
                    ) : null}

                    <View style={tw`mt-5 gap-2`}>
                        <Text style={[tw`text-sm`, {fontFamily: fonts.body, color: "#E4E0D4"}]}>
                            • Full access to journaling, task planning, calendar tools, and insights
                        </Text>
                        <Text style={[tw`text-sm`, {fontFamily: fonts.body, color: "#E4E0D4"}]}>
                            • 14 days of free access from the moment your account is created
                        </Text>
                        <Text style={[tw`text-sm`, {fontFamily: fonts.body, color: "#E4E0D4"}]}>
                            • Monthly or yearly auto-renewing plans after the trial ends
                        </Text>
                        <Text style={[tw`text-sm`, {fontFamily: fonts.body, color: "#E4E0D4"}]}>
                            • Restore purchases any time from your App Store account
                        </Text>
                    </View>

                    {trialActive ? (
                        <Text style={[tw`mt-5 text-xs text-emerald-300`, {fontFamily: fonts.body}]}>
                            Your free access is active{trialEndsLabel ? ` until ${trialEndsLabel}` : ""}.
                        </Text>
                    ) : trialEndsLabel ? (
                        <Text style={[tw`mt-5 text-xs text-amber-300`, {fontFamily: fonts.body}]}>
                            Your 14-day free access ended on {trialEndsLabel}. Choose a plan to continue.
                        </Text>
                    ) : null}

                    {error ? (
                        <Text style={[tw`mt-5 text-xs text-rose-300`, {fontFamily: fonts.body}]}>
                            {error}
                        </Text>
                    ) : null}

                    <View style={tw`mt-5 gap-3`}>
                        {plans.map((plan) => (
                            <View key={plan.id} style={tw`rounded-2xl border border-[#2c2c2c] bg-[#111111]/80 p-4`}>
                                <View style={tw`flex-row items-start justify-between gap-3`}>
                                    <View style={tw`flex-1`}>
                                        <Text style={[tw`text-base`, {fontFamily: fonts.heading, color: "#E4E0D4"}]}>
                                            {plan.title}
                                        </Text>
                                        <Text style={[tw`mt-1 text-xs text-slate-400`, {fontFamily: fonts.body}]}>
                                            {plan.subtitle}
                                        </Text>
                                        <Text style={[tw`mt-2 text-lg`, {fontFamily: fonts.heading, color: "#B55941"}]}>
                                            {plan.priceLabel ?? "Not in current offering"}
                                        </Text>
                                        {plan.productIdentifier ? (
                                            <Text
                                                style={[tw`mt-1 text-[11px] text-slate-500`, {fontFamily: fonts.body}]}>
                                                {plan.productIdentifier}
                                            </Text>
                                        ) : null}
                                    </View>

                                    <View style={tw`w-28`}>
                                        <Button
                                            label={purchaseBusy ? "Starting..." : `Buy ${plan.title}`}
                                            onPress={() => onPurchasePlan(plan.id)}
                                            disabled={!purchaseEnabled || purchaseBusy}
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
                            variant="secondary"
                        />
                    </View>

                    {legalLinksReady ? (
                        <Text style={[tw`mt-5 text-xs text-slate-400`, {fontFamily: fonts.body}]}>
                            By continuing, you agree to the{" "}
                            <Text
                                onPress={() => {
                                    haptics.selection();
                                    if (termsOfUseUrl) void Linking.openURL(termsOfUseUrl);
                                }}
                                style={{color: "#B55941"}}
                            >
                                Terms of Use
                            </Text>
                            {" "}(
                            <Text
                                onPress={() => {
                                    haptics.selection();
                                    if (termsOfUseUrl) void Linking.openURL(termsOfUseUrl);
                                }}
                                style={{color: "#B55941"}}
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
                                style={{color: "#B55941"}}
                            >
                                Privacy Policy
                            </Text>
                            .
                        </Text>
                    ) : (
                        <Text style={[tw`mt-5 text-xs text-amber-300`, {fontFamily: fonts.body}]}>
                            Add `EXPO_PUBLIC_TERMS_OF_USE_URL` and `EXPO_PUBLIC_PRIVACY_POLICY_URL` before submission.
                        </Text>
                    )}

                    <View style={tw`mt-6`}>
                        <Button label={loading ? "Checking access..." : "Sign out"} onPress={onSignOut} variant="danger"
                                disabled={loading}/>
                    </View>
                </View>
            </ScrollView>
        </ImageBackground>
    );
}
