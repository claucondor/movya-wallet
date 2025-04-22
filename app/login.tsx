import { ThemedText } from '@/components/ThemedText';
import { ThemeToggleButton } from '@/components/ui/ThemeToggleButton';
import {
  GoogleSignin,
  statusCodes
} from '@react-native-google-signin/google-signin';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, TouchableOpacity, View } from 'react-native';

// Configure Google Sign-In for Android
GoogleSignin.configure({
  webClientId: '466947410626-20tp1th3rkkcu3nkqvij8d3271cm9496.apps.googleusercontent.com',
  offlineAccess: true,
  scopes: ['profile', 'email'],
});

export default function LoginScreen() {
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setAuthError('');
      
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      
      router.replace({
        pathname: '/(tabs)',
        params: {
          name: userInfo.user.name || '',
          photo: userInfo.user.photo || ''
        }
      });
    } catch (error: any) {
      setLoading(false);
      
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        setAuthError('Login cancelado');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setAuthError('Google Play Services no disponible');
      } else {
        setAuthError('Error durante el login');
        console.error('Google SignIn error:', error);
      }
    }
  };

  const skipToApp = () => {
    router.replace({
      pathname: '/(tabs)/wallet',
      params: {
        name: 'Usuario Demo',
        photo: ''
      }
    });
  };

  return (
    <View style={styles.container}>
      {/* Logo */}
      <Image
        source={require('@/assets/logo/logo@HD.png')}
        style={styles.logo}
      />

      {/* Login Form */}
      <View style={styles.formContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#3A5AFF" />
        ) : (
          <>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleGoogleLogin}
            >
              <ThemedText type="defaultSemiBold" style={styles.loginButtonText}>
                Iniciar con Google
              </ThemedText>
            </TouchableOpacity>
            
            {authError ? (
              <View style={styles.errorContainer}>
                <ThemedText style={styles.errorText}>{authError}</ThemedText>
              </View>
            ) : null}
          </>
        )}
      </View>

      {/* Skip to app */}
      <TouchableOpacity onPress={skipToApp} style={styles.skipLink}>
        <ThemedText type="defaultSemiBold">Continuar sin login</ThemedText>
      </TouchableOpacity>
      
      {/* Theme toggle */}
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
  formContainer: {
    width: '100%',
    maxWidth: 400,
  },
  input: {
    height: 50,
    backgroundColor: '#1E2237',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    color: 'white',
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#3A5AFF',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  web3Button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3A5AFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 30,
  },
  web3ButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  web3Icon: {
    width: 24,
    height: 24,
  },
  skipLink: {
    marginTop: 20,
  },
  debugContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#252D4A',
    borderRadius: 5,
  },
  debugText: {
    color: '#e0e0e0',
    fontSize: 12,
  },
  errorContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#7E2239',
    borderRadius: 5,
  },
  errorText: {
    color: '#f0f0f0',
    fontSize: 14,
  },
});