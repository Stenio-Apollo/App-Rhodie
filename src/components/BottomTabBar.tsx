import {type ComponentProps, useEffect, useRef, useState} from "react";
import {Animated, Easing, type LayoutChangeEvent, Pressable, StyleSheet, Text, View} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import {BlurView} from "expo-blur";
import {LinearGradient} from "expo-linear-gradient";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import tw from "../lib/tw";
import type {VisualMode} from "../state/useVisualMode";
import {fonts} from "../theme/fonts";

export type Tab = "today" | "journal" | "board" | "plan" | "calendar" | "insights" | "community";

type TabIconName = ComponentProps<typeof Ionicons>["name"];

const TAB_ITEMS: ReadonlyArray<{ key: Tab; label: string; icon: TabIconName; activeIcon: TabIconName }> = [
    {key: "today", label: "Home", icon: "home-outline", activeIcon: "home"},
    {key: "plan", label: "Plan", icon: "time-outline", activeIcon: "time"},
    {key: "journal", label: "Journal", icon: "book-outline", activeIcon: "book"},
    {key: "calendar", label: "Calendar", icon: "calendar-outline", activeIcon: "calendar"},
    {key: "community", label: "Connect", icon: "people-outline", activeIcon: "people"},
];

const ACTIVE_NAV_COLOR = "#B55941";
const SUNSET_NAV_COLOR = "#B55941";
const INACTIVE_COLOR = "#E4E0D4";
const ROW_HORIZONTAL_PADDING = 3;
const PILL_HORIZONTAL_INSET = 3;
const PILL_VERTICAL_INSET = 3;
const BAR_VERTICAL_OFFSET = 33;

interface BottomTabBarProps {
    activeTab: Tab;
    accountOpen: boolean;
    visualMode: VisualMode;
    onTabPress: (tab: Tab) => void;
}

function hexToRgba(hex: string, opacity: number): string {
    const normalized = hex.replace("#", "");
    const red = Number.parseInt(normalized.slice(0, 2), 16);
    const green = Number.parseInt(normalized.slice(2, 4), 16);
    const blue = Number.parseInt(normalized.slice(4, 6), 16);
    return `rgba(${red},${green},${blue},${opacity})`;
}

