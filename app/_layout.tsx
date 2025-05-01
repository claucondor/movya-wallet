import { ThemeProvider } from '@/hooks/ThemeContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import "react-native-get-random-values";
import 'react-native-reanimated';
import { createAndSaveWallet, getWalletAddress, loadWallet } from '../internal/walletService';
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
      console.log('Deep Link Received:', event.url);
      const { path, queryParams } = Linking.parse(event.url);

      if (path === 'auth-success') {
        console.log('Authentication successful via backend redirect!');
        console.log('User ID from backend:', queryParams?.userId);

        let wallet = await loadWallet();
        if (!wallet) {
          console.log('No existing wallet found, creating a new one...');
          wallet = await createAndSaveWallet();
        }
        setWalletAddress(wallet.address);
        console.log('Wallet address after login:', wallet.address);

        // TODO: Store other user info (userId?) and navigate
        // e.g., await SecureStore.setItemAsync('userId', queryParams?.userId);
        // router.replace('/(tabs)/'); // Example navigation

      } else if (path === 'auth-error') {
        console.error('Authentication failed via backend redirect:', queryParams?.message);
        // TODO: Handle failed login (show error message)
      }
    };

    // Subscribe to incoming links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Clean up the subscription on unmount
    return () => subscription.remove();
  }, []);

  // TODO: You need to EXPOSE `startGoogleLogin` to your UI
  // Option 1: Pass it via Context
  // Option 2: Define it within a screen component (like login screen) and call it from a button
  // Example (conceptual - place in your login button's onPress):
  // <Button title="Login with Google" onPress={startGoogleLogin} />

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
