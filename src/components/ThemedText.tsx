import React from 'react';
import {Text, type TextProps} from 'react-native';
import tw from '../lib/tw';
import {fonts} from '../theme/fonts';

export type ThemedTextProps = TextProps & {
    type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'label' | 'error' | 'debug';
};

export function ThemedText({style, type = 'default', ...rest}: ThemedTextProps) {
    const getStyle = () => {
        switch (type) {
            case 'title':
                return [tw`text-2xl font-bold mb-2`, {fontFamily: fonts.display}];
            case 'subtitle':
                return [tw`text-xl font-semibold mb-1`, {fontFamily: fonts.heading}];
            case 'small':
                return [tw`text-sm`, {fontFamily: fonts.body}];
            case 'smallBold':
                return [tw`text-sm font-bold`, {fontFamily: fonts.strong}];
            case 'link':
                return [tw`text-blue-500 font-semibold`, {fontFamily: fonts.button}];
            case 'label':
                return [tw`text-sm font-semibold mb-1`, {fontFamily: fonts.strong}];
            case 'error':
                return [tw`text-red-500 text-xs mt-1`, {fontFamily: fonts.body}];
            case 'debug':
                return [tw`text-xs opacity-50 mt-2`, {fontFamily: fonts.body}];
            default:
                return [tw`text-base`, {fontFamily: fonts.body}];
        }
    };

    return <Text style={[getStyle(), style]} {...rest} />;
}
