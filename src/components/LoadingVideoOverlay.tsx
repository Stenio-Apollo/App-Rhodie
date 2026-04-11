import {useEffect} from "react";
import {useVideoPlayer, VideoView} from "expo-video";
import {StyleSheet, Text, View} from "react-native";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";

interface LoadingVideoOverlayProps {
    visible: boolean;
    message?: string;
}

const videoFrameStyle = {
    ...StyleSheet.absoluteFillObject,
    width: "120%" as const,
    left: "-16%" as const,
};

export function LoadingVideoOverlay({visible, message = "Loading..."}: LoadingVideoOverlayProps) {
    const player = useVideoPlayer(require("../../assets/videos/rhloading3.mp4"), (instance) => {
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
        <View style={[StyleSheet.absoluteFill, {zIndex: 1000}]} pointerEvents="auto">
            <VideoView
                player={player}
                style={videoFrameStyle}
                contentFit="cover"
                nativeControls={false}
                allowsFullscreen={false}
                allowsPictureInPicture={false}
            />
            <View style={tw`flex-1 items-center justify-end bg-black/35 pb-12`}>
                <Text style={[tw`text-sm`, {fontFamily: fonts.heading, color: "#E4E0D4"}]}>{message}</Text>
            </View>
        </View>
    );
}
