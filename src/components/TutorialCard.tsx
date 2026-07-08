import {useState} from "react";
import {LayoutAnimation, Platform, Pressable, Text, UIManager, View} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";
import {haptics} from "../lib/haptics";
import {TranslucentCard} from "./TranslucentCard";
import {GuideCard, guideCardTextPalette} from "./GuideCard";
import type {VisualMode} from "../state/useVisualMode";

if (
    Platform.OS === "android" &&
    UIManager.setLayoutAnimationEnabledExperimental
) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface TutorialDetailStep {
    title: string;
    body: string;
}

interface TutorialCardProps {
    eyebrow?: string;
    title: string;
    body: string;
    actionLabel?: string;
    onDismiss: () => void;
    detailsIntro?: string;
    detailsSteps?: TutorialDetailStep[];
    expandLabel?: string;
    collapseLabel?: string;
    visualMode?: VisualMode;
}

export function TutorialCard({
                                 eyebrow = "Quick guide",
                                 title,
                                 body,
                                 actionLabel = "Got it",
                                 onDismiss,
                                 detailsIntro,
                                 detailsSteps,
                                 expandLabel = "See how it works",
                                 collapseLabel = "Hide details",
                                 visualMode = "river",
                             }: TutorialCardProps) {
    const [expanded, setExpanded] = useState(false);
    const hasDetails = Boolean(detailsIntro || (detailsSteps && detailsSteps.length > 0));
    const palette = guideCardTextPalette(visualMode);
    const detailStepText = visualMode === "river" ? "#000000" : "rgba(255,255,255,0.82)";
    const toggleText = palette.body;

    function toggleExpanded() {
        haptics.selection();
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded((current) => !current);
    }

    return (
        <GuideCard
            eyebrow={eyebrow}
            title={title}
            body={body}
            visualMode={visualMode}
            actions={[{id: "dismiss", label: actionLabel, tone: "primary"}]}
            onAction={onDismiss}
        >
            {hasDetails ? (
                <>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={expanded ? collapseLabel : expandLabel}
                        accessibilityState={{expanded}}
                        onPress={toggleExpanded}
                        style={({pressed}) => [
                            pressed && {opacity: 0.78, transform: [{translateY: 1}]},
                        ]}
                    >
                        <TranslucentCard
                            radius={999}
                            style={tw`flex-row items-center justify-between px-3 py-1.5`}
                            containerStyle={{shadowOpacity: 0, elevation: 0}}
                        >
                            <Text style={[tw`text-[11px] uppercase tracking-[1.5px]`, {
                                fontFamily: fonts.strong,
                                color: toggleText,
                            }]}>
                                {expanded ? collapseLabel : expandLabel}
                            </Text>
                            <Ionicons
                                name={expanded ? "chevron-up" : "chevron-down"}
                                size={16}
                                color={toggleText}
                            />
                        </TranslucentCard>
                    </Pressable>

                    {expanded ? (
                        <View style={tw`mt-3`}>
                            {detailsIntro ? (
                                <Text style={[tw`text-sm leading-5`, {
                                    fontFamily: fonts.body,
                                    color: palette.body,
                                }]}>
                                    {detailsIntro}
                                </Text>
                            ) : null}
                            {detailsSteps?.length ? (
                                <View style={[detailsIntro ? tw`mt-3 gap-2` : tw`gap-2`]}>
                                    {detailsSteps.map((step, index) => (
                                        <View
                                            key={`${step.title}-${index}`}
                                            style={tw`flex-row items-start gap-3`}
                                        >
                                            <View
                                                style={[
                                                    tw`h-6 w-6 items-center justify-center rounded-full`,
                                                    {backgroundColor: "#000000"},
                                                ]}
                                            >
                                                <Text
                                                    style={[tw`text-[11px]`, {
                                                        fontFamily: fonts.button,
                                                        color: "#FFFFFF",
                                                    }]}
                                                >
                                                    {index + 1}
                                                </Text>
                                            </View>
                                            <View style={tw`flex-1`}>
                                                <Text style={[tw`text-sm`, {
                                                    fontFamily: fonts.heading,
                                                    color: palette.heading,
                                                }]}>
                                                    {step.title}
                                                </Text>
                                                <Text style={[tw`mt-0.5 text-[13px] leading-5`, {
                                                    fontFamily: fonts.body,
                                                    color: detailStepText,
                                                }]}>
                                                    {step.body}
                                                </Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            ) : null}
                        </View>
                    ) : null}
                </>
            ) : null}
        </GuideCard>
    );
}
