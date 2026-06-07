import {Pressable, Text, View} from "react-native";
import {Asset} from "expo-asset";
import {BlurView} from "expo-blur";
import {SvgUri} from "react-native-svg";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";

export type Tab = "today" | "journal" | "board" | "calendar" | "insights";

const TAB_ITEMS: ReadonlyArray<{key: Tab; label: string; iconUri: string}> = [
    {key: "today", label: "Home", iconUri: Asset.fromModule(require("../../public/images/home.svg")).uri},
    {key: "journal", label: "Journal", iconUri: Asset.fromModule(require("../../public/images/journal.svg")).uri},
    {key: "board", label: "Tasks", iconUri: Asset.fromModule(require("../../public/images/to-do-list.svg")).uri},
    {key: "calendar", label: "Calendar", iconUri: Asset.fromModule(require("../../public/images/calendar.svg")).uri},
    {key: "insights", label: "Insights", iconUri: Asset.fromModule(require("../../public/images/insight (1).svg")).uri},
];

const ACTIVE_NAV_COLOR = "rgb(181 89 65)";

interface BottomTabBarProps {
    activeTab: Tab;
    accountOpen: boolean;
    onTabPress: (tab: Tab) => void;
}

export function BottomTabBar({activeTab, accountOpen, onTabPress}: BottomTabBarProps) {
    return (
        <View style={tw`absolute bottom-0 left-0 right-0 px-4 pb-3 pt-2`}>
            <View style={tw`overflow-hidden rounded-2xl border border-[#B55941]/33 bg-black/10 p-1`}>
                <BlurView
                    intensity={72}
                    tint="dark"
                    style={tw`overflow-hidden rounded-2xl border border-[#B55941]/69`}
                >
                    <View style={tw`flex-row justify-between bg-black/47 px-2 py-2`}>
                        {TAB_ITEMS.map((item) => {
                            const active = !accountOpen && activeTab === item.key;
                            const iconColor = active ? ACTIVE_NAV_COLOR : "#E4E0D4";
                            return (
                                <Pressable
                                    key={item.key}
                                    onPress={() => onTabPress(item.key)}
                                    style={({pressed}) => [
                                        tw`px-3 py-1 rounded-xl mt-1 mb-1 items-center border border-[#B55941]/19 bg-black/11`,
                                        active ? {borderColor: ACTIVE_NAV_COLOR} : {},
                                        pressed && tw`bg-white/5`,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            tw`text-[11px] font-bold mb-2`,
                                            {fontFamily: fonts.heading, color: "#E4E0D4"},
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
            </View>
        </View>
    );
}
