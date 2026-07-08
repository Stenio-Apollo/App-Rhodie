import {type PropsWithChildren, useEffect, useRef} from "react";
import {Animated, Easing, StyleSheet, View} from "react-native";
import {LinearGradient} from "expo-linear-gradient";

const GLOW = "#DAC8AE";
const GLOW_FAINT = "rgba(218,200,174,0.10)";
const GLOW_LOW = "rgba(218,200,174,0.28)";
const GLOW_MID = "rgba(218,200,174,0.55)";
const GLOW_HIGH = "rgba(218,200,174,0.82)";

const DEFAULT_HALO_WIDTH = 4;
const SNAKE_EXTENT = 520;
const ROTATION_DURATION_MS = 5800;
const ROTATION_ITERATIONS = 1000;

interface SnakeGlowProps {
    radius: number;
    haloWidth?: number;
    active?: boolean;
}

export function SnakeGlow({
                              radius,
                              haloWidth = DEFAULT_HALO_WIDTH,
                              active = true,
                              children,
                          }: PropsWithChildren<SnakeGlowProps>) {
    const rotation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!active) return;
        rotation.setValue(0);
        const animation = Animated.timing(rotation, {
            toValue: ROTATION_ITERATIONS,
            duration: ROTATION_DURATION_MS * ROTATION_ITERATIONS,
            easing: Easing.linear,
            useNativeDriver: true,
        });
        animation.start();
        return () => {
            animation.stop();
        };
    }, [active, rotation]);

    const spin = rotation.interpolate({
        inputRange: [0, ROTATION_ITERATIONS],
        outputRange: ["0deg", `${ROTATION_ITERATIONS * 360}deg`],
    });

    const gradientColors = [
        "transparent",
        GLOW_FAINT,
        GLOW_LOW,
        GLOW_MID,
        GLOW_HIGH,
        GLOW,
        GLOW_HIGH,
        GLOW_MID,
        GLOW_LOW,
        GLOW_FAINT,
        "transparent",
    ] as const;
    const gradientLocations = [0, 0.22, 0.32, 0.4, 0.46, 0.5, 0.54, 0.6, 0.68, 0.78, 1] as const;

    const haloRadius = radius + haloWidth;

    return (
        <View style={{position: "relative"}}>
            <View
                pointerEvents="none"
                style={{
                    position: "absolute",
                    top: -haloWidth,
                    bottom: -haloWidth,
                    left: -haloWidth,
                    right: -haloWidth,
                    borderRadius: haloRadius,
                    overflow: "hidden",
                }}
            >
                <Animated.View
                    style={[
                        StyleSheet.absoluteFill,
                        {
                            left: -SNAKE_EXTENT,
                            right: -SNAKE_EXTENT,
                            top: -SNAKE_EXTENT,
                            bottom: -SNAKE_EXTENT,
                            transform: [{rotate: spin}],
                        },
                    ]}
                >
                    <LinearGradient
                        colors={gradientColors}
                        locations={gradientLocations}
                        start={{x: 0, y: 0.5}}
                        end={{x: 1, y: 0.5}}
                        style={StyleSheet.absoluteFill}
                    />
                </Animated.View>
            </View>
            {children}
        </View>
    );
}
