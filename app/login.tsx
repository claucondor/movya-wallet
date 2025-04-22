import { ThemedText } from '@/components/ThemedText';
import { ThemeToggleButton } from '@/components/ui/ThemeToggleButton';
import { useLoginWithOAuth, usePrivy } from "@privy-io/expo";
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Image, StyleSheet, View } from "react-native";

export default function LoginScreen() {
  const { user } = usePrivy();
  const isAuthenticated = !!user;
  const oauth = useLoginWithOAuth({
    onSuccess: () => {
      router.replace('/wallet');
    },
    onError: (error) => {
      console.error('Google login failed', error);
    }
  });

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/wallet');
    }
  }, [isAuthenticated]);

  if (isAuthenticated) {
    return null; // Will redirect immediately
  }

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
          onPress={() => oauth.login({ provider: "google" })}
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