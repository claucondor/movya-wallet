import { useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

// This screen acts as a temporary catcher for the auth-error deep link.
// The actual logic (displaying a proper error screen and redirecting to login)
// is handled by the Linking event listener in app/_layout.tsx,
// which then routes to app/(auth)/error.tsx.
export default function AuthErrorCatchScreen() {
  const params = useLocalSearchParams();

  useEffect(() => {
    // Optional: Log that this screen was reached with params
    console.log('AuthErrorCatchScreen reached with params:', params);

    // No explicit navigation here is strictly necessary if app/_layout.tsx's
    // Linking listener reliably handles the redirect quickly.
    // As a fallback, you could navigate to the more detailed error screen:
    // router.replace({ pathname: '/(auth)/error', params: { message: params.message || 'Unknown error' }});
  }, [params]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
      <Text style={styles.text}>Processing error...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 10,
  }
}); 