export function BottomTabBar({activeTab, accountOpen, visualMode, onTabPress}: BottomTabBarProps) {
    const insets = useSafeAreaInsets();
    const [rowWidth, setRowWidth] = useState(0);
    const tabCount = TAB_ITEMS.length;
    const activeIndex = accountOpen ? -1 : TAB_ITEMS.findIndex((item) => item.key === activeTab);
    const activeNavColor = visualMode === "sunset" ? SUNSET_NAV_COLOR : ACTIVE_NAV_COLOR;
    const navBorderSoft = hexToRgba(activeNavColor, 0.23);
    const navBorderStrong = hexToRgba(activeNavColor, 0.39);
    const pillBorderColor = hexToRgba(activeNavColor, 0.43);
    const rippleBorderColor = hexToRgba(activeNavColor, 0.33);

    const tabWidth = rowWidth > 0 ? (rowWidth - ROW_HORIZONTAL_PADDING * 2) / tabCount : 0;
    const pillWidth = Math.max(0, tabWidth - PILL_HORIZONTAL_INSET * 2);

    const pillTranslateX = useRef(new Animated.Value(0)).current;
    const pillScaleX = useRef(new Animated.Value(1)).current;
    const pillScaleY = useRef(new Animated.Value(1)).current;
    const rippleScale = useRef(new Animated.Value(0)).current;
    const rippleOpacity = useRef(new Animated.Value(0)).current;
    const barScaleX = useRef(new Animated.Value(1)).current;
    const barScaleY = useRef(new Animated.Value(1)).current;
    const barTranslateY = useRef(new Animated.Value(0)).current;
    const hasAnimatedOnce = useRef(false);

    function pulseBar() {
        Animated.sequence([
            Animated.parallel([
                Animated.timing(barScaleX, {
                    toValue: 1.006,
                    duration: 110,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(barScaleY, {
                    toValue: 1.012,
                    duration: 110,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(barTranslateY, {
                    toValue: -2,
                    duration: 110,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
            ]),
            Animated.parallel([
                Animated.timing(barScaleX, {
                    toValue: 1,
                    duration: 240,
                    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
                    useNativeDriver: true,
                }),
                Animated.timing(barScaleY, {
                    toValue: 1,
                    duration: 240,
                    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
                    useNativeDriver: true,
                }),
                Animated.timing(barTranslateY, {
                    toValue: 0,
                    duration: 240,
                    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
                    useNativeDriver: true,
                }),
            ]),
        ]).start();
    }

    useEffect(() => {
        if (tabWidth === 0 || activeIndex < 0) return;
        const target = activeIndex * tabWidth;

        if (!hasAnimatedOnce.current) {
            pillTranslateX.setValue(target);
            hasAnimatedOnce.current = true;
            return;
        }

        // Slide
        Animated.spring(pillTranslateX, {
            toValue: target,
            useNativeDriver: true,
            stiffness: 220,
            damping: 22,
            mass: 0.9,
        }).start();

        // Squash + stretch during motion: pill briefly elongates horizontally
        // then springs back to natural shape at the destination.
        Animated.sequence([
            Animated.parallel([
                Animated.timing(pillScaleX, {
                    toValue: 1.18,
                    duration: 130,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(pillScaleY, {
                    toValue: 0.88,
                    duration: 130,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
            ]),
            Animated.parallel([
                Animated.spring(pillScaleX, {
                    toValue: 1,
                    useNativeDriver: true,
                    stiffness: 280,
                    damping: 16,
                    mass: 0.7,
                }),
                Animated.spring(pillScaleY, {
                    toValue: 1,
                    useNativeDriver: true,
                    stiffness: 280,
                    damping: 16,
                    mass: 0.7,
                }),
            ]),
        ]).start();

        // Ripple ring emanates from the destination once the pill is close to settled.
        rippleScale.setValue(0.65);
        rippleOpacity.setValue(0.62);
        Animated.parallel([
            Animated.timing(rippleScale, {
                toValue: 1.68,
                duration: 560,
                delay: 140,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(rippleOpacity, {
                toValue: 0,
                duration: 560,
                delay: 140,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
        ]).start();
    }, [activeIndex, pillScaleX, pillScaleY, pillTranslateX, rippleOpacity, rippleScale, tabWidth]);

    function handleRowLayout(event: LayoutChangeEvent) {
        const width = event.nativeEvent.layout.width;
        if (width !== rowWidth) setRowWidth(width);
    }

    return (
        <View
            style={[
                tw`absolute bottom-0 left-0 right-0 px-4 pt-2`,
                {
                    paddingBottom: Math.max(12, insets.bottom + 8),
                    transform: [{translateY: BAR_VERTICAL_OFFSET}],
                },
            ]}
        >
            <Animated.View
                style={[
                    tw`overflow-hidden rounded-full  p-1`,
                    {
                        borderColor: navBorderSoft,
                        transform: [
                            {translateY: barTranslateY},
                            {scaleX: barScaleX},
                            {scaleY: barScaleY},
                        ],
                    },
                ]}
            >
                <BlurView
                    intensity={72}
                    tint="dark"
                    style={[tw`overflow-hidden rounded-full border`, {borderColor: navBorderStrong}]}
                >
                    {/* Base tint behind everything */}
                    <View
                        pointerEvents="none"
                        style={[StyleSheet.absoluteFill, {backgroundColor: "rgba(0,0,0,0.49)"}]}
                    />

                    {/* Top rim highlight — the "shine" */}
                    <LinearGradient
                        colors={["rgba(255,255,255,0.18)", "rgba(255,255,255,0.04)", "transparent"]}
                        locations={[0, 0.5, 1]}
                        pointerEvents="none"
                        style={[tw`absolute left-0 right-0 top-0`, {height: "55%"}]}
                    />

                    {/* Bottom rim shadow */}
                    <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.35)"]}
                        pointerEvents="none"
                        style={[tw`absolute left-0 right-0 bottom-0`, {height: "30%"}]}
                    />

                    {/* Tab row */}
                    <View onLayout={handleRowLayout} style={[tw`flex-row px-2 py-1.5`, {paddingVertical: 10}]}>
                        {/* Sliding active pill — rendered behind the tabs */}
                        {tabWidth > 0 && activeIndex >= 0 ? (
                            <Animated.View
                                pointerEvents="none"
                                style={[
                                    tw`absolute rounded-full border`,
                                    {
                                        width: pillWidth,
                                        top: PILL_VERTICAL_INSET,
                                        bottom: PILL_VERTICAL_INSET,
                                        left: ROW_HORIZONTAL_PADDING + PILL_HORIZONTAL_INSET,
                                        borderColor: pillBorderColor,
                                        backgroundColor: "rgb(255 255 255 / 0.22)",
                                        transform: [
                                            {translateX: pillTranslateX},
                                            {scaleX: pillScaleX},
                                            {scaleY: pillScaleY},
                                        ],
                                    },
                                ]}
                            >
                                {/* Inner top highlight inside the pill */}
                                <LinearGradient
                                    colors={["rgba(255,255,255,0.18)", "transparent"]}
                                    pointerEvents="none"
                                    style={[StyleSheet.absoluteFill, tw`rounded-full`]}
                                />
                                {/* Ripple ring — emanates from the destination on tab change */}
                                <Animated.View
                                    pointerEvents="none"
                                    style={[
                                        StyleSheet.absoluteFill,
                                        tw`rounded-full border`,
                                        {
                                            borderColor: rippleBorderColor,
                                            opacity: rippleOpacity,
                                            transform: [{scale: rippleScale}],
                                        },
                                    ]}
                                />
                            </Animated.View>
                        ) : null}

                        {TAB_ITEMS.map((item) => {
                            const active = !accountOpen && activeTab === item.key;
                            const iconColor = active ? activeNavColor : INACTIVE_COLOR;
                            const iconName = active ? item.activeIcon : item.icon;
                            return (
                                <Pressable
                                    key={item.key}
                                    onPress={() => {
                                        pulseBar();
                                        onTabPress(item.key);
                                    }}
                                    style={({pressed}) => [
                                        tw`flex-1 items-center justify-center px-1 py-0.5`,
                                        pressed && {transform: [{scale: 0.94}], opacity: 0.85},
                                    ]}
                                >
                                    <Text
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                        minimumFontScale={0.75}
                                        style={[
                                            tw`text-[10px] font-bold mb-1`,
                                            {fontFamily: fonts.heading, color: INACTIVE_COLOR},
                                        ]}
                                    >
                                        {item.label}
                                    </Text>
                                    <Ionicons
                                        name={iconName}
                                        size={22}
                                        color={iconColor}
                                    />
                                </Pressable>
                            );
                        })}
                    </View>
                </BlurView>
            </Animated.View>
        </View>
    );
}
