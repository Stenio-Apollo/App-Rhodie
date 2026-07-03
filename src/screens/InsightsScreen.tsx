import {useEffect, useMemo, useState} from "react";
import {Linking, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle} from "react-native";
import {BlurView} from "expo-blur";
import {LinearGradient} from "expo-linear-gradient";
import {Ionicons} from "@expo/vector-icons";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";
import {
    expertReviewedResources,
    type ExternalArticle,
    fetchNimhArticles,
    publicHealthStats,
    summarizeForApp,
} from "../lib/mental-health-feed";
import {haptics} from "../lib/haptics";
import type {VisualMode} from "../state/useVisualMode";
import {ScreenBackground} from "../components/ScreenBackground";

async function openExternal(url: string): Promise<void> {
    try {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
            await Linking.openURL(url);
        }
    } catch {
        // Ignore navigation errors.
    }
}

function prettyDate(value: string | null): string {
    if (!value) return "Date unavailable";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString();
}

const outerCardShadow = {
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 3},
    elevation: 3,
};

const innerCardShadow = {
    shadowColor: "#B55941",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 5},
    elevation: 4,
};

const buttonShadow = {
    shadowColor: "#000000",
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 5},
    elevation: 6,
};
const COAST_SURFACE_COLOR = "#708090";
const GEORGIA_FROST_SURFACE_COLOR = "rgba(0,0,0,0.28)";
const GEORGIA_FROST_PANEL_COLOR = "rgba(0,0,0,0.32)";
const GEORGIA_FROST_BORDER_COLOR = "rgba(255,255,255,0.22)";
const SONNY_SURFACE_COLOR = "#000000";
const BADGE_COLOR = "#ba885a";

interface InsightsScreenProps {
    onBackToPeers?: () => void;
    visualMode: VisualMode;
}

function ButtonShine() {
    return (
        <>
            <LinearGradient
                colors={["rgba(255,255,255,0.07)", "rgba(255,255,255,0.01)", "rgba(0,0,0,0.14)"]}
                locations={[0, 0.48, 1]}
                pointerEvents="none"
                style={tw`absolute inset-0`}
            />
            <View
                pointerEvents="none"
                style={[
                    tw`absolute left-2 right-2 top-0.5 h-1 rounded-full`,
                    {backgroundColor: "rgba(255,255,255,0.035)"},
                ]}
            />
        </>
    );
}

interface ThemeStyles {
    background: ReturnType<typeof require>;
    headerBorderColor: string;
    headerSurfaceColor: string;
    sectionBorderColor: string;
    sectionSurfaceColor: string;
    itemBorderColor: string;
    itemSurfaceColor: string;
    primaryTextColor: string;
    secondaryTextColor: string;
    mutedTextColor: string;
    accentColor: string;
    buttonTextColor: string;
    backButtonColor: string;
    backButtonTextColor: string;
    blurTint: "light" | "dark";
    frosted: boolean;
}

