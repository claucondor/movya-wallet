import { ThemeProvider as CustomThemeProvider } from '@/hooks/ThemeContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import "react-native-get-random-values";
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { createAndSaveWallet, getWalletAddress, loadWallet } from '../internal/walletService';
import { storage } from './core/storage';
// import { avalanche, avalancheFuji } from 'viem/chains'; // Keep if needed elsewhere, remove if only for Privy

// --- Definición del Tema Personalizado ---
const MovyaLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#3A5AFF', // Azul principal de Movya
    onPrimary: '#FFFFFF',
    primaryContainer: '#D8E2FF', // Un azul más claro para contenedores
    onPrimaryContainer: '#001A41',
    secondary: '#0A7EA4', // Un azul verdoso secundario
    onSecondary: '#FFFFFF',
    secondaryContainer: '#C0E8FF',
    onSecondaryContainer: '#001F2A',
    tertiary: '#77536D', // Ejemplo, puedes ajustarlo
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#FFD7F0',
    onTertiaryContainer: '#2D1228',
    error: '#BA1A1A',
    onError: '#FFFFFF',
    errorContainer: '#FFDAD6',
    onErrorContainer: '#410002',
    background: '#F5F7FA', // Fondo general ligeramente azulado/grisáceo claro
    onBackground: '#191C1D',
    surface: '#FFFFFF', // Superficies como Cards, Dialogs (blanco puro)
    onSurface: '#191C1D',
    surfaceVariant: '#E0E2EC', // Para elementos como List.Item, Chip backgrounds
    onSurfaceVariant: '#44474E',
    outline: '#74777F',
    elevation: {
      ...MD3LightTheme.colors.elevation,
      level2: '#EFF3FA', // Ejemplo para superficies ligeramente elevadas
    },
  },
};

const MovyaDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#ADC6FF', // Azul principal de Movya para modo oscuro (más claro)
    onPrimary: '#002E69',
    primaryContainer: '#20428F', // Contenedor primario oscuro
    onPrimaryContainer: '#D8E2FF',
    secondary: '#87CEEB', // Azul verdoso secundario para modo oscuro (Sky Blue)
    onSecondary: '#003547',
    secondaryContainer: '#004D65',
    onSecondaryContainer: '#C0E8FF',
    tertiary: '#E6B9D7',
    onTertiary: '#45273E',
    tertiaryContainer: '#5D3D55',
    onTertiaryContainer: '#FFD7F0',
    error: '#FFB4AB',
    onError: '#690005',
    errorContainer: '#93000A',
    onErrorContainer: '#FFDAD6',
    background: '#0A0E17', // Fondo oscuro principal de Movya
    onBackground: '#E2E2E6',
    surface: '#1A1F38', // Superficies como Cards, Dialogs para modo oscuro
    onSurface: '#C6C6CA',
    surfaceVariant: '#252D4A', // Para List.Item, Chip backgrounds en oscuro
    onSurfaceVariant: '#C3C6CF',
    outline: '#8E9099',
    elevation: {
      ...MD3DarkTheme.colors.elevation,
      level2: '#202542', // Ejemplo para superficies ligeramente elevadas en oscuro
    },
  },
};
// --- Fin Definición del Tema Personalizado ---

// Backend Callback URL (as configured in Google Cloud Console)
const BACKEND_CALLBACK_URL = Constants.expoConfig?.extra?.backendUrl + '/auth/callback';

// Google Client IDs read from app.json extra section
const GOOGLE_WEB_CLIENT_ID = Constants.expoConfig?.extra?.googleOAuth?.webClientId;
// Android/iOS Client IDs are NOT used for initiating this backend flow

