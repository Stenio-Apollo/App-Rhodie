import type {GuideCardAction} from "../components/GuideCard";

export interface GuideAlertOptions {
    title: string;
    message?: string;
    eyebrow?: string;
    actions?: GuideCardAction[];
}

type ShowFn = (options: GuideAlertOptions) => Promise<string>;

let showFn: ShowFn | null = null;

export function registerGuideAlertShow(fn: ShowFn | null): void {
    showFn = fn;
}

export function showGuideAlert(options: GuideAlertOptions): Promise<string> {
    if (!showFn) {
        console.warn("GuideAlert requested before provider mounted:", options.title);
        return Promise.resolve("cancel");
    }
    return showFn(options);
}
