import { ThemedText } from '@/components/ThemedText';
import { ThemeToggleButton } from '@/components/ui/ThemeToggleButton';
import * as Google from 'expo-auth-session/providers/google';
import { Link, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, TouchableOpacity, View } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: '466947410626-1g7eikrjel1qus27p27s79qsk72bhgko.apps.googleusercontent.com',
    androidClientId: '466947410626-20tp1th3rkkcu3nkqvij8d3271cm9496.apps.googleusercontent.com',
    redirectUri: (() => {
      // Intenta usar el esquema de la aplicación primero, luego la URL de Expo como respaldo
      let uri;
      if (__DEV__) {
        uri = 'myapp://'; // Esquema definido en app.json
      } else {
        uri = 'https://auth.expo.io/@oydual3-org/movya-wallet';
      }
      console.log('Using redirect URI:', uri);
      return uri;
    })(),
    scopes: ['openid', 'profile', 'email'],
  });

  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (response?.type === 'success') {
      setLoading(true);
      const { authentication } = response;
      
      fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${authentication?.accessToken}` }
      })
      .then(res => res.json())
      .then(user => {
        router.replace({
          pathname: '/(tabs)/wallet',
          params: {
            name: user.name,
            photo: user.picture
          }
        });
      })
      .finally(() => setLoading(false));
    }
  }, [response]);

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
          <TouchableOpacity
            style={styles.loginButton}
            disabled={!request}
            onPress={() => promptAsync()}
          >
            <ThemedText type="defaultSemiBold" style={styles.loginButtonText}>
              Sign in with Google
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>

      {/* Skip to app */}
      <Link href={'/(tabs)/wallet'} style={styles.skipLink}>
        <ThemedText type="defaultSemiBold">Skip to App</ThemedText>
      </Link>
      
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
});