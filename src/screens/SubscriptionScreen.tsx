import {Text, View} from "react-native";
import {Button} from "../components/ui/Button";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";

interface SubscriptionScreenProps {
    loading: boolean;
    trialActive: boolean;
    priceLabel: string;
    purchaseBusy: boolean;
    restoreBusy: boolean;
    error: string | null;
    onSubscribe: () => void;
    onRestore: () => void;
    onSignOut: () => void;
}

export function SubscriptionScreen({
    loading,
    trialActive,
    priceLabel,
    purchaseBusy,
    restoreBusy,
    error,
    onSubscribe,
    onRestore,
    onSignOut,
}: SubscriptionScreenProps) {
    return (
        <View style={tw`flex-1 bg-black px-6 justify-center`}>
            <View style={tw`rounded-3xl border border-[#2c2c2c] bg-black/40 p-6`}>
                <Text style={[tw`text-3xl`, {fontFamily: fonts.heading, color: "#E4E0D4"}]}>
                    Rhodie Pro
                </Text>
                <Text style={[tw`mt-2 text-sm text-slate-300`, {fontFamily: fonts.body}]}>
                    Start with 14 days free, then {priceLabel} per month. Cancel anytime.
                </Text>

                <View style={tw`mt-5 gap-2`}>
                    <Text style={[tw`text-sm`, {fontFamily: fonts.body, color: "#E4E0D4"}]}>
                        • Unlimited task and journal sync
                    </Text>
                    <Text style={[tw`text-sm`, {fontFamily: fonts.body, color: "#E4E0D4"}]}>
                        • Cross-device access
                    </Text>
                    <Text style={[tw`text-sm`, {fontFamily: fonts.body, color: "#E4E0D4"}]}>
                        • Priority feature releases
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

                <View style={tw`mt-5`}>
                    <Button
                        label={loading || purchaseBusy ? "Starting..." : "Start 14-day free trial"}
                        onPress={onSubscribe}
                    />
                </View>
                <View style={tw`mt-3`}>
                    <Button
                        label={restoreBusy ? "Restoring..." : "Restore purchases"}
                        onPress={onRestore}
                        variant="secondary"
                    />
                </View>
                <View style={tw`mt-6`}>
                    <Button label="Sign out" onPress={onSignOut} variant="danger"/>
                </View>
            </View>
        </View>
    );
}
