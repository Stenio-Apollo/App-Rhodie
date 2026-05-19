import {View} from "react-native";
import {Calendar, type CalendarProps} from "react-native-calendars";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";

type MarkedDates = NonNullable<CalendarProps["markedDates"]>;

interface TranslucentCalendarProps {
    markedDates: MarkedDates;
    onDayPress: NonNullable<CalendarProps["onDayPress"]>;
}

export function TranslucentCalendar({markedDates, onDayPress}: TranslucentCalendarProps) {
    return (
        <View style={tw`mt-3 overflow-hidden rounded-[28px] border border-orange-50/17 bg-black/63 p-2`}>
            <Calendar
                markedDates={markedDates}
                onDayPress={onDayPress}
                hideExtraDays
                enableSwipeMonths
                theme={{
                    calendarBackground: "transparent",
                    monthTextColor: "#E4E0D4",
                    textMonthFontFamily: fonts.heading,
                    textDayFontFamily: fonts.body,
                    textDayHeaderFontFamily: fonts.heading,
                    dayTextColor: "#E4E0D4",
                    textDisabledColor: "rgba(228,224,212,0.25)",
                    selectedDayTextColor: "#FBF7F3",
                    todayTextColor: "#B55941",
                    arrowColor: "#E4E0D4",
                    dotColor: "#E4E0D4",
                    selectedDotColor: "#FBF7F3",
                    textSectionTitleColor: "rgba(228,224,212,0.75)",
                }}
            />
        </View>
    );
}
