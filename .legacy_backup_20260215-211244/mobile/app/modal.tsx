import {StatusBar} from 'expo-status-bar';
import {Platform, Text, View} from 'react-native';

export default function ModalScreen() {
    return (
        <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
            <Text style={{fontSize: 20, fontWeight: 'bold'}}>Modal</Text>
            {/* Use a light status bar on iOS to account for the black space above the modal */}
            <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'}/>
        </View>
    );
}
