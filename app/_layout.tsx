import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { database } from '@/database';
import { registerBackgroundSync } from '@/services/backgroundSync';
import { syncManager } from '@/services/syncManager';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    const initialize = async () => {
      try {
        await registerBackgroundSync();
        
        if (syncManager.getIsOnline()) {
          setTimeout(() => {
            syncManager.syncAll();
          }, 2000);
        }
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };

    initialize();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: '' }} />
        <Stack.Screen 
          name="task-detail" 
          options={{ 
            title: '',
            headerBackVisible: false,
            headerLeft: () => null,
            presentation: 'card',
            headerShown: false,
          }} 
        />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
