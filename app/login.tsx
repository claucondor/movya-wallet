import { ThemedText } from '@/components/ThemedText';
import { ThemeToggleButton } from '@/components/ui/ThemeToggleButton';
import * as Google from 'expo-auth-session/providers/google';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Image, StyleSheet, View } from "react-native";

export default function LoginScreen() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: '466947410626-20tp1th3rkkcu3nkqvij8d3271cm9496.apps.googleusercontent.com',
    androidClientId: '466947410626-20tp1th3rkkcu3nkqvij8d3271cm9496.apps.googleusercontent.com',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      // Authentication successful, redirect to wallet
      router.replace('/wallet');
    } else if (response?.type === 'error') {
      console.error('Google login failed', response.error);
    }
  }, [response]);


  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/logo/logo@HD.png')}
        style={styles.logo}
      />

      <View style={styles.oauthContainer}>
        <ThemedText 
          type="defaultSemiBold" 
          style={styles.oauthButtonText}
          onPress={() => promptAsync()}
        >
          Login with Google
        </ThemedText>
      </View>

      <ThemeToggleButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E17',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 40,
  },
  oauthContainer: {
    marginBottom: 15,
  },
  oauthButtonText: {
    color: '#3A5AFF',
    fontSize: 16,
    fontWeight: 'bold',
    padding: 12,
    borderWidth: 1,
    borderColor: '#3A5AFF',
    borderRadius: 12,
  },
});