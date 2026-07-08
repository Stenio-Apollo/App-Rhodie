import {useEffect, useRef} from "react";
import {Audio, InterruptionModeAndroid, InterruptionModeIOS, type AVPlaybackSource} from "expo-av";
import type {BackgroundMusicTrackId} from "../state/useBackgroundMusic";

const BACKGROUND_MUSIC_VOLUME = 0.07;
const BACKGROUND_MUSIC_TRACK_VOLUMES: Partial<Record<BackgroundMusicTrackId, number>> = {
    forest: 0.045,
};
const FADE_IN_MS = 2600;
const FADE_OUT_MS = 1600;
const LOOP_CROSSFADE_MS = 2200;
const LOOP_CROSSFADE_TRIGGER_MS = 2400;
const LOOP_PRELOAD_WINDOW_MS = 4500;
const LOOP_POLL_MS = 180;
const FADE_STEPS = 48;

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

        const targetVolume = BACKGROUND_MUSIC_TRACK_VOLUMES[trackId] ?? BACKGROUND_MUSIC_VOLUME;

        async function getCurrentVolume(sound: Audio.Sound, fallbackVolume: number) {
            try {
                const status = await sound.getStatusAsync();
                if (status.isLoaded && typeof status.volume === "number") {
                    return status.volume;
                }
            } catch {
                // If the native sound is already unloading, fall back to the expected track volume.
            }
            return fallbackVolume;
        }

        async function unloadSound(sound: Audio.Sound, fadeDurationMs: number) {
            try {
                if (fadeDurationMs > 0) {
                    const currentVolume = await getCurrentVolume(sound, targetVolume);
                    await fadeVolume(sound, currentVolume, 0, fadeDurationMs, isCurrentTransition);
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

        async function createSound(source: AVPlaybackSource, shouldPlay: boolean) {
            const {sound} = await Audio.Sound.createAsync(
                source,
                {
                    isLooping: false,
                    shouldPlay,
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
            let activeSound = await createSound(source, true);
            let pendingSound: Audio.Sound | null = null;

            if (!isCurrentTransition()) {
                await unloadSound(activeSound, 0);
                return;
            }

            await fadeVolume(activeSound, 0, targetVolume, FADE_IN_MS, isCurrentTransition);

            async function preloadNext(): Promise<Audio.Sound | null> {
                try {
                    const sound = await createSound(source, false);
                    if (!isCurrentTransition()) {
                        await unloadSound(sound, 0);
                        return null;
                    }
                    return sound;
                } catch (error) {
                    console.warn("Background music preload error", error);
                    return null;
                }
            }

            async function performCrossfade(incomingSound: Audio.Sound) {
                const outgoingSound = activeSound;
                activeSound = incomingSound;

                try {
                    await incomingSound.setPositionAsync(0);
                    await incomingSound.setVolumeAsync(0);
                    await incomingSound.playAsync();
                } catch (error) {
                    console.warn("Background music start-next error", error);
                }

                if (!isCurrentTransition()) {
                    await unloadSound(incomingSound, 0);
                    return;
                }

                const outgoingVolume = await getCurrentVolume(outgoingSound, targetVolume);
                await Promise.allSettled([
                    fadeVolume(outgoingSound, outgoingVolume, 0, LOOP_CROSSFADE_MS, isCurrentTransition),
                    fadeVolume(incomingSound, 0, targetVolume, LOOP_CROSSFADE_MS, isCurrentTransition),
                ]);
                await unloadSound(outgoingSound, 0);
            }

            while (isCurrentTransition()) {
                await delay(LOOP_POLL_MS);

                try {
                    const status = await activeSound.getStatusAsync();
                    if (!status.isLoaded) {
                        soundsRef.current.delete(activeSound);
                        activeSound = await createSound(source, true);
                        await activeSound.setVolumeAsync(targetVolume);
                        continue;
                    }

                    if (Math.abs((status.volume ?? targetVolume) - targetVolume) > 0.01) {
                        await activeSound.setVolumeAsync(targetVolume);
                    }

                    const durationMillis = status.durationMillis ?? 0;
                    const remainingMillis = durationMillis > 0
                        ? durationMillis - status.positionMillis
                        : Number.POSITIVE_INFINITY;

                    if (status.didJustFinish) {
                        if (pendingSound) {
                            const incoming = pendingSound;
                            pendingSound = null;
                            await performCrossfade(incoming);
                        } else {
                            await activeSound.setVolumeAsync(0);
                            await activeSound.replayAsync({positionMillis: 0, shouldPlay: true, volume: 0});
                            await fadeVolume(activeSound, 0, targetVolume, LOOP_CROSSFADE_MS, isCurrentTransition);
                        }
                        continue;
                    }

                    if (durationMillis > 0 && pendingSound === null && remainingMillis <= LOOP_PRELOAD_WINDOW_MS) {
                        pendingSound = await preloadNext();
                    }

                    if (durationMillis > 0 && remainingMillis <= LOOP_CROSSFADE_TRIGGER_MS) {
                        if (pendingSound === null) {
                            pendingSound = await preloadNext();
                        }
                        if (pendingSound) {
                            const incoming = pendingSound;
                            pendingSound = null;
                            await performCrossfade(incoming);
                        }
                    } else if (!status.isPlaying && !status.isBuffering) {
                        await activeSound.playAsync();
                    }
                } catch (error) {
                    console.warn("Background music health check error", error);
                    soundsRef.current.delete(activeSound);
                    try {
                        await activeSound.unloadAsync();
                    } catch {
                        // The sound may already be unloaded after a native playback interruption.
                    }
                    if (pendingSound) {
                        await unloadSound(pendingSound, 0);
                        pendingSound = null;
                    }
                    if (!isCurrentTransition()) return;
                    activeSound = await createSound(source, true);
                    await activeSound.setVolumeAsync(targetVolume);
                }
            }

            if (pendingSound) {
                await unloadSound(pendingSound, 0);
                pendingSound = null;
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
