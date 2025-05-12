import { ThemeProvider } from '@/hooks/ThemeContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import "react-native-get-random-values";
import 'react-native-reanimated';
import { createAndSaveWallet, getWalletAddress, loadWallet } from '../internal/walletService';
import { storage } from './core/storage'; // Import MMKV storage
// import { avalanche, avalancheFuji } from 'viem/chains'; // Keep if needed elsewhere, remove if only for Privy

// Backend Callback URL (as configured in Google Cloud Console)
const BACKEND_CALLBACK_URL = 'https://auth-callback-backend-466947410626.us-central1.run.app/auth/callback';

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
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const router = useRouter();
  const segments = useSegments();

  // Function to manually start the Google Login flow
  const startGoogleLogin = useCallback(async () => {
    if (!GOOGLE_WEB_CLIENT_ID) {
      console.error('Google Web Client ID not found in app.json extra config.');
      // TODO: Show error to user
      return;
    }
    try {
      // Construct the Google Auth URL manually
      const scopes = encodeURIComponent('profile email');
      const redirectUri = encodeURIComponent(BACKEND_CALLBACK_URL);
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth` +
                      `?client_id=${GOOGLE_WEB_CLIENT_ID}` +
                      `&redirect_uri=${redirectUri}` +
                      `&response_type=code` +
                      `&scope=${scopes}` +
                      // Add PKCE parameters for enhanced security if desired/required by Google
                      // '&code_challenge=...' +
                      // '&code_challenge_method=S256' +
                      `&access_type=offline`; // Request refresh token if needed by backend

      console.log('Opening Google Auth URL:', authUrl);
      // Open the URL using WebBrowser - does not automatically listen for redirect
      const result = await WebBrowser.openBrowserAsync(authUrl);
      console.log('WebBrowser result:', result);
      // NOTE: openBrowserAsync resolves when the browser is closed manually.
      // We rely SOLELY on the Linking listener for the callback.

    } catch (error) {
      console.error('Error opening web browser for Google Login:', error);
      // TODO: Show error to user
    }
  }, []); // Add dependencies if needed, though GOOGLE_WEB_CLIENT_ID is constant after load

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
      const checkWallet = async () => {
        const address = await getWalletAddress();
        setWalletAddress(address);
        console.log('Initial wallet address check:', address);
      };
      checkWallet();
    }
  }, [loaded]);

  // Effect to handle the DEEP LINK redirect FROM the backend
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      console.log('[HANDLEDLINK] Deep Link Received:', event.url);
      const { path, queryParams } = Linking.parse(event.url);

      console.log('[HANDLEDLINK] Parsed Path:', path);
      console.log('[HANDLEDLINK] Parsed Query Params:', queryParams);

      let recognizedPathType = null;

      // Intentar reconocer por path parseado
      if (path === 'auth-success' || path === '/auth-success') {
        recognizedPathType = 'success';
      } else if (path === 'auth-error' || path === '/auth-error') {
        recognizedPathType = 'error';
      }

      // Si el path no fue reconocido, intentar por la URL completa
      // Esto es útil para esquemas como exp:// donde el path puede ser null
      if (!recognizedPathType && event.url) {
        if (event.url.includes('auth-success')) {
          recognizedPathType = 'success';
          console.log(`[HANDLEDLINK] Recognized 'auth-success' from event.url`);
        } else if (event.url.includes('auth-error')) {
          recognizedPathType = 'error';
          console.log(`[HANDLEDLINK] Recognized 'auth-error' from event.url`);
        }
      }

      if (recognizedPathType === 'success') {
        console.log('[HANDLEDLINK] Processing auth-success...');
        const currentUserId = queryParams?.userId as string || null;
        console.log('[HANDLEDLINK] User ID from backend:', currentUserId);

        if (currentUserId) {
          storage.set('userId', currentUserId);
          console.log('[HANDLEDLINK] User ID stored after deep link in MMKV:', currentUserId);
        } else {
          console.warn('[HANDLEDLINK] No userId received from backend in auth-success deep link.');
        }

        let wallet = await loadWallet();
        if (!wallet) {
          console.log('[HANDLEDLINK] No existing wallet found, creating a new one...');
          wallet = await createAndSaveWallet();
        }
        setWalletAddress(wallet.address);
        console.log('[HANDLEDLINK] Wallet address after login:', wallet.address);
        
        console.log('[HANDLEDLINK] Attempting to replace route to /(app)/wallet');
        router.replace('/(app)/wallet');
        console.log('[HANDLEDLINK] Route replace to /(app)/wallet called.');

      } else if (recognizedPathType === 'error') {
        console.error('[HANDLEDLINK] Processing auth-error...');
        const errorMessage = queryParams?.message as string || 'Authentication failed via backend.';
        console.log('[HANDLEDLINK] Attempting to replace route to /(auth)/error');
        router.replace({ pathname: '/(auth)/error', params: { message: errorMessage } });
        console.log('[HANDLEDLINK] Route replace to /(auth)/error called.');
      } else {
        console.warn('[HANDLEDLINK] Deep link event.url not recognized for auth-success or auth-error:', event.url);
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

    if (walletAddress && (inAuthGroup || segments.length === 0 || segments[0] === 'index')) {
      // User is authenticated but is in auth group, at root, or on the initial index.tsx
      // Redirect to main app screen.
      // Avoid redirecting if already in (app) group to prevent loops, unless it's from root index.
      // Also, allow staying on auth/success or auth/error if those are the current deep link targets.
      if (segments[1] !== 'success' && segments[1] !== 'error') {
         console.log('Redirecting to /(app)/wallet due to walletAddress and current segment');
         router.replace('/(app)/wallet'); // Or your preferred app entry point
      }
    } else if (!walletAddress && inAppGroup) {
      // User is not authenticated but is in the app group. Redirect to login.
      console.log('Redirecting to /(auth)/login due to no walletAddress and in-app segment');
      router.replace('/(auth)/login');
    }
    // If on app/index.tsx and no wallet, app/index.tsx itself should redirect to /(auth)/login.
    // If on app/index.tsx and has wallet, this effect will push to /(app)/wallet.

  }, [walletAddress, segments, loaded, router]);

  // Value provided by the context
  const authContextValue: AuthContextType = {
    startGoogleLogin,
    walletAddress,
    // Add other state here
  };

  return (
    // Wrap with AuthContext.Provider
    <AuthContext.Provider value={authContextValue}>
      <ThemeProvider>
        <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
            <Stack.Screen name="index" options={{ animation: 'none' }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        </NavigationThemeProvider>
      </ThemeProvider>
    </AuthContext.Provider>
  );
}
