import React from 'react';
import {View, type ViewProps} from 'react-native';
import tw from '../lib/tw';

export type ThemedViewProps = ViewProps;

export function ThemedView({style, ...rest}: ThemedViewProps) {
    return <View style={[tw`flex-1 bg-white`, style]} {...rest} />;
}
