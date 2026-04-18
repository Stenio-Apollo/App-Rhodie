import {Linking, ScrollView, Text, View} from "react-native";
import {Button} from "../components/ui/Button";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";

type SubscriptionPlanViewModel = {
    id: "lifetime" | "yearly" | "monthly";
    title: string;
    subtitle: string;
    priceLabel: string | null;
    productIdentifier: string | null;
};

interface SubscriptionScreenProps {
    loading: boolean;
    trialActive: boolean;
    purchaseEnabled: boolean;
    purchaseBusy: boolean;
    restoreBusy: boolean;
    paywallBusy: boolean;
    error: string | null;
    privacyPolicyUrl: string | null;
    termsOfUseUrl: string | null;
    plans: SubscriptionPlanViewModel[];
    onPresentPaywall: () => void;
    onPurchasePlan: (planId: SubscriptionPlanViewModel["id"]) => void;
    onRestore: () => void;
    onSignOut: () => void;
}

export function SubscriptionScreen({
    loading,
    trialActive,
    purchaseEnabled,
    purchaseBusy,
    restoreBusy,
    paywallBusy,
    error,
    privacyPolicyUrl,
    termsOfUseUrl,
    plans,
    onPresentPaywall,
    onPurchasePlan,
    onRestore,
    onSignOut,
}: SubscriptionScreenProps) {
    const legalLinksReady = Boolean(privacyPolicyUrl && termsOfUseUrl);

    return (
        <ScrollView style={tw`flex-1 bg-black`} contentContainerStyle={tw`flex-grow justify-center px-6 py-8`}>
            <View style={tw`rounded-3xl border border-[#2c2c2c] bg-black/40 p-6`}>
                <Text style={[tw`text-3xl`, {fontFamily: fonts.heading, color: "#E4E0D4"}]}>
                    Rhodie Pro
                </Text>
                <Text style={[tw`mt-2 text-sm text-slate-300`, {fontFamily: fonts.body}]}>
                    Unlock the full Rhodie experience with RevenueCat-backed subscriptions and entitlements.
                </Text>

                <View style={tw`mt-5 gap-2`}>
                    <Text style={[tw`text-sm`, {fontFamily: fonts.body, color: "#E4E0D4"}]}>
                        • RevenueCat entitlement checking for Rhodie Pro
                    </Text>
                    <Text style={[tw`text-sm`, {fontFamily: fonts.body, color: "#E4E0D4"}]}>
                        • Customer info syncing across devices
                    </Text>
                    <Text style={[tw`text-sm`, {fontFamily: fonts.body, color: "#E4E0D4"}]}>
                        • Hosted paywall plus restore and customer center support
                    </Text>
                </View>

                {trialActive ? (
                    <Text style={[tw`mt-5 text-xs text-emerald-300`, {fontFamily: fonts.body}]}>
                        Your free trial is currently active.
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
                                        <Text style={[tw`mt-1 text-[11px] text-slate-500`, {fontFamily: fonts.body}]}>
                                            {plan.productIdentifier}
                                        </Text>
                                    ) : null}
                                </View>

                                <View style={tw`w-28`}>
                                    <Button
                                        label={purchaseBusy ? "Starting..." : `Buy ${plan.title}`}
                                        onPress={() => onPurchasePlan(plan.id)}
                                        disabled={!purchaseEnabled || purchaseBusy || !plan.priceLabel}
                                    />
                                </View>
                            </View>
                        </View>
                    ))}
                </View>

                <View style={tw`mt-5`}>
                    <Button
                        label={loading || paywallBusy ? "Opening..." : "Open RevenueCat Paywall"}
                        onPress={onPresentPaywall}
                        variant="outlineAccent"
                        disabled={!purchaseEnabled || loading || paywallBusy}
                    />
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
                                if (termsOfUseUrl) void Linking.openURL(termsOfUseUrl);
                            }}
                            style={{color: "#B55941"}}
                        >
                            Terms of Use
                        </Text>
                        {" "}and{" "}
                        <Text
                            onPress={() => {
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
                        Add `EXPO_PUBLIC_TERMS_OF_USE_URL` and `EXPO_PUBLIC_PRIVACY_POLICY_URL` before App Store / Play submission.
                    </Text>
                )}

                <View style={tw`mt-6`}>
                    <Button label="Sign out" onPress={onSignOut} variant="danger"/>
                </View>
            </View>
        </ScrollView>
    );
}
