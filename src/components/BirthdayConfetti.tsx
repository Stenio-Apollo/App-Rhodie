import {useEffect, useMemo, useRef, useState} from "react";
import {Animated, Easing, StyleSheet, useWindowDimensions, View} from "react-native";

interface BirthdayConfettiProps {
    visible: boolean;
    triggerKey: string;
}

type ConfettiPiece = {
    id: string;
    size: number;
    height: number;
    launchOffset: number;
    peakHeight: number;
    spreadX: number;
    settleX: number;
    rotation: number;
    delay: number;
    duration: number;
    color: string;
    shape: "rect" | "circle";
};

const CONFETTI_COLORS = ["#FFEDD5", "#FED7AA", "#FDBA74", "#FBB26B"];
const PIECE_COUNT = 148;

function buildPieces(): ConfettiPiece[] {
    return Array.from({length: PIECE_COUNT}, (_, index) => ({
        id: `birthday-confetti-${index}`,
        size: 2 + Math.random() * 2.2,
        height: 4 + Math.random() * 4.5,
        launchOffset: -8 + Math.random() * 16,
        peakHeight: 210 + Math.random() * 240,
        spreadX: -170 + Math.random() * 340,
        settleX: -38 + Math.random() * 76,
        rotation: -260 + Math.random() * 520,
        delay: Math.random() * 220,
        duration: 1650 + Math.random() * 550,
        color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
        shape: Math.random() > 0.8 ? "circle" : "rect",
    }));
}

export function BirthdayConfetti({visible, triggerKey}: BirthdayConfettiProps) {
    const {width, height} = useWindowDimensions();
    const pieces = useMemo(buildPieces, []);
    const progressValues = useRef(pieces.map(() => new Animated.Value(0))).current;
    const [burstActive, setBurstActive] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        progressValues.forEach((value) => {
            value.stopAnimation();
            value.setValue(0);
        });
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        if (!visible || width <= 0 || height <= 0) {
            setBurstActive(false);
            return;
        }

        setBurstActive(true);

        pieces.forEach((piece, index) => {
            Animated.sequence([
                Animated.delay(piece.delay),
                Animated.timing(progressValues[index], {
                    toValue: 1,
                    duration: piece.duration,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
            ]).start();
        });

        timeoutRef.current = setTimeout(() => {
            setBurstActive(false);
            timeoutRef.current = null;
        }, 1900);

        return () => {
            progressValues.forEach((value) => value.stopAnimation());
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, [height, pieces, progressValues, triggerKey, visible, width]);

    if (!visible || !burstActive) return null;

    const centerX = width / 2;
    const launchY = height - 76;

    return (
        <View pointerEvents="none" style={styles.container}>
            {pieces.map((piece, index) => {
                const progress = progressValues[index];
                const startX = centerX + piece.launchOffset;
                const x = progress.interpolate({
                    inputRange: [0, 0.22, 0.68, 1],
                    outputRange: [
                        startX,
                        startX + piece.spreadX * 0.3,
                        startX + piece.spreadX,
                        startX + piece.spreadX + piece.settleX * 0.6,
                    ],
                });
                const y = progress.interpolate({
                    inputRange: [0, 0.26, 0.72, 1],
                    outputRange: [
                        launchY,
                        launchY - piece.peakHeight * 0.76,
                        launchY - piece.peakHeight,
                        launchY - piece.peakHeight * 0.82,
                    ],
                });
                const rotate = progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", `${piece.rotation}deg`],
                });
                const opacity = progress.interpolate({
                    inputRange: [0, 0.08, 0.58, 1],
                    outputRange: [0, 1, 0.95, 0],
                });

                return (
                    <Animated.View
                        key={piece.id}
                        style={[
                            styles.pieceWrap,
                            {
                                opacity,
                                transform: [{translateX: x}, {translateY: y}, {rotate}],
                            },
                        ]}
                    >
                        <View
                            style={{
                                width: piece.size,
                                height: piece.height,
                                borderRadius: piece.shape === "circle" ? piece.size : 1.5,
                                backgroundColor: piece.color,
                            }}
                        />
                    </Animated.View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 120,
        overflow: "hidden",
    },
    pieceWrap: {
        position: "absolute",
        top: 0,
        left: 0,
    },
});
