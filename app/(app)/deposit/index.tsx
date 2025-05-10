import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { avalancheFuji } from '@/constants/chains';
import { useTheme } from '@/hooks/ThemeContext';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Clipboard, Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { privateKeyToAccount } from 'viem/accounts';
import { storage } from '../../core/storage';

const PRIVATE_KEY_STORAGE_KEY = 'userPrivateKey';

export default function DepositScreen() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load the wallet address from storage
    const loadWalletAddress = () => {
      setIsLoading(true);
      try {
        const privateKey = storage.getString(PRIVATE_KEY_STORAGE_KEY);
        if (privateKey) {
          const account = privateKeyToAccount(privateKey as `0x${string}`);
          setWalletAddress(account.address);
        } else {
          console.error('No private key found in storage');
          Alert.alert('Error', 'Could not load wallet address. Please log in again.');
        }
      } catch (error) {
        console.error('Failed to load wallet address:', error);
        Alert.alert('Error', 'Could not load wallet address');
      } finally {
        setIsLoading(false);
      }
    };

    loadWalletAddress();
  }, []);

  const copyWalletAddress = () => {
    if (walletAddress) {
      Clipboard.setString(walletAddress);
      setIsCopied(true);
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    }
  };

  const openExplorer = () => {
    if (walletAddress) {
      // Open address in the Avalanche Fuji block explorer
      const explorerUrl = `https://testnet.snowtrace.io/address/${walletAddress}`;
      Linking.openURL(explorerUrl);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0A0E17' : '#F5F7FA' }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol
            name="chevron.left"
            size={24}
            color={isDark ? "#FFFFFF" : "#0A0E17"}
          />
          <ThemedText style={styles.backText}>Back</ThemedText>
        </TouchableOpacity>
        <ThemedText type="title" style={styles.headerTitle}>Deposit</ThemedText>
        <View style={{ width: 40 }} /> {/* Placeholder for symmetry */}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: isDark ? '#1A1F38' : '#FFFFFF' }]}>
          <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
            Your {avalancheFuji.name} Address
          </ThemedText>
          
          <ThemedText style={styles.description}>
            Send only {avalancheFuji.nativeCurrency.symbol} or other assets on the Avalanche network to this address.
          </ThemedText>
          
          {/* QR Code */}
          <View style={styles.qrContainer}>
            {walletAddress ? (
              <QRCode 
                value={walletAddress}
                size={200}
                color="#000000"
                backgroundColor="#FFFFFF"
              />
            ) : (
              <View style={styles.qrPlaceholder}>
                <ThemedText>Loading QR...</ThemedText>
              </View>
            )}
          </View>
          
          {/* Address Display */}
          <View style={[
            styles.addressContainer, 
            { backgroundColor: isDark ? '#252D4A' : '#E8EAF6' }
          ]}>
            <ThemedText
              style={styles.addressText}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {walletAddress || 'Loading address...'}
            </ThemedText>
            
            <TouchableOpacity 
              style={styles.copyButton}
              onPress={copyWalletAddress}
            >
              <IconSymbol 
                name="doc.on.doc" 
                size={20} 
                color={isDark ? '#FFFFFF' : '#0A0E17'} 
              />
            </TouchableOpacity>
          </View>
          
          {isCopied && (
            <View style={styles.copiedIndicator}>
              <ThemedText style={styles.copiedText}>
                Address copied to clipboard!
              </ThemedText>
            </View>
          )}
          
          {/* Explorer Link */}
          <TouchableOpacity 
            style={styles.explorerButton}
            onPress={openExplorer}
          >
            <ThemedText style={styles.explorerText}>
              View on Block Explorer
            </ThemedText>
            <IconSymbol 
              name="arrow.up.right.square" 
              size={16} 
              color={isDark ? '#3A5AFF' : '#0A7EA4'} 
            />
          </TouchableOpacity>
        </View>

        <View style={[styles.infoCard, { backgroundColor: isDark ? '#1A1F38' : '#FFFFFF' }]}>
          <ThemedText type="defaultSemiBold" style={styles.infoTitle}>
            Important Information
          </ThemedText>
          <View style={styles.infoItem}>
            <View style={styles.bulletPoint} />
            <ThemedText style={styles.infoText}>
              Send only {avalancheFuji.nativeCurrency.symbol} tokens to this address.
            </ThemedText>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.bulletPoint} />
            <ThemedText style={styles.infoText}>
              Sending any other assets may result in permanent loss.
            </ThemedText>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.bulletPoint} />
            <ThemedText style={styles.infoText}>
              Transactions typically take 2-5 minutes to complete.
            </ThemedText>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 20,
  },
  content: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    marginBottom: 24,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    alignSelf: 'center',
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
  },
  copyButton: {
    padding: 8,
  },
  copiedIndicator: {
    backgroundColor: 'rgba(39, 174, 96, 0.2)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  copiedText: {
    color: '#27AE60',
    fontSize: 14,
  },
  explorerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  explorerText: {
    marginRight: 8,
    textDecorationLine: 'underline',
  },
  infoCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 16,
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3A5AFF',
    marginTop: 6,
    marginRight: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
  },
}); 