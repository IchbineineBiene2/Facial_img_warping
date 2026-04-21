import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AuthProvider } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ title: 'Oturum Ac' }} />
          <Stack.Screen name="register" options={{ title: 'Kaydol' }} />
          <Stack.Screen name="profile" options={{ title: 'Profil' }} />
          <Stack.Screen name="create" options={{ headerShown: false, title: 'Oluştur' }} />
          <Stack.Screen name="library" options={{ headerShown: false, title: 'Kütüphane' }} />
          <Stack.Screen name="settings" options={{ headerShown: false, title: 'Ayarlar' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </AuthProvider>
    </ThemeProvider>
  );
}
