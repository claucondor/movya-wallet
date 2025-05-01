import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/hooks/ThemeContext'; // Assuming ThemeContext exists
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function AuthSuccessScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    console.log('Auth Success: User ID received:', userId);
    // TODO: Optionally store userId or trigger data fetching

    // Redirect to the main app screen after a short delay
    const timer = setTimeout(() => {
      // Navigate to the main part of the app, e.g., the wallet or app index
      // Using replace to prevent going back to the success screen
      router.replace('/app/wallet'); // Or '/app' depending on your desired landing page
    }, 1500); // 1.5 second delay

    return () => clearTimeout(timer); // Clear timeout if component unmounts
  }, [userId]);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
      <ActivityIndicator size="large" color={isDark ? Colors.dark.tint : Colors.light.tint} />
      <ThemedText type="subtitle" style={styles.message}>
        Authentication Successful!
      </ThemedText>
      <ThemedText style={styles.message}>
        Welcome back! Redirecting you now...
      </ThemedText>
      {userId && (
        <ThemedText style={styles.userIdText}>
          (User ID: {userId})
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  message: {
    marginTop: 20,
    textAlign: 'center',
  },
  userIdText: {
    marginTop: 10,
    fontSize: 12,
    opacity: 0.6,
  },
}); 