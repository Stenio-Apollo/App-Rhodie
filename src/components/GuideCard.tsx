import {type PropsWithChildren, type ReactNode} from "react";
import {Pressable, Text, View} from "react-native";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";
import {haptics} from "../lib/haptics";
import {TranslucentCard} from "./TranslucentCard";
import {SnakeGlow} from "./SnakeGlow";
import type {VisualMode} from "../state/useVisualMode";

const ACCENT = "#FF3800";
const HEADER_TAN = "#DAC8AE";

const OUTER_RADIUS = 26;

export type GuideCardActionTone = "primary" | "cancel" | "destructive";

export interface GuideCardAction {
    id: string;
    label: string;
    tone?: GuideCardActionTone;
}

interface GuideCardProps {
    eyebrow?: string;
    title: string;
    body?: string;
    actions?: GuideCardAction[];
    onAction?: (id: string) => void;
    footer?: ReactNode;
    visualMode?: VisualMode;
    active?: boolean;
}

export function guideCardTextPalette(mode: VisualMode) {
    const isLight = mode === "river";
    return {
        heading: isLight ? "#000000" : HEADER_TAN,
        eyebrow: isLight ? "#000000" : HEADER_TAN,
        body: isLight ? "#000000" : "#FFFFFF",
    };
}

function actionSurfaceFor(tone: GuideCardActionTone | undefined) {
    if (tone === "cancel") {
        return {
            borderColor: "rgba(255,255,255,0.35)",
            backgroundColor: "rgba(23,23,23,0.55)",
            textColor: "#FFFFFF",
        };
    }
    if (tone === "destructive") {
        return {
            borderColor: "#000000",
            backgroundColor: "#000000",
            textColor: ACCENT,
        };
    }
    return {
        borderColor: "#000000",
        backgroundColor: "#000000",
        textColor: "#FFFFFF",
    };
}

export function GuideCard({
                              eyebrow = "Quick guide",
                              title,
                              body,
                              actions,
                              onAction,
                              footer,
                              visualMode = "river",
                              active = true,
                              children,
                          }: PropsWithChildren<GuideCardProps>) {
    const palette = guideCardTextPalette(visualMode);

    const singlePrimaryAction =
        actions?.length === 1 && (actions[0].tone ?? "primary") === "primary" ? actions[0] : null;
    const rowActions = singlePrimaryAction ? null : actions;

    return (
        <SnakeGlow radius={OUTER_RADIUS} active={active}>
            <TranslucentCard radius={OUTER_RADIUS} style={tw`p-4`}>
                <View style={tw`flex-row items-start justify-between gap-3`}>
                    <View style={tw`flex-1`}>
                        <Text style={[tw`text-[10px] uppercase tracking-[2px]`, {
                            fontFamily: fonts.strong,
                            color: palette.eyebrow,
                        }]}>
                            {eyebrow}
                        </Text>
                        <Text style={[tw`mt-1 text-base`, {fontFamily: fonts.heading, color: palette.heading}]}>
                            {title}
                        </Text>
                        {body ? (
                            <Text style={[tw`mt-2 text-sm leading-5`, {
                                fontFamily: fonts.body,
                                color: palette.body,
                            }]}>
                                {body}
                            </Text>
                        ) : null}
                    </View>
                    {singlePrimaryAction ? (
                        <GuideActionPill
                            action={singlePrimaryAction}
                            onPress={() => onAction?.(singlePrimaryAction.id)}
                        />
                    ) : null}
                </View>

                {children ? <View style={tw`mt-3`}>{children}</View> : null}

                {rowActions?.length ? (
                    <View style={tw`mt-4 flex-row flex-wrap justify-end gap-2`}>
                        {rowActions.map((action) => (
                            <GuideActionPill
                                key={action.id}
                                action={action}
                                onPress={() => onAction?.(action.id)}
                            />
                        ))}
                    </View>
                ) : null}

                {footer ? <View style={tw`mt-3`}>{footer}</View> : null}
            </TranslucentCard>
        </SnakeGlow>
    );
}

interface GuideActionPillProps {
    action: GuideCardAction;
    onPress: () => void;
}

function GuideActionPill({action, onPress}: GuideActionPillProps) {
    const surface = actionSurfaceFor(action.tone);
    return (
        <Pressable
            onPress={() => {
                haptics.selection();
                onPress();
            }}
            style={({pressed}) => [
                tw`overflow-hidden rounded-full border px-3 py-1.5`,
                {
                    borderColor: surface.borderColor,
                    backgroundColor: surface.backgroundColor,
                    shadowColor: "#000000",
                    shadowOffset: {width: 0, height: 4},
                    shadowOpacity: 0.32,
                    shadowRadius: 7,
                    elevation: 5,
                },
                pressed && {opacity: 0.78, transform: [{translateY: 1}]},
            ]}
        >
            <View
                pointerEvents="none"
                style={[
                    tw`absolute left-1 right-1 top-0.5 h-2 rounded-full`,
                    {backgroundColor: "rgba(255,255,255,0.18)"},
                ]}
            />
            <Text style={[tw`text-xs`, {fontFamily: fonts.button, color: surface.textColor}]}>
                {action.label}
            </Text>
        </Pressable>
    );
}
