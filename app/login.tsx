import { ThemedText } from '@/components/ThemedText';
import { ThemeToggleButton } from '@/components/ui/ThemeToggleButton';
import { Image, Pressable, StyleSheet, View } from "react-native";
import { useAuth } from './_layout';

export default function LoginScreen() {
  const { startGoogleLogin } = useAuth();

  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/logo/logo@HD.png')}
        style={styles.logo}
      />

      <Pressable
        style={({ pressed }) => [
          styles.oauthButton,
          pressed && styles.oauthButtonPressed,
        ]}
        onPress={startGoogleLogin}
      >
        <ThemedText 
          type="defaultSemiBold" 
          style={styles.oauthButtonText}
        >
          Login with Google
        </ThemedText>
      </Pressable>

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
  oauthButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#3A5AFF',
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
  },
  oauthButtonPressed: {
    backgroundColor: 'rgba(58, 90, 255, 0.1)',
  },
  oauthButtonText: {
    color: '#3A5AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});