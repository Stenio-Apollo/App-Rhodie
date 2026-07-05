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
    const georgiaMode = visualMode === "georgia" || visualMode === "evergreen" || visualMode === "navy";
    const sonnyMode = visualMode === "sonny";
    const lightMode = riverMode || georgiaMode;
    const frostedLight = riverMode;
    const calendarTextColor = georgiaMode ? "#FFFFFF" : lightMode ? "#000000" : "#E4E0D4";
    const calendarMutedTextColor = georgiaMode ? "rgba(255,255,255,0.72)" : lightMode ? "rgba(0,0,0,0.72)" : "rgba(228,224,212,0.75)";
    const calendarDisabledTextColor = georgiaMode ? "rgba(255,255,255,0.35)" : lightMode ? "rgba(0,0,0,0.25)" : "rgba(228,224,212,0.25)";
    const todayTextColor = sonnyMode ? "#FF3800" : georgiaMode ? "#FF3800" : lightMode ? "#000000" : "#FF3800";
    const calendarHeaderTextColor = calendarTextColor;
    const calendarTheme = {
        calendarBackground: "transparent",
        monthTextColor: calendarHeaderTextColor,
        textMonthFontFamily: fonts.heading,
        textDayFontFamily: fonts.body,
        textDayHeaderFontFamily: fonts.heading,
        dayTextColor: calendarTextColor,
        textDisabledColor: calendarDisabledTextColor,
        selectedDayTextColor: "#FBF7F3",
        todayTextColor,
        arrowColor: calendarHeaderTextColor,
        dotColor: calendarTextColor,
        selectedDotColor: "#FBF7F3",
        textSectionTitleColor: calendarMutedTextColor,
        textDayStyle: {
            color: calendarTextColor,
        },
        "stylesheet.calendar.header": {
            monthText: {
                color: calendarHeaderTextColor,
                fontFamily: fonts.heading,
            },
            dayHeader: {
                color: calendarMutedTextColor,
                fontFamily: fonts.heading,
            },
        },
        "stylesheet.day.basic": {
            text: {
                color: calendarTextColor,
                fontFamily: fonts.body,
            },
            todayText: {
                color: todayTextColor,
            },
            selectedText: {
                color: "#FBF7F3",
            },
            disabledText: {
                color: calendarDisabledTextColor,
            },
            inactiveText: {
                color: calendarDisabledTextColor,
            },
        },
    };

    if (lightMode || georgiaMode || sonnyMode) {
        const cardRadius = 24;
        const borderColor = georgiaMode
            ? "rgba(255,255,255,0.22)"
            : frostedLight
                ? "rgba(17,17,17,0.14)"
                : sonnyMode
                    ? "rgba(255,255,255,0.24)"
                    : "rgba(51,65,85,0.6)";
        const innerSurface = georgiaMode
            ? "rgba(0,0,0,0.28)"
            : sonnyMode
                ? "rgba(0,0,0,0.34)"
                : "rgba(255,255,255,0.42)";
        const topGradient = georgiaMode
            ? ["rgba(255,255,255,0.16)", "rgba(255,255,255,0.04)", "transparent"] as const
            : sonnyMode
                ? ["rgba(255,255,255,0.16)", "rgba(255,255,255,0.04)", "transparent"] as const
                : ["rgba(232,244,255,0.30)", "rgba(210,232,255,0.06)", "transparent"] as const;
        const bottomGradient = georgiaMode || sonnyMode
            ? ["transparent", "rgba(0,0,0,0.24)"] as const
            : ["transparent", "rgba(223,196,170,0.16)"] as const;
        return (
            <View
                style={[
                    tw`mt-3 overflow-hidden rounded-[28px] p-1`,
                    {
                        backgroundColor: georgiaMode ? "transparent" : sonnyMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.2)",
                        shadowColor: "#000000",
                        shadowOffset: {width: 0, height: 8},
                        shadowOpacity: georgiaMode ? 0.32 : 0.16,
                        shadowRadius: 16,
                        elevation: 8,
                    },
                ]}
            >
                <BlurView
                    intensity={georgiaMode ? 38 : sonnyMode ? 42 : 72}
                    tint={frostedLight ? "light" : "dark"}
                    style={[tw`overflow-hidden rounded-[24px] border`, {borderColor}]}
                >
                    <View
                        pointerEvents="none"
                        style={[StyleSheet.absoluteFill, {backgroundColor: innerSurface}]}
                    />
                    <LinearGradient
                        colors={topGradient}
                        locations={[0, 0.5, 1]}
                        pointerEvents="none"
                        style={[tw`absolute left-0 right-0 top-0`, {height: "55%"}]}
                    />
                    <LinearGradient
                        colors={bottomGradient}
                        pointerEvents="none"
                        style={[tw`absolute left-0 right-0 bottom-0`, {height: "30%"}]}
                    />
                    <View
                        pointerEvents="none"
                        style={[
                            tw`absolute left-0 right-0 top-0 border-t`,
                            {
                                height: 1,
                                borderTopColor: lightMode ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.28)",
                                borderTopLeftRadius: cardRadius,
                                borderTopRightRadius: cardRadius,
                            },
                        ]}
                    />
                    <Calendar
                        key={`calendar-${visualMode}`}
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
                key={`calendar-${visualMode}`}
                markedDates={markedDates}
                onDayPress={onDayPress}
                hideExtraDays
                enableSwipeMonths
                theme={calendarTheme}
            />
        </View>
    );
}