// Create Auth Context
interface AuthContextType {
  startGoogleLogin: () => Promise<void>;
  walletAddress: string | null;
  // Add other auth state if needed (e.g., user info, loading state)
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to use the Auth Context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    Geist: require('../assets/fonts/Geist.ttf'), // Changed from SpaceMono
  });
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const router = useRouter();
  const segments = useSegments();

  // Function to manually start the Google Login flow
  const startGoogleLogin = useCallback(async () => {
    if (!GOOGLE_WEB_CLIENT_ID) {
      console.error('Google Web Client ID not found.');
      return;
    }
    try {
      const scopes = encodeURIComponent('profile email');
      const redirectUri = encodeURIComponent(BACKEND_CALLBACK_URL);
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth` +
                      `?client_id=${GOOGLE_WEB_CLIENT_ID}` +
                      `&redirect_uri=${redirectUri}` +
                      `&response_type=code&scope=${scopes}&access_type=offline`;
      await WebBrowser.openBrowserAsync(authUrl);
    } catch (error) {
      console.error('Error opening web browser for Google Login:', error);
    }
  }, []);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
      const checkWallet = async () => {
        const address = await getWalletAddress();
        setWalletAddress(address);
      };
      checkWallet();
    }
  }, [loaded]);

  // Effect to handle the DEEP LINK redirect FROM the backend
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const { path, queryParams } = Linking.parse(event.url);
      let recognizedPathType = null;
      if (path === 'auth-success' || path === '/auth-success') recognizedPathType = 'success';
      else if (path === 'auth-error' || path === '/auth-error') recognizedPathType = 'error';
      if (!recognizedPathType && event.url) {
        if (event.url.includes('auth-success')) recognizedPathType = 'success';
        else if (event.url.includes('auth-error')) recognizedPathType = 'error';
      }
      if (recognizedPathType === 'success') {
        const currentUserId = queryParams?.userId as string || null;
        if (currentUserId) storage.set('userId', currentUserId);
        let wallet = await loadWallet();
        if (!wallet) wallet = await createAndSaveWallet();
        setWalletAddress(wallet.address);
        router.replace('/(app)/home');
      } else if (recognizedPathType === 'error') {
        const errorMessage = queryParams?.message as string || 'Auth failed.';
        router.replace({ pathname: '/(auth)/error', params: { message: errorMessage } });
      }
    };
    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, [router]);

  // Effect to handle redirection based on walletAddress and current route
  useEffect(() => {
    if (!loaded) return; // Don't run until fonts are loaded (and initial wallet check might be in progress)

    const inAuthGroup = segments[0] === '(auth)';
    const inAppGroup = segments[0] === '(app)';

    console.log(`RootLayout Auth Redirect: walletAddress: ${walletAddress}, segments: ${segments.join('/')}, inAuthGroup: ${inAuthGroup}, inAppGroup: ${inAppGroup}`);

    if (walletAddress && (inAuthGroup || segments[0] === 'index')) {
      // User is authenticated but is in auth group, at root, or on the initial index.tsx
      // Redirect to main app screen.
      // Avoid redirecting if already in (app) group to prevent loops, unless it's from root index.
      // Also, allow staying on auth/success or auth/error if those are the current deep link targets.
      if (segments[1] !== 'success' && segments[1] !== 'error') {
         console.log('Redirecting to /(app)/wallet due to walletAddress and current segment');
         router.replace('/(app)/home'); // Changed from '/(app)/wallet' to '/(app)/chat'
      }
    } else if (!walletAddress && !inAuthGroup) {
      // User is not authenticated and is not in the auth group
      // Redirect to login screen.
      console.log('Redirecting to /(auth)/login due to no walletAddress and not in auth group');
      router.replace('/(auth)/login');
    }
  }, [walletAddress, segments, loaded, router]);

  // Value provided by the context
  const authContextValue: AuthContextType = {
    startGoogleLogin,
    walletAddress,
    // Add other state here
  };

  // Determinar el tema para PaperProvider y NavigationThemeProvider
  const paperThemeToUse = colorScheme === 'dark' ? MovyaDarkTheme : MovyaLightTheme;
  const navigationThemeToUse = colorScheme === 'dark' ? NavigationDarkTheme : NavigationDefaultTheme;

  if (!loaded) {
    return null; // O un componente de carga si prefieres, mientras las fuentes cargan
  }

  return (
    <GestureHandlerRootView style={styles.rootContainer}>
      <AuthContext.Provider value={authContextValue}>
        <CustomThemeProvider>
          <PaperProvider theme={paperThemeToUse}>
            <NavigationThemeProvider value={navigationThemeToUse}>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(app)" />
                <Stack.Screen name="index" options={{ animation: 'none' }} />
                <Stack.Screen name="+not-found" />
              </Stack>
              <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
            </NavigationThemeProvider>
          </PaperProvider>
        </CustomThemeProvider>
      </AuthContext.Provider>
    </GestureHandlerRootView>
  );
}

// Add styles for GestureHandlerRootView
const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
});