function getInsightsTheme(visualMode: VisualMode): ThemeStyles {
    const coastMode = visualMode === "coast";
    const riverMode = visualMode === "river";
    const georgiaMode = visualMode === "georgia";
    const sonnyMode = visualMode === "sonny";

    if (georgiaMode) {
        return {
            background: require("../../public/images/rh11.jpg"),
            headerBorderColor: GEORGIA_FROST_BORDER_COLOR,
            headerSurfaceColor: GEORGIA_FROST_PANEL_COLOR,
            sectionBorderColor: GEORGIA_FROST_BORDER_COLOR,
            sectionSurfaceColor: GEORGIA_FROST_SURFACE_COLOR,
            itemBorderColor: "rgba(255,255,255,0.16)",
            itemSurfaceColor: GEORGIA_FROST_PANEL_COLOR,
            primaryTextColor: "#FFFFFF",
            secondaryTextColor: "rgba(255,255,255,0.76)",
            mutedTextColor: "rgba(255,255,255,0.6)",
            accentColor: BADGE_COLOR,
            buttonTextColor: "#111111",
            backButtonColor: GEORGIA_FROST_PANEL_COLOR,
            backButtonTextColor: "#FFFFFF",
            blurTint: "dark",
            frosted: true,
        };
    }

    if (coastMode) {
        return {
            background: require("../../public/images/newspaper 1.jpg"),
            headerBorderColor: "rgba(255,255,255,0.24)",
            headerSurfaceColor: COAST_SURFACE_COLOR,
            sectionBorderColor: "rgba(255,255,255,0.22)",
            sectionSurfaceColor: COAST_SURFACE_COLOR,
            itemBorderColor: "rgba(255,255,255,0.18)",
            itemSurfaceColor: "rgba(255,255,255,0.1)",
            primaryTextColor: "#FFFFFF",
            secondaryTextColor: "rgba(255,255,255,0.76)",
            mutedTextColor: "rgba(255,255,255,0.6)",
            accentColor: "#FF3800",
            buttonTextColor: "#FFF6E8",
            backButtonColor: "#111111",
            backButtonTextColor: "#FFFFFF",
            blurTint: "dark",
            frosted: false,
        };
    }

    if (riverMode) {
        return {
            background: require("../../public/images/newspaper 1.jpg"),
            headerBorderColor: "rgba(17,17,17,0.14)",
            headerSurfaceColor: "rgba(255,255,255,0.56)",
            sectionBorderColor: "rgba(17,17,17,0.14)",
            sectionSurfaceColor: "rgba(255,255,255,0.52)",
            itemBorderColor: "rgba(17,17,17,0.12)",
            itemSurfaceColor: "rgba(255,255,255,0.5)",
            primaryTextColor: "#111111",
            secondaryTextColor: "rgba(17,17,17,0.74)",
            mutedTextColor: "rgba(17,17,17,0.58)",
            accentColor: "#FF3800",
            buttonTextColor: "#FFF6E8",
            backButtonColor: "#FFFFFF",
            backButtonTextColor: "#111111",
            blurTint: "light",
            frosted: true,
        };
    }

    return {
        background: require("../../public/images/rh2.jpg"),
        headerBorderColor: sonnyMode ? "rgba(255,56,0,0.3)" : "rgba(251,247,243,0.22)",
        headerSurfaceColor: sonnyMode ? SONNY_SURFACE_COLOR : "rgba(251,247,243,0.64)",
        sectionBorderColor: sonnyMode ? "rgba(255,56,0,0.24)" : "rgba(251,247,243,0.22)",
        sectionSurfaceColor: sonnyMode ? "rgba(0,0,0,0.82)" : "rgba(251,247,243,0.64)",
        itemBorderColor: sonnyMode ? "rgba(255,56,0,0.18)" : "rgba(43,43,43,0.14)",
        itemSurfaceColor: sonnyMode ? "rgba(255,255,255,0.06)" : "rgba(251,247,243,0.72)",
        primaryTextColor: sonnyMode ? "#FFFFFF" : "#2B2B2B",
        secondaryTextColor: sonnyMode ? "rgba(255,255,255,0.78)" : "rgba(43,43,43,0.86)",
        mutedTextColor: sonnyMode ? "rgba(255,255,255,0.6)" : "rgba(43,43,43,0.72)",
        accentColor: sonnyMode ? "#FF3800" : "#B55941",
        buttonTextColor: "#E4E0D4",
        backButtonColor: "#000000",
        backButtonTextColor: "#E4E0D4",
        blurTint: "dark",
        frosted: sonnyMode,
    };
}

function ThemedSurface({
                          children,
                          radius = 24,
                          style,
                          theme,
                          variant = "section",
                      }: {
    children: React.ReactNode;
    radius?: number;
    style?: StyleProp<ViewStyle>;
    theme: ThemeStyles;
    variant?: "header" | "section" | "item";
}) {
    const borderColor = variant === "header" ? theme.headerBorderColor : variant === "item" ? theme.itemBorderColor : theme.sectionBorderColor;
    const backgroundColor = variant === "header" ? theme.headerSurfaceColor : variant === "item" ? theme.itemSurfaceColor : theme.sectionSurfaceColor;
    const content = (
        <>
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, {backgroundColor}]}/>
            <LinearGradient
                colors={["rgba(255,255,255,0.14)", "rgba(255,255,255,0.03)", "transparent"]}
                locations={[0, 0.5, 1]}
                pointerEvents="none"
                style={[tw`absolute left-0 right-0 top-0`, {height: "50%"}]}
            />
            {children}
        </>
    );

    if (theme.frosted) {
        return (
            <BlurView
                intensity={theme.blurTint === "light" ? 42 : 38}
                tint={theme.blurTint}
                style={[
                    tw`overflow-hidden border`,
                    {borderColor, borderRadius: radius},
                    style,
                ]}
            >
                {content}
            </BlurView>
        );
    }

    return (
        <View
            style={[
                tw`overflow-hidden border`,
                {borderColor, borderRadius: radius, backgroundColor},
                style,
            ]}
        >
            {content}
        </View>
    );
}

