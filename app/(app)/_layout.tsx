import { Stack } from 'expo-router';
import React from 'react';
import 'react-native-get-random-values';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';

// Layout for the main authenticated part of the app
export default function AppLayout() {
  const colorScheme = useColorScheme();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="wallet" />
      <Stack.Screen name="send/index" options={{ presentation: 'modal' }} />
      <Stack.Screen name="receive/index" options={{ presentation: 'modal' }} />
      <Stack.Screen name="swap/index" options={{ presentation: 'modal' }} />
      <Stack.Screen name="deposit/index" options={{ presentation: 'modal' }} />
      <Stack.Screen name="contacts/index" options={{ presentation: 'modal' }} />
      {/* If you had an app/(app)/index.tsx, you might add:
      <Stack.Screen name="index" />
     }
      {/* If you had an app/add:
      <Stack.Screen name="explore" />
      */}
    </Stack>
  );
}
