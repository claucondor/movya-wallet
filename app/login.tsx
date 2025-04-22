import { ThemedText } from '@/components/ThemedText';
import { ThemeToggleButton } from '@/components/ui/ThemeToggleButton';
import { Link } from 'expo-router';
import { Image, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      {/* Logo */}
      <Image
        source={require('@/assets/logo/logo@HD.png')}
        style={styles.logo}
      />

      {/* Login Form */}
      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#999"
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => {}}
        >
          <ThemedText type="defaultSemiBold" style={styles.loginButtonText}>
            Login
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.web3Button}
          onPress={() => {}}
        >
          <Image
            source={require('@/assets/react-logo.png')}
            style={styles.web3Icon}
          />
          <ThemedText type="defaultSemiBold" style={styles.web3ButtonText}>
            Connect Wallet
          </ThemedText>
        </TouchableOpacity>
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