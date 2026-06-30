import {useEffect, useMemo, useRef, useState} from "react";
import {
    Animated,
    ImageBackground,
    type ImageRequireSource,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
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
        body: "Home keeps the essentials close: tap the sticky note to add quick notes, add it to Tasks when it becomes action, and use Sonny/Coast in the header to switch the app's background mood.",
    },
    {
        eyebrow: "Plan",
        title: "Beat the Burn-out",
        body: "Plan your day here! Create a block and we'll remind you 15 mins before it starts.",
        video: require("../../public/videos/plan.mov"),
    },
    {
        eyebrow: "Journal",
        title: "Let's Talk about it, robot to man!",
        body: "I'll give you the prompts and you give me your thoughts! Deal? Oh and don't forget your '3 good things' ",
        video: require("../../public/videos/journal.mov"),
    },
    {
        eyebrow: "Tasks",
        title: "get things done here",
        body: "Create... Complete... Delete... Repeat",
        video: require("../../public/videos/tasks.mov"),
    },
    {
        eyebrow: "Calendar",
        title: "Set the weekly target",
        body: "Rhodie keeps you accountable here, set a goal and we'll check in daily. Every completed goal is 1pt, every 3pts is a badge for your home screen.",
        video: require("../../public/videos/calendar.mov"),
    },
    {
        eyebrow: "Ready",
        title: "You are set.",
        body: "You can replay this guide from Account any time. Start on Home, use the sticky note for quick capture, and tap the Sonny/Coast pill in the header whenever you want a different visual feel.",
    },
];

function IntroVideo({onDone}: { onDone: () => void }) {
    const [hasError, setHasError] = useState(false);
    const [isDismissing, setIsDismissing] = useState(false);
    const dismissingRef = useRef(false);
    const opacity = useRef(new Animated.Value(1)).current;
    const player = useVideoPlayer(require("../../public/videos/rh.rhodie-ota.mp4"), (instance) => {
        instance.loop = false;
        instance.muted = false;
        instance.volume = 1;
        instance.play();
    });

    function finishIntro() {
        if (dismissingRef.current) return;
        dismissingRef.current = true;
        setIsDismissing(true);
        player.pause();
        Animated.timing(opacity, {
            toValue: 0,
            duration: 360,
            useNativeDriver: true,
        }).start(() => {
            onDone();
        });
    }

    useEffect(() => {
        const statusSubscription = player.addListener("statusChange", ({status}) => {
            if (status === "error") {
                setHasError(true);
            }
        });
        const endSubscription = player.addListener("playToEnd", finishIntro);
        player.replay();

        return () => {
            statusSubscription.remove();
            endSubscription.remove();
        };
    }, [player]);

    return (
        <Animated.View style={[styles.intro, {opacity}]}>
            {hasError ? (
                <View style={tw`flex-1 items-center justify-center bg-black px-8`}>
                    <Text style={[tw`text-center text-3xl text-[#E4E0D4]`, {fontFamily: fonts.display}]}>
                        Rhodie
                    </Text>
                    <Text style={[tw`mt-3 text-center text-sm leading-5 text-slate-300`, {fontFamily: fonts.body}]}>
                        Opening your first guide.
                    </Text>
                </View>
            ) : (
                <VideoView
                    player={player}
                    style={styles.introVideo}
                    contentFit="cover"
                    nativeControls={false}
                    allowsFullscreen={false}
                    allowsPictureInPicture={false}
                />
            )}

            <View style={tw`absolute inset-x-0 bottom-0 px-5 pb-10`}>
                <View style={tw`items-end`}>
                    <Pressable
                        onPress={() => {
                            haptics.selection();
                            finishIntro();
                        }}
                        disabled={isDismissing}
                        style={({pressed}) => [
                            tw`rounded-xl border border-[#E4E0D4]/25 bg-black/45 px-4 py-2`,
                            pressed && tw`opacity-70`,
                        ]}
                    >
                        <Text style={[tw`text-sm text-[#E4E0D4]`, {fontFamily: fonts.button}]}>
                            Skip
                        </Text>
                    </Pressable>
                </View>
            </View>
        </Animated.View>
    );
}

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
    const [showIntro, setShowIntro] = useState(true);
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

    if (showIntro) {
        return <IntroVideo onDone={() => setShowIntro(false)}/>;
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
                        <Text
                            style={[tw`text-[11px] uppercase tracking-[5px] text-[#B55941]`, {fontFamily: fonts.strong}]}>
                            Rhodie
                        </Text>
                        <Text style={[tw`mt-3 text-4xl leading-tight text-[#E4E0D4]`, {fontFamily: fonts.display}]}>
                            A calmer way to hold the day together.
                        </Text>
                    </View>

                    <View style={tw`rounded-[32px] border border-[#B55941]/50 bg-black/70 p-5`}>
                        <Text
                            style={[tw`text-[10px] uppercase tracking-[3px] text-[#B55941]`, {fontFamily: fonts.strong}]}>
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
    intro: {
        flex: 1,
        backgroundColor: "#000000",
    },
    introVideo: {
        ...StyleSheet.absoluteFillObject,
        width: "100%",
        height: "100%",
    },
    video: {
        width: "100%",
        height: 320,
    },
});
