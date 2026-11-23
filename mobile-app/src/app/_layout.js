import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from '../context/AuthContext'
import { LoadingView } from '../components/StateView'

function RootNavigator() {
  const { status } = useAuth()
  if (status === 'loading') return <LoadingView label="Checking your session…" />
  const signedIn = status === 'signedIn'
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* The guard decides which screens exist: no token, no tabs or detail screens. */}
      <Stack.Protected guard={signedIn} redirectTo="/login">
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="course/[id]" />
        {/* Presented over the tabs so the course list keeps its scroll position behind it. */}
        <Stack.Screen name="enroll" options={{ presentation: 'modal' }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn} redirectTo="/(tabs)">
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  )
}
