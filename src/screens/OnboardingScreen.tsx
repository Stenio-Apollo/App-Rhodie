import {useEffect, useMemo, useState} from "react";
import {ImageBackground, type ImageRequireSource, Pressable, ScrollView, StyleSheet, Text, View} from "react-native";
import {useVideoPlayer, VideoView} from "expo-video";
import tw from "../lib/tw";
import {Button} from "../components/ui/Button";
import {fonts} from "../theme/fonts";
import {haptics} from "../lib/haptics";

interface OnboardingScreenProps {
    onComplete: () => Promise<void> | void;
}

interface OnboardingStep {
    eyebrow: string;
    title: string;
    body: string;
    video?: ImageRequireSource;
}

const STEPS: OnboardingStep[] = [
    {
        eyebrow: "Start here",
        title: "Run the day from Home",
        body: "Home gives you the quote, weekly goal, gratitude, and today's tasks. Tap a card when you want to jump directly into that part of the app.",
    },
    {
        eyebrow: "Plan",
        title: "Block time before the day gets loud",
        body: "Use Plan like a timeline. Tap any time slot, name the event, and Rhodie schedules a reminder 15 minutes before it starts.",
        video: require("../../public/videos/plan.mov"),
    },
    {
        eyebrow: "Journal",
        title: "Capture what matters",
        body: "Journal has a daily prompt and 3 Good Things Today. Use it quickly, then come back later from the memory shelf.",
        video: require("../../public/videos/journal.mov"),
    },
    {
        eyebrow: "Tasks",
        title: "Keep the loose ends visible",
        body: "Tasks are for things you need to finish. Add due dates, due times, and priorities so reminders and the calendar can keep you honest.",
        video: require("../../public/videos/tasks.mov"),
    },
    {
        eyebrow: "Calendar",
        title: "Set the weekly target",
        body: "Calendar shows due tasks and holds your weekly goal. Rhodie checks in daily so the goal does not disappear after Monday.",
        video: require("../../public/videos/calendar.mov"),
    },
    {
        eyebrow: "Ready",
        title: "You are set.",
        body: "You can replay this guide from Account any time. Start on Home, then use the cards to jump into the part of Rhodie you need.",
    },
];

function OnboardingVideo({source}: { source: ImageRequireSource }) {
    const [hasError, setHasError] = useState(false);
    const player = useVideoPlayer(source, (instance) => {
        instance.loop = true;
        instance.muted = true;
        instance.play();
    });

    useEffect(() => {
        const subscription = player.addListener("statusChange", ({status}) => {
            if (status === "error") {
                setHasError(true);
            }
        });
        player.play();
        return () => {
            subscription.remove();
        };
    }, [player]);

    if (hasError) {
        return (
            <View style={tw`mt-4 rounded-[24px] border border-[#E4E0D4]/15 bg-black/35 p-4`}>
                <Text style={[tw`text-sm text-slate-300`, {fontFamily: fonts.body}]}>
                    Tutorial video could not load on this device. You can keep going.
                </Text>
            </View>
        );
    }

    return (
        <View style={tw`mt-4 overflow-hidden rounded-[24px] border border-[#E4E0D4]/15 bg-black/35`}>
            <VideoView
                player={player}
                style={styles.video}
                contentFit="contain"
                nativeControls={false}
                allowsFullscreen={false}
                allowsPictureInPicture={false}
            />
        </View>
    );
}

export function OnboardingScreen({onComplete}: OnboardingScreenProps) {
    const [index, setIndex] = useState(0);
    const [isCompleting, setIsCompleting] = useState(false);
    const step = STEPS[index];
    const isLast = index === STEPS.length - 1;
    const bg = require("../../public/images/rh19.jpg");

    const progress = useMemo(
        () => STEPS.map((_, itemIndex) => itemIndex <= index),
        [index],
    );

    function goNext() {
        haptics.selection();
        if (isLast) {
            setIsCompleting(true);
            setTimeout(() => {
                void onComplete();
            }, 150);
            return;
        }
        setIndex((current) => current + 1);
    }

    function goBack() {
        haptics.selection();
        setIndex((current) => Math.max(0, current - 1));
    }

    return (
        <ImageBackground source={bg} style={tw`flex-1`} imageStyle={tw`opacity-35`}>
            {isCompleting ? (
                <View style={tw`flex-1 items-center justify-center bg-black/70 px-8`}>
                    <Text style={[tw`text-[11px] uppercase tracking-[5px] text-[#B55941]`, {fontFamily: fonts.strong}]}>
                        Rhodie
                    </Text>
                    <Text style={[tw`mt-4 text-center text-3xl text-[#E4E0D4]`, {fontFamily: fonts.display}]}>
                        Starting your day.
                    </Text>
                    <Text style={[tw`mt-3 text-center text-sm leading-5 text-slate-300`, {fontFamily: fonts.body}]}>
                        Opening Rhodie on your home screen...
                    </Text>
                </View>
            ) : (
            <ScrollView
                style={tw`flex-1 bg-black/55`}
                contentContainerStyle={tw`flex-grow justify-end px-5 pb-10 pt-8`}
                showsVerticalScrollIndicator={false}
            >
                <View style={tw`mb-8`}>
                    <Text style={[tw`text-[11px] uppercase tracking-[5px] text-[#B55941]`, {fontFamily: fonts.strong}]}>
                        Rhodie
                    </Text>
                    <Text style={[tw`mt-3 text-4xl leading-tight text-[#E4E0D4]`, {fontFamily: fonts.display}]}>
                        A calmer way to hold the day together.
                    </Text>
                </View>

                <View style={tw`rounded-[32px] border border-[#B55941]/50 bg-black/70 p-5`}>
                    <Text style={[tw`text-[10px] uppercase tracking-[3px] text-[#B55941]`, {fontFamily: fonts.strong}]}>
                        {step.eyebrow}
                    </Text>
                    <Text style={[tw`mt-2 text-2xl leading-8 text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                        {step.title}
                    </Text>
                    <Text style={[tw`mt-3 text-base leading-6 text-slate-300`, {fontFamily: fonts.body}]}>
                        {step.body}
                    </Text>

                    {step.video && !isCompleting ? <OnboardingVideo key={index} source={step.video}/> : null}

                    <View style={tw`mt-6 flex-row gap-2`}>
                        {progress.map((active, itemIndex) => (
                            <View
                                key={itemIndex}
                                style={[
                                    tw`h-1.5 flex-1 rounded-full`,
                                    {backgroundColor: active ? "#B55941" : "rgba(228,224,212,0.18)"},
                                ]}
                            />
                        ))}
                    </View>

                    <View style={tw`mt-6 flex-row items-center justify-between gap-3`}>
                        <Pressable
                            onPress={isLast ? onComplete : goBack}
                            disabled={index === 0 && !isLast}
                            style={({pressed}) => [
                                tw`rounded-xl px-3 py-2`,
                                (index === 0 && !isLast) && tw`opacity-0`,
                                pressed && tw`opacity-70`,
                            ]}
                        >
                            <Text style={[tw`text-sm text-slate-300`, {fontFamily: fonts.button}]}>
                                {isLast ? "Skip" : "Back"}
                            </Text>
                        </Pressable>

                        <Button
                            label={isCompleting ? "Starting..." : isLast ? "Get started" : "Next"}
                            variant="outlineAccent"
                            onPress={goNext}
                            disabled={isCompleting}
                            style={tw`px-6`}
                        />
                    </View>
                </View>
            </ScrollView>
            )}
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    video: {
        width: "100%",
        height: 320,
    },
});
