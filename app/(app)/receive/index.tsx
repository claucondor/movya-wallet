import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import Clipboard from '@react-native-clipboard/clipboard';
import { ResizeMode, Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Image, Pressable, Share, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { storage } from '../../core/storage';

const PRIVATE_KEY_STORAGE_KEY = 'userPrivateKey';

export default function ReceiveScreen() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Animation values
  const copyAnimatedValue = useRef(new Animated.Value(1)).current;
  const shareAnimatedValue = useRef(new Animated.Value(1)).current;

  const animateButton = (value: Animated.Value, callback?: () => void) => {
    Animated.sequence([
      Animated.timing(value, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(value, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(callback);
  };

  useEffect(() => {
    const loadAddress = () => {
      setIsLoading(true);
      setError(null);
      try {
        const pk = storage.getString(PRIVATE_KEY_STORAGE_KEY);
        if (!pk) {
          throw new Error('Private key not found in storage.');
        }
        const privateKeyHex = pk.startsWith('0x') ? pk as Hex : `0x${pk}` as Hex;
        const account = privateKeyToAccount(privateKeyHex);
        setAddress(account.address);
      } catch (err: any) {
        console.error("Failed to load address:", err);
        setError(err.message || 'Failed to load wallet address.');
        Alert.alert('Error', err.message || 'Could not load your wallet address.');
      } finally {
        setIsLoading(false);
      }
    };

    loadAddress();
  }, []);

  const copyToClipboard = useCallback(async () => {
    if (address) {
      animateButton(copyAnimatedValue, () => {
        Clipboard.setString(address);
        Alert.alert('Copied!', 'Your address has been copied to the clipboard.');
      });
    }
  }, [address]);

  const shareAddress = useCallback(async () => {
    if (address) {
      animateButton(shareAnimatedValue, async () => {
        try {
          await Share.share({
            message: `My Movya wallet address: ${address}`,
          });
        } catch (error: any) {
          Alert.alert('Error', 'Could not share address');
        }
      });
    }
  }, [address]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={isDark ? '#FFFFFF' : '#3A5AFF'} />
        <ThemedText type="default">Loading your address...</ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="warning-outline" size={40} color="#E53E3E" />
        <ThemedText type="default" style={styles.errorText}>{error}</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.videoContainer}>
        <Video
          source={require('@/assets/bg/header-bg.mp4')}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          isLooping
          shouldPlay
          isMuted
        />
        <LinearGradient
          colors={['rgba(0,24,69,0.2)', 'rgba(0,24,69,0.4)']}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={styles.header}>
        <ThemedText
          type="title"
          style={styles.headerTitle}
          lightColor="#FFFFFF"
          darkColor="#FFFFFF"
        >
          Receive AVAX
        </ThemedText>
        <Image
          source={require('@/assets/Avax_Token.png')}
          style={styles.tokenLogo}
          resizeMode="contain"
        />
      </View>

      <View style={[styles.content, { backgroundColor: isDark ? '#1A1F38' : '#FFFFFF' }]}>
        <View style={styles.qrContainer}>
          <LinearGradient
            colors={isDark ? ['#2D3748', '#1A202C'] : ['#FFFFFF', '#F7FAFC']}
            style={styles.qrWrapper}
          >
            {address && (
              <QRCode
                value={address}
                size={200}
                backgroundColor="transparent"
                color={isDark ? '#FFFFFF' : '#000000'}
                logoBackgroundColor="transparent"
              />
            )}
          </LinearGradient>
        </View>

        <View style={styles.addressContainer}>
          <ThemedText type="defaultSemiBold" style={styles.addressLabel}>
            Your Wallet Address
          </ThemedText>
          <Pressable onPress={copyToClipboard}>
            <ThemedText 
              type="default" 
              style={styles.addressText}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {address}
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.buttonContainer}>
          <Animated.View style={[
            styles.buttonWrapper,
            { transform: [{ scale: copyAnimatedValue }] }
          ]}>
            <LinearGradient
              colors={isDark ? ['#2D3748', '#1A202C'] : ['#EDF2F7', '#E2E8F0']}
              style={[styles.button, styles.copyButton]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Pressable
                style={styles.buttonContent}
                onPress={copyToClipboard}
              >
                <Ionicons 
                  name="copy-outline" 
                  size={20} 
                  color={isDark ? '#FFFFFF' : '#4A5568'} 
                  style={styles.buttonIcon} 
                />
                <ThemedText 
                  type="defaultSemiBold" 
                  style={styles.buttonText}
                  lightColor="#4A5568"
                  darkColor="#FFFFFF"
                >
                  Copy
                </ThemedText>
              </Pressable>
            </LinearGradient>
          </Animated.View>

          <Animated.View style={[
            styles.buttonWrapper,
            { transform: [{ scale: shareAnimatedValue }] }
          ]}>
            <LinearGradient
              colors={['#3A5AFF', '#2541CC']}
              style={[styles.button, styles.shareButton]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Pressable
                style={styles.buttonContent}
                onPress={shareAddress}
              >
                <Ionicons 
                  name="share-social-outline" 
                  size={20} 
                  color="#FFFFFF" 
                  style={styles.buttonIcon} 
                />
                <ThemedText 
                  type="defaultSemiBold" 
                  style={styles.buttonText}
                  lightColor="#FFFFFF"
                  darkColor="#FFFFFF"
                >
                  Share
                </ThemedText>
              </Pressable>
            </LinearGradient>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: '60%',
    overflow: 'hidden',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  tokenLogo: {
    width: 60,
    height: 60,
    marginBottom: 20,
  },
  content: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  qrWrapper: {
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addressContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  addressLabel: {
    marginBottom: 8,
    fontSize: 16,
  },
  addressText: {
    fontSize: 14,
    fontFamily: 'monospace',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  buttonWrapper: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  button: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  copyButton: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  shareButton: {
    backgroundColor: '#3A5AFF',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#E53E3E',
    marginTop: 10,
    textAlign: 'center',
  },
}); 