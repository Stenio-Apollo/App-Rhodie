import {StyleSheet, View} from "react-native";
import {Calendar, type CalendarProps} from "react-native-calendars";
import {BlurView} from "expo-blur";
import {LinearGradient} from "expo-linear-gradient";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";
import {useScreenVisualMode} from "./ScreenBackground";

type MarkedDates = NonNullable<CalendarProps["markedDates"]>;

interface TranslucentCalendarProps {
    markedDates: MarkedDates;
    onDayPress: NonNullable<CalendarProps["onDayPress"]>;
}

export function TranslucentCalendar({markedDates, onDayPress}: TranslucentCalendarProps) {
    const visualMode = useScreenVisualMode();
    const riverMode = visualMode === "river";
    const coastMode = visualMode === "coast";
    const georgiaMode = visualMode === "georgia";
    const sonnyMode = visualMode === "sonny";
    const lightMode = riverMode || coastMode;
    const solidMode = coastMode || georgiaMode || sonnyMode;
    const solidSurfaceColor = sonnyMode ? "#000000" : georgiaMode ? "#2F4F4F" : "#708090";
    const todayTextColor = sonnyMode ? "#FF3800" : lightMode ? "#111111" : "#FF3800";
    const calendarTheme = {
        calendarBackground: "transparent",
        monthTextColor: lightMode ? "#111111" : "#E4E0D4",
        textMonthFontFamily: fonts.heading,
        textDayFontFamily: fonts.body,
        textDayHeaderFontFamily: fonts.heading,
        dayTextColor: lightMode ? "#111111" : "#E4E0D4",
        textDisabledColor: lightMode ? "rgba(17,17,17,0.25)" : "rgba(228,224,212,0.25)",
        selectedDayTextColor: "#FBF7F3",
        todayTextColor,
        arrowColor: lightMode ? "#111111" : "#E4E0D4",
        dotColor: lightMode ? "#111111" : "#E4E0D4",
        selectedDotColor: "#FBF7F3",
        textSectionTitleColor: lightMode ? "rgba(17,17,17,0.72)" : "rgba(228,224,212,0.75)",
    };

    if (lightMode || georgiaMode || sonnyMode) {
        return (
            <View
                style={[
                    tw`mt-3 overflow-hidden rounded-[28px] p-1`,
                    {
                        backgroundColor: solidMode ? solidSurfaceColor : "rgba(255,255,255,0.2)",
                        shadowColor: "#000000",
                        shadowOffset: {width: 0, height: 8},
                        shadowOpacity: 0.16,
                        shadowRadius: 16,
                        elevation: 8,
                    },
                ]}
            >
                <BlurView
                    intensity={72}
                    tint={lightMode ? "light" : "dark"}
                    style={[tw`overflow-hidden rounded-[24px] border`, {borderColor: lightMode ? "rgba(17,17,17,0.14)" : sonnyMode ? "rgba(247,247,247,0.18)" : "rgba(51,65,85,0.6)"}]}
                >
                    <View
                        pointerEvents="none"
                        style={[StyleSheet.absoluteFill, {backgroundColor: solidMode ? solidSurfaceColor : "rgba(255,255,255,0.42)"}]}
                    />
                    <LinearGradient
                        colors={solidMode ? ["rgba(255,255,255,0.08)", "rgba(255,255,255,0.02)", "transparent"] : ["rgba(255,255,255,0.32)", "rgba(255,255,255,0.04)", "transparent"]}
                        locations={[0, 0.5, 1]}
                        pointerEvents="none"
                        style={[tw`absolute left-0 right-0 top-0`, {height: "55%"}]}
                    />
                    <LinearGradient
                        colors={solidMode ? ["transparent", "rgba(0,0,0,0.1)"] : ["transparent", "rgba(223,196,170,0.16)"]}
                        pointerEvents="none"
                        style={[tw`absolute left-0 right-0 bottom-0`, {height: "30%"}]}
                    />
                    <Calendar
                        markedDates={markedDates}
                        onDayPress={onDayPress}
                        hideExtraDays
                        enableSwipeMonths
                        theme={calendarTheme}
                    />
                </BlurView>
            </View>
        );
    }

    return (
        <View style={tw`mt-3 overflow-hidden rounded-[28px] border border-orange-50/17 bg-black/69 p-2`}>
            <Calendar
                markedDates={markedDates}
                onDayPress={onDayPress}
                hideExtraDays
                enableSwipeMonths
                theme={calendarTheme}
            />
        </View>
    );
}
