import { Tabs } from 'expo-router';
import React from 'react';
import 'react-native-get-random-values';
import 'react-native-reanimated';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

// Layout for the main authenticated part of the app (tabs)
export default function AppLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        // Hide the tab bar
        tabBarStyle: {
          display: 'none',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol name={focused ? 'house.fill' : 'house'} color={color} size={28} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol name={focused ? 'creditcard.fill' : 'creditcard'} color={color} size={28} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol name={focused ? 'safari.fill' : 'safari'} color={color} size={28} />
          ),
        }}
      />
      <Tabs.Screen name="send" options={{ href: null }} />
      <Tabs.Screen name="receive" options={{ href: null }} />
      <Tabs.Screen name="swap" options={{ href: null }} />
      <Tabs.Screen name="deposit" options={{ href: null }} />
    </Tabs>
  );
}
