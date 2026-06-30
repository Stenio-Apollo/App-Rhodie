import {useEffect, useMemo, useState} from "react";
import {Pressable, ScrollView, Text, View} from "react-native";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";
import {haptics} from "../lib/haptics";

export const MONTH_OPTIONS = [
    {value: "01", label: "Jan"},
    {value: "02", label: "Feb"},
    {value: "03", label: "Mar"},
    {value: "04", label: "Apr"},
    {value: "05", label: "May"},
    {value: "06", label: "Jun"},
    {value: "07", label: "Jul"},
    {value: "08", label: "Aug"},
    {value: "09", label: "Sep"},
    {value: "10", label: "Oct"},
    {value: "11", label: "Nov"},
    {value: "12", label: "Dec"},
] as const;

const DAY_OPTIONS = Array.from({length: 31}, (_, index) => `${index + 1}`.padStart(2, "0"));

export function daysInMonth(month: string): number {
    return new Date(2000, Number(month), 0).getDate();
}

export function parseBirthdayParts(value: string | null | undefined): { month: string; day: string } {
    if (!value) return {month: "", day: ""};
    const [, month = "", day = ""] = value.split("-");
    return {month, day};
}

export function formatBirthday(month: string, day: string): string | null {
    if (!month || !day) return null;
    return `2000-${month}-${day}`;
}

export function birthdayLabel(month: string, day: string, placeholder: string): string {
    if (!month || !day) return placeholder;
    const monthLabel = MONTH_OPTIONS.find((option) => option.value === month)?.label ?? month;
    return `${monthLabel} ${Number(day)}`;
}

interface BirthdayPickerProps {
    month: string;
    day: string;
    onChange: (next: { month: string; day: string }) => void;
    placeholder?: string;
    showClear?: boolean;
    pickerBackgroundClass?: string;
    surfSide?: boolean;
    georgia?: boolean;
}

export function BirthdayPicker({
                                   month,
                                   day,
                                   onChange,
                                   placeholder = "Select birthday",
                                   showClear = false,
                                   pickerBackgroundClass = "bg-black/20",
                                   surfSide = false,
                                   georgia = false,
                               }: BirthdayPickerProps) {
    const [open, setOpen] = useState(false);
    const accentColor = "#FF3800";
    const accentSurfaceColor = georgia ? "rgba(255,56,0,0.14)" : "rgba(255,56,0,0.08)";

    useEffect(() => {
        if (!month) {
            if (day) onChange({month: "", day: ""});
            return;
        }
        const maxDays = daysInMonth(month);
        if (Number(day) > maxDays) {
            onChange({month, day: `${maxDays}`.padStart(2, "0")});
        }
    }, [day, month, onChange]);

    const visibleDayOptions = useMemo(
        () => (month ? DAY_OPTIONS.slice(0, daysInMonth(month)) : []),
        [month],
    );

    return (
        <View>
            <Text
                style={[
                    tw`text-xs`,
                    {fontFamily: fonts.body, color: surfSide ? "rgba(17,17,17,0.58)" : "#94a3b8"},
                ]}
            >
                Birthday
            </Text>
            <Pressable
                onPress={() => {
                    haptics.selection();
                    setOpen((current) => !current);
                }}
                style={({pressed}) => [
                    tw`mt-2 rounded-lg border px-3 py-3`,
                    {borderColor: surfSide ? "rgba(17,17,17,0.14)" : "#2c2c2c"},
                    pressed && tw`opacity-90`,
                ]}
            >
                <Text style={[tw`text-sm`, {fontFamily: fonts.body, color: surfSide ? "#111111" : "#fbf7f3"}]}>
                    {birthdayLabel(month, day, placeholder)}
                </Text>
            </Pressable>

            {open ? (
                <View style={tw`mt-3 flex-row gap-3`}>
                    <View
                        style={[
                            tw`flex-1 rounded-lg border ${pickerBackgroundClass}`,
                            {borderColor: surfSide ? "rgba(17,17,17,0.14)" : "#2c2c2c"},
                        ]}
                    >
                        <Text
                            style={[
                                tw`px-3 pt-3 text-[11px]`,
                                {fontFamily: fonts.body, color: surfSide ? "rgba(17,17,17,0.58)" : "#94a3b8"},
                            ]}
                        >
                            Month
                        </Text>
                        <ScrollView style={tw`max-h-40`} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                            {MONTH_OPTIONS.map((option) => {
                                const active = option.value === month;
                                return (
                                    <Pressable
                                        key={option.value}
                                        onPress={() => {
                                            haptics.selection();
                                            onChange({month: option.value, day});
                                        }}
                                        style={({pressed}) => [
                                            tw`px-3 py-3`,
                                            active ? {backgroundColor: surfSide || georgia ? accentSurfaceColor : "rgba(251,247,243,0.12)"} : null,
                                            pressed && tw`opacity-90`,
                                        ]}
                                    >
                                        <Text style={[tw`text-sm`, {
                                            fontFamily: fonts.body,
                                            color: active ? (surfSide || georgia ? accentColor : "#fbf7f3") : surfSide ? "#111111" : "#94a3b8",
                                        }]}>
                                            {option.label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>

                    <View
                        style={[
                            tw`flex-1 rounded-lg border ${pickerBackgroundClass}`,
                            {borderColor: surfSide ? "rgba(17,17,17,0.14)" : "#2c2c2c"},
                        ]}
                    >
                        <Text
                            style={[
                                tw`px-3 pt-3 text-[11px]`,
                                {fontFamily: fonts.body, color: surfSide ? "rgba(17,17,17,0.58)" : "#94a3b8"},
                            ]}
                        >
                            Day
                        </Text>
                        <ScrollView style={tw`max-h-40`} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                            {month ? visibleDayOptions.map((option) => {
                                const active = option === day;
                                return (
                                    <Pressable
                                        key={option}
                                        onPress={() => {
                                            haptics.selection();
                                            onChange({month, day: option});
                                        }}
                                        style={({pressed}) => [
                                            tw`px-3 py-3`,
                                            active ? {backgroundColor: surfSide || georgia ? accentSurfaceColor : "rgba(251,247,243,0.12)"} : null,
                                            pressed && tw`opacity-90`,
                                        ]}
                                    >
                                        <Text style={[tw`text-sm`, {
                                            fontFamily: fonts.body,
                                            color: active ? (surfSide || georgia ? accentColor : "#fbf7f3") : surfSide ? "#111111" : "#94a3b8",
                                        }]}>
                                            {Number(option)}
                                        </Text>
                                    </Pressable>
                                );
                            }) : (
                                <Text
                                    style={[
                                        tw`px-3 py-3 text-sm`,
                                        {fontFamily: fonts.body, color: surfSide ? "rgba(17,17,17,0.48)" : "#64748b"},
                                    ]}
                                >
                                    Pick a month first
                                </Text>
                            )}
                        </ScrollView>
                    </View>
                </View>
            ) : null}

            {showClear ? (
                <Pressable
                    onPress={() => {
                        haptics.selection();
                        onChange({month: "", day: ""});
                    }}
                    style={({pressed}) => [tw`mt-3 self-start`, pressed && tw`opacity-80`]}
                >
                    <Text style={[tw`text-xs`, {fontFamily: fonts.button, color: surfSide ? "#111111" : "#B55941"}]}>
                        Clear birthday
                    </Text>
                </Pressable>
            ) : null}
        </View>
    );
}
