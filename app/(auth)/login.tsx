import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, Pressable, StyleSheet, View } from "react-native";
import { useAuth } from '../_layout';

export default function LoginScreen() {
  const { startGoogleLogin } = useAuth();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  console.log('[LoginScreen] Component rendered');
  console.log('[LoginScreen] startGoogleLogin:', startGoogleLogin);

  return (
    <View style={styles.container}>
      {/* Background Video */}
      <Video
        source={require('../../assets/bg/start-screen-bg.mp4')}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.COVER}
        isLooping
        shouldPlay
        isMuted
      />

      {/* Overlay gradient for better text visibility */}
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.4)']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.contentContainer}>
        <Image
          source={require('@/assets/logo/logo@HD.png')}
          style={styles.logo}
        />

        <View style={styles.textContainer}>
          <ThemedText type="title" style={styles.title} darkColor="#fff" lightColor="#fff">
            Welcome to Movya Wallet
          </ThemedText>
          <ThemedText type="default" style={styles.subtitle} darkColor="rgba(255,255,255,0.8)" lightColor="rgba(255,255,255,0.8)">
            Sign in to continue
          </ThemedText>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.oauthButton,
            pressed && styles.oauthButtonPressed,
          ]}
          onPress={() => {
            console.log('[LoginScreen] Pressable onPress triggered');
            startGoogleLogin();
          }}
        >
          <View style={styles.buttonContent}>
            <View style={styles.googleIconContainer}>
              <Ionicons name="logo-google" size={20} color="#000" />
            </View>
            <ThemedText 
              type="defaultSemiBold" 
              style={styles.oauthButtonText}
              lightColor="#000"
              darkColor="#000"
            >
              Continue with Google
            </ThemedText>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  oauthButton: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  googleIconContainer: {
    marginRight: 12,
  },
  oauthButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  oauthButtonText: {
    fontSize: 16,
  },
});