import { useColorScheme } from '@/hooks/use-color-scheme'
import { ClerkProvider } from '@clerk/clerk-expo'
import { tokenCache } from '@clerk/clerk-expo/token-cache'
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Text, View } from 'react-native'
import 'react-native-reanimated'

export const unstable_settings = {
  anchor: '(tabs)',
}

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ''

export default function RootLayout() {
  const colorScheme = useColorScheme()

  if (!CLERK_PUBLISHABLE_KEY) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Text style={{ color: '#b91c1c', textAlign: 'center' }}>
          Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in mobile/.env
        </Text>
      </View>
    )
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
        <Stack>
          <Stack.Screen name="(home)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ClerkProvider>
    </ThemeProvider>
  )
}
