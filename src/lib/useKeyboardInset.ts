import {useCallback, useEffect, useRef, useState} from "react";
import {Animated, Dimensions, Easing, Keyboard, Platform} from "react-native";

function keyboardHeight(event: { endCoordinates?: { height?: number; screenY?: number } }): number {
    const screenY = event.endCoordinates?.screenY;
    if (typeof screenY === "number") {
        return Math.max(0, Dimensions.get("window").height - screenY);
    }

    return Math.max(0, event.endCoordinates?.height ?? 0);
}

export function useKeyboardInset() {
    const inset = useRef(new Animated.Value(0)).current;
    const [visible, setVisible] = useState(false);

    const animateTo = useCallback((toValue: number, duration?: number) => {
        setVisible(toValue > 0);
        Animated.timing(inset, {
            toValue,
            duration: duration && duration > 0 ? duration : 230,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();
    }, [inset]);

    useEffect(() => {
        const showEvent = Platform.OS === "ios" ? "keyboardWillChangeFrame" : "keyboardDidShow";
        const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

        const showSubscription = Keyboard.addListener(showEvent, (event) => {
            animateTo(keyboardHeight(event), event.duration);
        });
        const hideSubscription = Keyboard.addListener(hideEvent, (event) => {
            animateTo(0, event.duration);
        });

        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, [animateTo]);

    return {keyboardInset: inset, keyboardVisible: visible};
}
