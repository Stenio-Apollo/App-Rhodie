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
}

export function BirthdayPicker({
                                   month,
                                   day,
                                   onChange,
                                   placeholder = "Select birthday",
                                   showClear = false,
                                   pickerBackgroundClass = "bg-black/20",
                               }: BirthdayPickerProps) {
    const [open, setOpen] = useState(false);

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
            <Text style={[tw`text-xs text-slate-400`, {fontFamily: fonts.body}]}>Birthday</Text>
            <Pressable
                onPress={() => {
                    haptics.selection();
                    setOpen((current) => !current);
                }}
                style={({pressed}) => [
                    tw`mt-2 rounded-lg border border-[#2c2c2c] px-3 py-3`,
                    pressed && tw`opacity-90`,
                ]}
            >
                <Text style={[tw`text-sm`, {fontFamily: fonts.body, color: "#fbf7f3"}]}>
                    {birthdayLabel(month, day, placeholder)}
                </Text>
            </Pressable>

            {open ? (
                <View style={tw`mt-3 flex-row gap-3`}>
                    <View style={tw`flex-1 rounded-lg border border-[#2c2c2c] ${pickerBackgroundClass}`}>
                        <Text style={[tw`px-3 pt-3 text-[11px] text-slate-400`, {fontFamily: fonts.body}]}>
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
                                            active ? {backgroundColor: "rgba(251,247,243,0.12)"} : null,
                                            pressed && tw`opacity-90`,
                                        ]}
                                    >
                                        <Text style={[tw`text-sm`, {
                                            fontFamily: fonts.body,
                                            color: active ? "#fbf7f3" : "#94a3b8",
                                        }]}>
                                            {option.label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>

                    <View style={tw`flex-1 rounded-lg border border-[#2c2c2c] ${pickerBackgroundClass}`}>
                        <Text style={[tw`px-3 pt-3 text-[11px] text-slate-400`, {fontFamily: fonts.body}]}>
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
                                            active ? {backgroundColor: "rgba(251,247,243,0.12)"} : null,
                                            pressed && tw`opacity-90`,
                                        ]}
                                    >
                                        <Text style={[tw`text-sm`, {
                                            fontFamily: fonts.body,
                                            color: active ? "#fbf7f3" : "#94a3b8",
                                        }]}>
                                            {Number(option)}
                                        </Text>
                                    </Pressable>
                                );
                            }) : (
                                <Text style={[tw`px-3 py-3 text-sm text-slate-500`, {fontFamily: fonts.body}]}>
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
                    <Text style={[tw`text-xs text-[#B55941]`, {fontFamily: fonts.button}]}>
                        Clear birthday
                    </Text>
                </Pressable>
            ) : null}
        </View>
    );
}
