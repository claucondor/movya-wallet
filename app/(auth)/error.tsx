import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/hooks/ThemeContext'; // Assuming ThemeContext exists
import { Ionicons } from '@expo/vector-icons'; // Using Ionicons for error icon
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

export default function AuthErrorScreen() {
  const { message } = useLocalSearchParams<{ message?: string }>();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  const defaultMessage = 'An unknown error occurred during authentication.';

  const handleRetry = () => {
    // Navigate back to the login screen
    router.replace('/(auth)/login');
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
      <Ionicons 
        name="warning-outline" 
        size={64} 
        color={'#FF3B30'} // Standard error color (red)
        style={styles.icon}
      />
      <ThemedText type="subtitle" style={styles.title}>
        Authentication Failed
      </ThemedText>
      <ThemedText style={styles.message}>
        {message || defaultMessage}
      </ThemedText>

      <Pressable
        style={({ pressed }) => [
          styles.retryButton,
          { backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint },
          pressed && styles.buttonPressed,
        ]}
        onPress={handleRetry}
      >
        {/* Ensure button text color contrasts with tint background */}
        <ThemedText 
          type="defaultSemiBold" 
          style={styles.retryButtonText}
          lightColor={Colors.dark.text} // Use dark text on light tint
          darkColor={Colors.light.text}  // Use light text on dark tint
        >
          Try Again
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    marginBottom: 15,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginBottom: 30,
    opacity: 0.8,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  retryButtonText: {
    // Removed specific color here, relies on ThemedText props now
    fontSize: 16,
  },
}); 