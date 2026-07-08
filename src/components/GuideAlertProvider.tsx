import {
    createContext,
    type PropsWithChildren,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import {Modal, Pressable} from "react-native";
import tw from "../lib/tw";
import {GuideCard, type GuideCardAction} from "./GuideCard";
import {ScreenVisualModeContext} from "./ScreenBackground";
import type {VisualMode} from "../state/useVisualMode";
import {type GuideAlertOptions, registerGuideAlertShow} from "../lib/guide-alert";

export type {GuideAlertOptions} from "../lib/guide-alert";

interface QueuedAlert {
    options: GuideAlertOptions;
    resolve: (id: string) => void;
}

interface GuideAlertApi {
    show: (options: GuideAlertOptions) => Promise<string>;
}

const GuideAlertContext = createContext<GuideAlertApi | null>(null);

export function useGuideAlert(): GuideAlertApi {
    const api = useContext(GuideAlertContext);
    if (!api) {
        throw new Error("useGuideAlert must be used within a GuideAlertProvider");
    }
    return api;
}

interface GuideAlertProviderProps {
    visualMode: VisualMode;
}

const DEFAULT_ACTIONS: GuideCardAction[] = [{id: "ok", label: "OK", tone: "primary"}];

function cancelIdFor(options: GuideAlertOptions): string {
    const actions = options.actions ?? DEFAULT_ACTIONS;
    const cancel = actions.find((action) => action.tone === "cancel");
    if (cancel) return cancel.id;
    return actions[actions.length - 1]?.id ?? "cancel";
}

export function GuideAlertProvider({visualMode, children}: PropsWithChildren<GuideAlertProviderProps>) {
    const [queue, setQueue] = useState<QueuedAlert[]>([]);

    const show = useCallback((options: GuideAlertOptions) => {
        return new Promise<string>((resolve) => {
            setQueue((current) => [...current, {options, resolve}]);
        });
    }, []);

    const api = useMemo<GuideAlertApi>(() => ({show}), [show]);

    useEffect(() => {
        registerGuideAlertShow(show);
        return () => registerGuideAlertShow(null);
    }, [show]);

    const current = queue[0] ?? null;
    const visible = current !== null;

    const handleResolve = useCallback(
        (id: string) => {
            setQueue((currentQueue) => {
                if (currentQueue.length === 0) return currentQueue;
                const [head, ...rest] = currentQueue;
                head.resolve(id);
                return rest;
            });
        },
        [],
    );

    const handleDismiss = useCallback(() => {
        if (!current) return;
        handleResolve(cancelIdFor(current.options));
    }, [current, handleResolve]);

    const actions = current?.options.actions ?? DEFAULT_ACTIONS;

    return (
        <GuideAlertContext.Provider value={api}>
            {children}
            <Modal
                visible={visible}
                transparent
                animationType="fade"
                onRequestClose={handleDismiss}
                statusBarTranslucent
            >
                <ScreenVisualModeContext.Provider value={visualMode}>
                    <Pressable
                        onPress={handleDismiss}
                        style={tw`flex-1 items-center justify-center bg-black/72 px-5`}
                    >
                        <Pressable onPress={() => undefined} style={tw`w-full`}>
                            {current ? (
                                <GuideCard
                                    eyebrow={current.options.eyebrow ?? "Notice"}
                                    title={current.options.title}
                                    body={current.options.message}
                                    visualMode={visualMode}
                                    active={visible}
                                    actions={actions}
                                    onAction={handleResolve}
                                />
                            ) : null}
                        </Pressable>
                    </Pressable>
                </ScreenVisualModeContext.Provider>
            </Modal>
        </GuideAlertContext.Provider>
    );
}
