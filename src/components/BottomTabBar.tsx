import {useEffect, useRef, useState} from "react";
import {Animated, Easing, type LayoutChangeEvent, Pressable, StyleSheet, Text, View} from "react-native";
import {Asset} from "expo-asset";
import {BlurView} from "expo-blur";
import {LinearGradient} from "expo-linear-gradient";
import {SvgUri} from "react-native-svg";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";

export type Tab = "today" | "journal" | "board" | "calendar" | "insights";

const TAB_ITEMS: ReadonlyArray<{ key: Tab; label: string; iconUri: string }> = [
    {key: "today", label: "Home", iconUri: Asset.fromModule(require("../../public/images/home.svg")).uri},
    {key: "journal", label: "Journal", iconUri: Asset.fromModule(require("../../public/images/journal.svg")).uri},
    {key: "board", label: "Tasks", iconUri: Asset.fromModule(require("../../public/images/to-do-list.svg")).uri},
    {key: "calendar", label: "Calendar", iconUri: Asset.fromModule(require("../../public/images/calendar.svg")).uri},
    {key: "insights", label: "Insights", iconUri: Asset.fromModule(require("../../public/images/insight (1).svg")).uri},
];

const ACTIVE_NAV_COLOR = "#B55941";
const INACTIVE_COLOR = "#E4E0D4";
const ROW_HORIZONTAL_PADDING = 8;
const PILL_HORIZONTAL_INSET = 4;
const PILL_VERTICAL_INSET = 4;

interface BottomTabBarProps {
    activeTab: Tab;
    accountOpen: boolean;
    onTabPress: (tab: Tab) => void;
}

export function BottomTabBar({activeTab, accountOpen, onTabPress}: BottomTabBarProps) {
    const [rowWidth, setRowWidth] = useState(0);
    const tabCount = TAB_ITEMS.length;
    const activeIndex = accountOpen ? -1 : TAB_ITEMS.findIndex((item) => item.key === activeTab);

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
                    toValue: 1.003,
                    duration: 110,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(barScaleY, {
                    toValue: 1.008,
                    duration: 110,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(barTranslateY, {
                    toValue: -1,
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
                    toValue: 1.14,
                    duration: 130,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(pillScaleY, {
                    toValue: 0.9,
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
        rippleOpacity.setValue(0.55);
        Animated.parallel([
            Animated.timing(rippleScale, {
                toValue: 1.55,
                duration: 520,
                delay: 140,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(rippleOpacity, {
                toValue: 0,
                duration: 520,
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
        <View style={tw`absolute bottom-0 left-0 right-0 px-4 pb-3 pt-2`}>
            <Animated.View
                style={[
                    tw`overflow-hidden rounded-full border border-[#B55941]/33 bg-black/10 p-1`,
                    {
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
                    style={tw`overflow-hidden rounded-full border border-[#B55941]/69`}
                >
                    {/* Base tint behind everything */}
                    <View
                        pointerEvents="none"
                        style={[StyleSheet.absoluteFill, {backgroundColor: "rgba(0,0,0,0.47)"}]}
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
                    <View onLayout={handleRowLayout} style={tw`flex-row px-2 py-2`}>
                        {/* Sliding active pill — rendered behind the tabs */}
                        {tabWidth > 0 && activeIndex >= 0 ? (
                            <Animated.View
                                pointerEvents="none"
                                style={[
                                    tw`absolute rounded-full border border-[#B55941]/43`,
                                    {
                                        width: pillWidth,
                                        top: PILL_VERTICAL_INSET,
                                        bottom: PILL_VERTICAL_INSET,
                                        left: ROW_HORIZONTAL_PADDING + PILL_HORIZONTAL_INSET,
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
                                        tw`rounded-full border border-[#B55941]/33`,
                                        {
                                            opacity: rippleOpacity,
                                            transform: [{scale: rippleScale}],
                                        },
                                    ]}
                                />
                            </Animated.View>
                        ) : null}

                        {TAB_ITEMS.map((item) => {
                            const active = !accountOpen && activeTab === item.key;
                            const iconColor = active ? ACTIVE_NAV_COLOR : INACTIVE_COLOR;
                            return (
                                <Pressable
                                    key={item.key}
                                    onPress={() => {
                                        pulseBar();
                                        onTabPress(item.key);
                                    }}
                                    style={({pressed}) => [
                                        tw`flex-1 items-center justify-center py-1`,
                                        pressed && {transform: [{scale: 0.94}], opacity: 0.85},
                                    ]}
                                >
                                    <Text
                                        style={[
                                            tw`text-[11px] font-bold mb-1.5`,
                                            {fontFamily: fonts.heading, color: INACTIVE_COLOR},
                                        ]}
                                    >
                                        {item.label}
                                    </Text>
                                    <SvgUri
                                        width={24}
                                        height={24}
                                        uri={item.iconUri}
                                        fill={iconColor}
                                        stroke={iconColor}
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
