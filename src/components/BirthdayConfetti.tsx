import {useEffect, useMemo, useRef, useState} from "react";
import {Animated, Easing, StyleSheet, useWindowDimensions, View} from "react-native";

interface BirthdayConfettiProps {
    visible: boolean;
    triggerKey: string;
}

type ConfettiPiece = {
    id: string;
    width: number;
    height: number;
    startXRatio: number;
    startYRatio: number;
    driftX: number;
    fallDistance: number;
    rotation: number;
    delay: number;
    duration: number;
    color: string;
    shape: "dash" | "dot";
};

const CONFETTI_COLORS = [
    "#FF4F9A",
    "#36D9FF",
    "#7357FF",
    "#31E981",
    "#FEE440",
    "#FF8A3D",
    "#F7F7FF",
    "#B8FF5C",
];
const PIECE_COUNT = 210;
const MAX_DELAY_MS = 920;
const MIN_DURATION_MS = 2300;
const MAX_DURATION_MS = 3400;
const SHOWER_VISIBLE_MS = MAX_DELAY_MS + MAX_DURATION_MS + 180;

function buildPieces(): ConfettiPiece[] {
    return Array.from({length: PIECE_COUNT}, (_, index) => ({
        id: `birthday-confetti-${index}`,
        width: Math.random() > 0.84 ? 2.4 + Math.random() * 1.8 : 5 + Math.random() * 8,
        height: Math.random() > 0.84 ? 2.4 + Math.random() * 1.8 : 1.8 + Math.random() * 2.8,
        startXRatio: Math.random(),
        startYRatio: -0.16 + Math.random() * 0.72,
        driftX: -72 + Math.random() * 144,
        fallDistance: 170 + Math.random() * 330,
        rotation: -520 + Math.random() * 1040,
        delay: Math.random() * MAX_DELAY_MS,
        duration: MIN_DURATION_MS + Math.random() * (MAX_DURATION_MS - MIN_DURATION_MS),
        color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
        shape: Math.random() > 0.84 ? "dot" : "dash",
    }));
}

export function BirthdayConfetti({visible, triggerKey}: BirthdayConfettiProps) {
    const {width, height} = useWindowDimensions();
    const pieces = useMemo(buildPieces, [triggerKey]);
    const progressValues = useMemo(() => pieces.map(() => new Animated.Value(0)), [pieces]);
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
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),
            ]).start();
        });

        timeoutRef.current = setTimeout(() => {
            setBurstActive(false);
            timeoutRef.current = null;
        }, SHOWER_VISIBLE_MS);

        return () => {
            progressValues.forEach((value) => value.stopAnimation());
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, [height, pieces, progressValues, triggerKey, visible, width]);

    if (!visible || !burstActive) return null;

    return (
        <View pointerEvents="none" style={styles.container}>
            {pieces.map((piece, index) => {
                const progress = progressValues[index];
                const startX = piece.startXRatio * width;
                const startY = piece.startYRatio * height;
                const x = progress.interpolate({
                    inputRange: [0, 0.28, 0.56, 0.8, 1],
                    outputRange: [
                        startX,
                        startX + piece.driftX * 0.32,
                        startX - piece.driftX * 0.16,
                        startX + piece.driftX * 0.76,
                        startX + piece.driftX,
                    ],
                });
                const y = progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [
                        startY,
                        startY + piece.fallDistance,
                    ],
                });
                const rotate = progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", `${piece.rotation}deg`],
                });
                const opacity = progress.interpolate({
                    inputRange: [0, 0.06, 0.78, 1],
                    outputRange: [0, 1, 0.88, 0],
                });
                const scaleX = progress.interpolate({
                    inputRange: [0, 0.2, 0.4, 0.62, 0.84, 1],
                    outputRange: [0.58, 1, 0.42, 1, 0.5, 0.88],
                });

                return (
                    <Animated.View
                        key={piece.id}
                        style={[
                            styles.pieceWrap,
                            {
                                opacity,
                                transform: [{translateX: x}, {translateY: y}, {rotate}, {scaleX}],
                            },
                        ]}
                    >
                        <View
                            style={{
                                width: piece.width,
                                height: piece.height,
                                borderRadius: piece.shape === "dot" ? piece.width : 1.5,
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