export function InsightsScreen({onBackToPeers, visualMode}: InsightsScreenProps) {
    const [articles, setArticles] = useState<ExternalArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const theme = useMemo(() => getInsightsTheme(visualMode), [visualMode]);

    useEffect(() => {
        let mounted = true;
        void (async () => {
            setLoading(true);
            setError(null);
            try {
                const fetched = await fetchNimhArticles(8);
                if (!mounted) return;
                setArticles(fetched);
                if (fetched.length === 0) {
                    setError("NIMH feed is temporarily unavailable. Source links are still available below.");
                }
            } catch (e) {
                if (!mounted) return;
                const message = e instanceof Error ? e.message : "Could not load NIMH articles.";
                setError(message);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    const summaryCards = useMemo(
        () =>
            articles.map((article) => ({
                ...article,
                summary: summarizeForApp(article.title),
            })),
        [articles],
    );

    return (
        <ScreenBackground visualMode={visualMode} source={theme.background}>
            <View style={[tw`flex-1`, {paddingHorizontal: 1}]}>
                <ScrollView style={tw`flex-1`} contentContainerStyle={tw`px-4 pt-5 pb-28`}>
                    <ThemedSurface theme={theme} variant="header" radius={28} style={tw`p-4`}>
                        <View style={tw`flex-row items-start justify-between gap-3`}>
                            <View style={tw`flex-1`}>
                                <Text style={[tw`text-xs font-semibold`, {
                                    fontFamily: fonts.body,
                                    color: theme.mutedTextColor
                                }]}>
                                    Insights • Official sources
                                </Text>
                                <Text style={[tw`mt-1 text-2xl font-black`, {fontFamily: fonts.heading, color: theme.primaryTextColor}]}>
                                    The Rhodie Brief
                                </Text>
                            </View>
                            {onBackToPeers ? (
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel="Back to Connect"
                                    onPress={() => {
                                        haptics.navigation();
                                        onBackToPeers();
                                    }}
                                    style={({pressed}) => [
                                        tw`flex-row items-center gap-1.5 overflow-hidden rounded-full px-3 py-2`,
                                        {backgroundColor: theme.backButtonColor, ...buttonShadow},
                                        pressed && {opacity: 0.78, transform: [{translateY: 1}]},
                                    ]}
                                >
                                    <ButtonShine/>
                                    <Ionicons name="chevron-back" size={15} color={theme.backButtonTextColor}/>
                                    <Text style={[tw`text-xs`, {fontFamily: fonts.heading, color: theme.backButtonTextColor}]}>
                                        Connect
                                    </Text>
                                </Pressable>
                            ) : null}
                        </View>
                        <Text style={[tw`mt-2 text-sm`, {fontFamily: fonts.body, color: theme.secondaryTextColor}]}>
                            Curated for men's mental health from official public-health and expert-reviewed sources.
                        </Text>
                    </ThemedSurface>

                    <ThemedSurface theme={theme} radius={28} style={[tw`mt-4 p-3`, outerCardShadow]}>
                        <Text style={[tw`text-sm font-bold uppercase`, {fontFamily: fonts.heading, color: theme.primaryTextColor}]}>
                            Stats (Official Sources)
                        </Text>
                        {publicHealthStats.map((stat) => (
                            <ThemedSurface key={stat.id} theme={theme} variant="item" radius={18} style={[tw`mt-3 p-3`, innerCardShadow]}>
                                <Text style={[tw`text-lg font-black`, {fontFamily: fonts.heading, color: theme.primaryTextColor}]}>
                                    {stat.value}
                                </Text>
                                <Text style={[tw`mt-1 text-sm`, {fontFamily: fonts.heading, color: theme.primaryTextColor}]}>
                                    {stat.label}
                                </Text>
                                <Text style={[tw`mt-1 text-xs`, {
                                    fontFamily: fonts.body,
                                    color: theme.secondaryTextColor
                                }]}>
                                    {stat.context} • As of {stat.asOf}
                                </Text>
                                <Pressable
                                    onPress={() => {
                                        haptics.selection();
                                        void openExternal(stat.sourceUrl);
                                    }}
                                    style={({pressed}) => [tw`mt-2 overflow-hidden rounded-lg px-3 py-2`, {
                                        backgroundColor: theme.accentColor,
                                        ...buttonShadow
                                    }, pressed && {opacity: 0.78, transform: [{translateY: 1}]}]}
                                >
                                    <ButtonShine/>
                                    <Text style={[tw`text-xs`, {fontFamily: fonts.heading, color: theme.buttonTextColor}]}>
                                        Source: {stat.sourceName}
                                    </Text>
                                </Pressable>
                            </ThemedSurface>
                        ))}
                    </ThemedSurface>

                    <ThemedSurface theme={theme} radius={28} style={[tw`mt-4 p-3`, outerCardShadow]}>
                        <Text style={[tw`text-sm font-bold uppercase`, {fontFamily: fonts.heading, color: theme.primaryTextColor}]}>
                            Educational Articles / Tidbits
                        </Text>
                        {expertReviewedResources.map((resource) => (
                            <ThemedSurface key={resource.id} theme={theme} variant="item" radius={18} style={[tw`mt-3 p-3`, innerCardShadow]}>
                                <Text style={[tw`text-sm font-bold`, {fontFamily: fonts.heading, color: theme.primaryTextColor}]}>
                                    {resource.title}
                                </Text>
                                <Text style={[tw`mt-1 text-xs`, {
                                    fontFamily: fonts.body,
                                    color: theme.secondaryTextColor
                                }]}>
                                    {resource.tidbit}
                                </Text>
                                <Pressable
                                    onPress={() => {
                                        haptics.selection();
                                        void openExternal(resource.sourceUrl);
                                    }}
                                    style={({pressed}) => [tw`mt-2 overflow-hidden rounded-lg px-3 py-2`, {
                                        backgroundColor: theme.accentColor,
                                        ...buttonShadow
                                    }, pressed && {opacity: 0.78, transform: [{translateY: 1}]}]}
                                >
                                    <ButtonShine/>
                                    <Text style={[tw`text-xs`, {fontFamily: fonts.heading, color: theme.buttonTextColor}]}>
                                        Open {resource.sourceName}
                                    </Text>
                                </Pressable>
                            </ThemedSurface>
                        ))}
                    </ThemedSurface>

                    <ThemedSurface theme={theme} radius={28} style={[tw`mt-4 p-3`, outerCardShadow]}>
                        <Text style={[tw`text-sm font-bold uppercase`, {fontFamily: fonts.heading, color: theme.primaryTextColor}]}>
                            App-Written Summaries
                        </Text>
                        <Text style={[tw`mt-1 text-xs`, {fontFamily: fonts.body, color: theme.secondaryTextColor}]}>
                            Simplified summaries generated from men's mental-health source titles. Tap through to read
                            the full original
                            source.
                        </Text>

                        {loading ? (
                            <Text style={[tw`mt-3 text-sm`, {fontFamily: fonts.body, color: theme.primaryTextColor}]}>
                                Loading latest NIMH feed...
                            </Text>
                        ) : null}
                        {error ? (
                            <Text style={[tw`mt-2 text-xs`, {fontFamily: fonts.body, color: "#FCA5A5"}]}>
                                {error}
                            </Text>
                        ) : null}
                        {!loading && summaryCards.length === 0 ? (
                            <Text style={[tw`mt-3 text-xs`, {fontFamily: fonts.body, color: theme.secondaryTextColor}]}>
                                No men's-mental-health feed items right now. Use the educational links above.
                            </Text>
                        ) : null}

                        {summaryCards.map((item) => (
                            <ThemedSurface key={item.id} theme={theme} variant="item" radius={18} style={[tw`mt-3 p-3`, innerCardShadow]}>
                                <Text style={[tw`text-sm font-bold`, {fontFamily: fonts.heading, color: theme.primaryTextColor}]}>
                                    {item.title}
                                </Text>
                                <Text style={[tw`mt-1 text-xs`, {
                                    fontFamily: fonts.body,
                                    color: theme.secondaryTextColor
                                }]}>
                                    {item.summary}
                                </Text>
                                <Text style={[tw`mt-1 text-[11px]`, {
                                    fontFamily: fonts.body,
                                    color: theme.mutedTextColor
                                }]}>
                                    {item.sourceName} • {prettyDate(item.publishedAt)}
                                </Text>
                                <Pressable
                                    onPress={() => {
                                        haptics.selection();
                                        void openExternal(item.url);
                                    }}
                                    style={({pressed}) => [tw`mt-2 overflow-hidden rounded-lg px-3 py-2`, {
                                        backgroundColor: theme.accentColor,
                                        ...buttonShadow
                                    }, pressed && {opacity: 0.78, transform: [{translateY: 1}]}]}
                                >
                                    <ButtonShine/>
                                    <Text style={[tw`text-xs`, {fontFamily: fonts.heading, color: theme.buttonTextColor}]}>
                                        Read original source
                                    </Text>
                                </Pressable>
                            </ThemedSurface>
                        ))}
                    </ThemedSurface>
                </ScrollView>
            </View>
        </ScreenBackground>
    );
}
