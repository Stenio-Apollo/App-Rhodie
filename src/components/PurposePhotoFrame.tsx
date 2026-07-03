import {Image, Text, View} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";
import {GrainOverlay} from "./GrainOverlay";

interface PurposePhotoFrameProps {
    uri?: string;
    enlarged?: boolean;
    placeholder?: boolean;
}

export function PurposePhotoFrame({
                                      uri,
                                      enlarged = false,
                                      placeholder = false,
                                  }: PurposePhotoFrameProps) {
    const imageContent = placeholder || !uri ? (
        <View style={tw`h-full w-full items-center justify-center bg-black`}>
            <Ionicons name="image-outline" size={enlarged ? 34 : 22} color="rgba(255,255,255,0.42)"/>
        </View>
    ) : (
        <Image
            source={{uri}}
            resizeMode={enlarged ? "contain" : "cover"}
            style={tw`h-full w-full`}
        />
    );

    if (enlarged) {
        return (
            <View
                style={[
                    tw`relative bg-[#F7F5ED] p-3 pb-14`,
                    {
                        shadowColor: "#000000",
                        shadowOffset: {width: 0, height: 18},
                        shadowOpacity: 0.42,
                        shadowRadius: 26,
                        elevation: 14,
                    },
                ]}
            >
                <View
                    pointerEvents="none"
                    style={[
                        tw`absolute left-1/2 top-[-21px] z-10 h-10 w-28 bg-[#D8BC82]/82`,
                        {transform: [{translateX: -56}, {rotate: "-1.5deg"}]},
                    ]}
                />
                <View style={tw`h-[430px] w-full overflow-hidden bg-black`}>
                    <GrainOverlay>
                        {imageContent}
                    </GrainOverlay>
                </View>
                <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.72}
                    style={[tw`mt-3 text-center text-[12px] uppercase text-[#111111]/58`, {fontFamily: fonts.body}]}
                >
                    my reason to keep going
                </Text>
            </View>
        );
    }

    return (
        <View
            style={[
                tw`relative bg-[#F7F5ED] p-1.5 pb-3`,
                {
                    shadowColor: "#000000",
                    shadowOffset: {width: 0, height: 4},
                    shadowOpacity: 0.18,
                    shadowRadius: 7,
                    elevation: 4,
                },
            ]}
        >
            <View
                pointerEvents="none"
                style={[
                    tw`absolute left-1/2 top-[-6px] z-10 h-3 w-10 bg-[#D8BC82]/82`,
                    {transform: [{translateX: -20}, {rotate: "-1.5deg"}]},
                ]}
            />
            <View style={[tw`overflow-hidden bg-black`, {aspectRatio: 1}]}>
                <GrainOverlay>
                    {imageContent}
                </GrainOverlay>
            </View>
            <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.62}
                style={[tw`mt-1 text-center text-[6px] uppercase text-[#111111]/58`, {fontFamily: fonts.body}]}
            >
                my reason to keep going
            </Text>
        </View>
    );
}
