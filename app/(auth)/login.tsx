import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/hooks/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Pressable, StyleSheet, View } from "react-native";
import { useAuth } from '../_layout';

export default function LoginScreen() {
  const { startGoogleLogin } = useAuth();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
      <Image
        source={require('@/assets/logo/logo@HD.png')}
        style={styles.logo}
      />

      <ThemedText type="title" style={styles.title}>Welcome to Movya Wallet</ThemedText>
      <ThemedText type="default" style={styles.subtitle}>Sign in to continue</ThemedText>

      <Pressable
        style={({ pressed }) => [
          styles.oauthButton,
          { 
            backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint,
            borderColor: isDark ? Colors.dark.tint : Colors.light.tint 
          },
          pressed && styles.oauthButtonPressed,
        ]}
        onPress={startGoogleLogin}
      >
        <Ionicons name="logo-google" size={20} color={isDark ? Colors.light.text : Colors.dark.text} style={styles.buttonIcon} />
        <ThemedText 
          type="defaultSemiBold" 
          style={styles.oauthButtonText}
          lightColor={Colors.dark.text}
          darkColor={Colors.light.text}
        >
          Sign in with Google
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
  logo: {
    width: 150,
    height: 150,
    marginBottom: 30,
  },
  title: {
    marginBottom: 10,
  },
  subtitle: {
    marginBottom: 40,
    opacity: 0.7,
  },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderWidth: 1,
    borderRadius: 8,
    width: '80%',
    maxWidth: 300,
  },
  oauthButtonPressed: {
    opacity: 0.8,
  },
  buttonIcon: {
    marginRight: 10,
  },
  oauthButtonText: {
    fontSize: 16,
  },
});