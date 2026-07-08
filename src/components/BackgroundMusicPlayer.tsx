import {useEffect, useRef} from "react";
import {Audio, InterruptionModeAndroid, InterruptionModeIOS, type AVPlaybackSource} from "expo-av";
import type {BackgroundMusicTrackId} from "../state/useBackgroundMusic";

const BACKGROUND_MUSIC_VOLUME = 0.14;
const FADE_IN_MS = 2600;
const FADE_OUT_MS = 1600;
const LOOP_CROSSFADE_MS = 4200;
const LOOP_POLL_MS = 350;
const FADE_STEPS = 36;

const BACKGROUND_MUSIC_SOURCES: Record<Exclude<BackgroundMusicTrackId, "silent">, AVPlaybackSource> = {
    alpine: require("../../public/audio/alpine.m4a"),
    forest: require("../../public/audio/forest.m4a"),
    thunder: require("../../public/audio/thunder.m4a"),
    waves: require("../../public/audio/Waves.m4a"),
};

interface BackgroundMusicPlayerProps {
    trackId: BackgroundMusicTrackId;
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function easeInOut(progress: number): number {
    return progress * progress * (3 - 2 * progress);
}

async function fadeVolume(
    sound: Audio.Sound,
    fromVolume: number,
    toVolume: number,
    durationMs: number,
    shouldContinue: () => boolean,
): Promise<void> {
    const stepDelay = Math.max(16, Math.round(durationMs / FADE_STEPS));

    for (let step = 0; step <= FADE_STEPS; step += 1) {
        if (!shouldContinue()) return;
        const progress = easeInOut(step / FADE_STEPS);
        const volume = fromVolume + (toVolume - fromVolume) * progress;
        await sound.setVolumeAsync(Math.max(0, Math.min(1, volume)));
        if (step < FADE_STEPS) {
            await delay(stepDelay);
        }
    }
}

export function BackgroundMusicPlayer({trackId}: BackgroundMusicPlayerProps) {
    const soundsRef = useRef<Set<Audio.Sound>>(new Set());
    const transitionRef = useRef(0);

    useEffect(() => {
        let cancelled = false;
        const transitionId = transitionRef.current + 1;
        transitionRef.current = transitionId;

        function isCurrentTransition() {
            return !cancelled && transitionRef.current === transitionId;
        }

        async function unloadSound(sound: Audio.Sound, fadeDurationMs: number) {
            try {
                if (fadeDurationMs > 0) {
                    await fadeVolume(sound, BACKGROUND_MUSIC_VOLUME, 0, fadeDurationMs, isCurrentTransition);
                }
                await sound.stopAsync();
                await sound.unloadAsync();
            } catch (error) {
                console.warn("Background music unload error", error);
            } finally {
                soundsRef.current.delete(sound);
            }
        }

        async function unloadCurrentSounds() {
            const currentSounds = Array.from(soundsRef.current);
            if (currentSounds.length === 0) return;

            await Promise.all(currentSounds.map((sound) => unloadSound(sound, FADE_OUT_MS)));
        }

        async function createSound(source: AVPlaybackSource) {
            const {sound} = await Audio.Sound.createAsync(
                source,
                {
                    isLooping: true,
                    shouldPlay: true,
                    volume: 0,
                    progressUpdateIntervalMillis: LOOP_POLL_MS,
                },
                null,
                true,
            );
            soundsRef.current.add(sound);
            return sound;
        }

        async function startManagedLoop(source: AVPlaybackSource) {
            let activeSound = await createSound(source);
            if (!isCurrentTransition()) {
                await unloadSound(activeSound, 0);
                return;
            }

            await fadeVolume(activeSound, 0, BACKGROUND_MUSIC_VOLUME, FADE_IN_MS, isCurrentTransition);

            while (isCurrentTransition()) {
                const status = await activeSound.getStatusAsync();
                if (!status.isLoaded) {
                    soundsRef.current.delete(activeSound);
                    await delay(LOOP_POLL_MS);
                    activeSound = await createSound(source);
                    await activeSound.setVolumeAsync(BACKGROUND_MUSIC_VOLUME);
                    continue;
                }

                if (!status.isPlaying && !status.isBuffering) {
                    try {
                        await activeSound.playAsync();
                    } catch (error) {
                        console.warn("Background music resume error", error);
                    }
                }

                const durationMillis = status.durationMillis ?? 0;
                const remainingMillis = durationMillis - status.positionMillis;
                const crossfadeMillis = durationMillis > 0
                    ? Math.min(LOOP_CROSSFADE_MS, Math.max(1200, durationMillis * 0.28))
                    : LOOP_CROSSFADE_MS;

                if (durationMillis > 0 && remainingMillis <= crossfadeMillis) {
                    const outgoingSound = activeSound;
                    const incomingSound = await createSound(source);
                    activeSound = incomingSound;

                    if (!isCurrentTransition()) {
                        await unloadSound(incomingSound, 0);
                        return;
                    }

                    await Promise.all([
                        fadeVolume(outgoingSound, BACKGROUND_MUSIC_VOLUME, 0, crossfadeMillis, isCurrentTransition),
                        fadeVolume(incomingSound, 0, BACKGROUND_MUSIC_VOLUME, crossfadeMillis, isCurrentTransition),
                    ]);
                    await unloadSound(outgoingSound, 0);
                } else if (status.didJustFinish) {
                    await activeSound.replayAsync({positionMillis: 0, shouldPlay: true, volume: BACKGROUND_MUSIC_VOLUME});
                } else {
                    await delay(LOOP_POLL_MS);
                }
            }
        }

        async function startTrack() {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });

            await unloadCurrentSounds();
            if (!isCurrentTransition() || trackId === "silent") return;

            const source = BACKGROUND_MUSIC_SOURCES[trackId];
            await startManagedLoop(source);
        }

        void startTrack().catch((error) => {
            console.warn("Background music playback error", error);
        });

        return () => {
            cancelled = true;
        };
    }, [trackId]);

    useEffect(() => {
        return () => {
            const currentSounds = Array.from(soundsRef.current);
            soundsRef.current.clear();
            currentSounds.forEach((sound) => {
                void sound.unloadAsync();
            });
        };
    }, []);

    return null;
}
