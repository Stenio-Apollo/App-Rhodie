import {useEffect, useMemo, useState} from "react";
import {ImageBackground, Linking, Pressable, ScrollView, Text, View} from "react-native";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";
import {
    expertReviewedResources,
    type ExternalArticle,
    fetchNimhArticles,
    publicHealthStats,
    summarizeForApp,
} from "../lib/mental-health-feed";

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
    shadowColor: "#B55941",
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 5,
};

export function InsightsScreen() {
    const [articles, setArticles] = useState<ExternalArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const bg = require("../../public/images/rh2.jpg");

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
        <ImageBackground source={bg} style={tw`flex-1`} imageStyle={tw`opacity-58`}>
            <View style={[tw`flex-1 bg-black/8`, {paddingHorizontal: 1}]}>
                <ScrollView style={tw`flex-1`} contentContainerStyle={tw`px-4 pt-5 pb-10`}>
                    <View
                        style={[
                            tw`rounded-3xl border p-4`,
                            {
                                borderColor: "rgba(251,247,243,0.22)",
                                backgroundColor: "rgba(251,247,243,0.64)",
                            },
                        ]}
                    >
                        <Text style={[tw`text-xs font-semibold`, {
                            fontFamily: fonts.body,
                            color: "rgba(43,43,43,0.7)"
                        }]}>
                            Insights • Official sources
                        </Text>
                        <Text style={[tw`mt-1 text-2xl font-black`, {fontFamily: fonts.heading, color: "#2B2B2B"}]}>
                            The Rhodie Brief
                        </Text>
                        <Text style={[tw`mt-2 text-sm`, {fontFamily: fonts.body, color: "#2B2B2B"}]}>
                            Curated for men's mental health from official public-health and expert-reviewed sources.
                        </Text>
                    </View>

                    <View style={[tw`mt-4 rounded-3xl border p-3`, {
                        borderColor: "rgba(251,247,243,0.22)",
                        backgroundColor: "rgba(251,247,243,0.64)",
                        ...outerCardShadow
                    }]}>
                        <Text style={[tw`text-sm font-bold uppercase`, {fontFamily: fonts.heading, color: "#2B2B2B"}]}>
                            Stats (Official Sources)
                        </Text>
                        {publicHealthStats.map((stat) => (
                            <View key={stat.id} style={[tw`mt-3 rounded-2xl border p-3`, {
                                borderColor: "rgba(43,43,43,0.14)",
                                backgroundColor: "rgba(251,247,243,0.72)",
                                ...innerCardShadow
                            }]}>
                                <Text style={[tw`text-lg font-black`, {fontFamily: fonts.heading, color: "#2B2B2B"}]}>
                                    {stat.value}
                                </Text>
                                <Text style={[tw`mt-1 text-sm`, {fontFamily: fonts.heading, color: "#2B2B2B"}]}>
                                    {stat.label}
                                </Text>
                                <Text style={[tw`mt-1 text-xs`, {
                                    fontFamily: fonts.body,
                                    color: "rgba(43,43,43,0.84)"
                                }]}>
                                    {stat.context} • As of {stat.asOf}
                                </Text>
                                <Pressable
                                    onPress={() => {
                                        void openExternal(stat.sourceUrl);
                                    }}
                                    style={({pressed}) => [tw`mt-2 rounded-lg px-3 py-2`, {
                                        backgroundColor: "#B55941",
                                        ...buttonShadow
                                    }, pressed && tw`opacity-80`]}
                                >
                                    <Text style={[tw`text-xs`, {fontFamily: fonts.heading, color: "#E4E0D4"}]}>
                                        Source: {stat.sourceName}
                                    </Text>
                                </Pressable>
                            </View>
                        ))}
                    </View>

                    <View style={[tw`mt-4 rounded-3xl border p-3`, {
                        borderColor: "rgba(251,247,243,0.22)",
                        backgroundColor: "rgba(251,247,243,0.64)",
                        ...outerCardShadow
                    }]}>
                        <Text style={[tw`text-sm font-bold uppercase`, {fontFamily: fonts.heading, color: "#2B2B2B"}]}>
                            Educational Articles / Tidbits
                        </Text>
                        {expertReviewedResources.map((resource) => (
                            <View key={resource.id} style={[tw`mt-3 rounded-2xl border p-3`, {
                                borderColor: "rgba(43,43,43,0.14)",
                                backgroundColor: "rgba(251,247,243,0.72)",
                                ...innerCardShadow
                            }]}>
                                <Text style={[tw`text-sm font-bold`, {fontFamily: fonts.heading, color: "#2B2B2B"}]}>
                                    {resource.title}
                                </Text>
                                <Text style={[tw`mt-1 text-xs`, {
                                    fontFamily: fonts.body,
                                    color: "rgba(43,43,43,0.86)"
                                }]}>
                                    {resource.tidbit}
                                </Text>
                                <Pressable
                                    onPress={() => {
                                        void openExternal(resource.sourceUrl);
                                    }}
                                    style={({pressed}) => [tw`mt-2 rounded-lg px-3 py-2`, {
                                        backgroundColor: "#B55941",
                                        ...buttonShadow
                                    }, pressed && tw`opacity-80`]}
                                >
                                    <Text style={[tw`text-xs`, {fontFamily: fonts.heading, color: "#E4E0D4"}]}>
                                        Open {resource.sourceName}
                                    </Text>
                                </Pressable>
                            </View>
                        ))}
                    </View>

                    <View style={[tw`mt-4 rounded-3xl border p-3`, {
                        borderColor: "rgba(251,247,243,0.22)",
                        backgroundColor: "rgba(251,247,243,0.64)",
                        ...outerCardShadow
                    }]}>
                        <Text style={[tw`text-sm font-bold uppercase`, {fontFamily: fonts.heading, color: "#2B2B2B"}]}>
                            App-Written Summaries
                        </Text>
                        <Text style={[tw`mt-1 text-xs`, {fontFamily: fonts.body, color: "rgba(43,43,43,0.9)"}]}>
                            Simplified summaries generated from men's mental-health source titles. Tap through to read
                            the full original
                            source.
                        </Text>

                        {loading ? (
                            <Text style={[tw`mt-3 text-sm`, {fontFamily: fonts.body, color: "#2B2B2B"}]}>
                                Loading latest NIMH feed...
                            </Text>
                        ) : null}
                        {error ? (
                            <Text style={[tw`mt-2 text-xs`, {fontFamily: fonts.body, color: "#FCA5A5"}]}>
                                {error}
                            </Text>
                        ) : null}
                        {!loading && summaryCards.length === 0 ? (
                            <Text style={[tw`mt-3 text-xs`, {fontFamily: fonts.body, color: "rgba(43,43,43,0.9)"}]}>
                                No men's-mental-health feed items right now. Use the educational links above.
                            </Text>
                        ) : null}

                        {summaryCards.map((item) => (
                            <View key={item.id} style={[tw`mt-3 rounded-2xl border p-3`, {
                                borderColor: "rgba(43,43,43,0.14)",
                                backgroundColor: "rgba(251,247,243,0.72)",
                                ...innerCardShadow
                            }]}>
                                <Text style={[tw`text-sm font-bold`, {fontFamily: fonts.heading, color: "#2B2B2B"}]}>
                                    {item.title}
                                </Text>
                                <Text style={[tw`mt-1 text-xs`, {
                                    fontFamily: fonts.body,
                                    color: "rgba(43,43,43,0.86)"
                                }]}>
                                    {item.summary}
                                </Text>
                                <Text style={[tw`mt-1 text-[11px]`, {
                                    fontFamily: fonts.body,
                                    color: "rgba(43,43,43,0.72)"
                                }]}>
                                    {item.sourceName} • {prettyDate(item.publishedAt)}
                                </Text>
                                <Pressable
                                    onPress={() => {
                                        void openExternal(item.url);
                                    }}
                                    style={({pressed}) => [tw`mt-2 rounded-lg px-3 py-2`, {
                                        backgroundColor: "#B55941",
                                        ...buttonShadow
                                    }, pressed && tw`opacity-80`]}
                                >
                                    <Text style={[tw`text-xs`, {fontFamily: fonts.heading, color: "#E4E0D4"}]}>
                                        Read original source
                                    </Text>
                                </Pressable>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            </View>
        </ImageBackground>
    );
}
