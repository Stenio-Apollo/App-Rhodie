import {useFonts} from "expo-font";

export function useAppFonts() {
    return useFonts({
        "GeneralSans-Medium": require("../../public/fonts/OTF/GeneralSans-Medium.otf"),
        "GeneralSans-Regular": require("../../public/fonts/OTF/GeneralSans-Regular.otf"),
        "GeneralSans-Bold": require("../../public/fonts/OTF/GeneralSans-Bold.otf"),
        "GeneralSans-Semibold": require("../../public/fonts/OTF/GeneralSans-Semibold.otf"),
    });
}

export const fonts = {
    display: "GeneralSans-Bold",
    heading: "GeneralSans-Medium",
    body: "GeneralSans-Regular",
    button: "GeneralSans-Semibold",
    strong: "GeneralSans-Semibold",
};
