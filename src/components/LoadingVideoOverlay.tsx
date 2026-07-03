import {useEffect} from "react";
import {useVideoPlayer, VideoView} from "expo-video";
import {StyleSheet, Text, View} from "react-native";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";

interface LoadingVideoOverlayProps {
    visible: boolean;
    message?: string;
}

const loadingVideoSize = 172;

export function LoadingVideoOverlay({visible, message = "Loading..."}: LoadingVideoOverlayProps) {
    const player = useVideoPlayer(require("../../assets/videos/landcruiser.mp4"), (instance) => {
        instance.loop = true;
        instance.muted = true;
        instance.play();
    });

    useEffect(() => {
        if (visible) {
            player.play();
        } else {
            player.pause();
        }
    }, [player, visible]);

    if (!visible) return null;

    return (
        <View style={[StyleSheet.absoluteFill, tw`items-center justify-center bg-white`, {zIndex: 1000}]} pointerEvents="auto">
            <VideoView
                player={player}
                style={{width: loadingVideoSize, height: loadingVideoSize}}
                contentFit="contain"
                nativeControls={false}
                allowsFullscreen={false}
                allowsPictureInPicture={false}
            />
            <View style={tw`absolute bottom-12 items-center`}>
                <Text style={[tw`text-sm`, {fontFamily: fonts.heading, color: "#111111"}]}>{message}</Text>
            </View>
        </View>
    );
}
