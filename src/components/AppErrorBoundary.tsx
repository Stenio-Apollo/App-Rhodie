import {Component, type ErrorInfo, type ReactNode} from "react";
import {Text, View} from "react-native";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";
import {Button} from "./ui/Button";

interface AppErrorBoundaryProps {
    children: ReactNode;
    onReset?: () => void;
}

interface AppErrorBoundaryState {
    error: Error | null;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
    state: AppErrorBoundaryState = {error: null};

    static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
        return {error};
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.warn("App render error", error, info.componentStack);
    }

    render() {
        if (!this.state.error) return this.props.children;

        return (
            <View style={tw`flex-1 items-center justify-center bg-black px-6`}>
                <Text style={[tw`text-center text-2xl text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                    Could not open Rhodie
                </Text>
                <Text style={[tw`mt-3 text-center text-sm leading-5 text-slate-300`, {fontFamily: fonts.body}]}>
                    Close and reopen the app. If this keeps happening, sign out and sign back in.
                </Text>
                {this.props.onReset ? (
                    <Button
                        label="Sign out"
                        onPress={this.props.onReset}
                        shine
                        style={[tw`mt-5 w-full`, {backgroundColor: "#E1B996"}]}
                        textStyle={{color: "#111111"}}
                    />
                ) : null}
            </View>
        );
    }
}
