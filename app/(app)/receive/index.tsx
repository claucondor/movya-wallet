import { Ionicons } from '@expo/vector-icons'; // Assuming expo icons are installed
import Clipboard from '@react-native-clipboard/clipboard';
// import * as SecureStore from 'expo-secure-store'; // Remove SecureStore import
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { storage } from '../../core/storage'; // Import MMKV storage using relative path

// Define the key used in storage
const PRIVATE_KEY_STORAGE_KEY = 'userPrivateKey';

export default function ReceiveScreen() {
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Make the function synchronous as storage.getString is synchronous
    const loadAddress = () => { 
      setIsLoading(true);
      setError(null);
      try {
        // Use MMKV's synchronous getString
        const pk = storage.getString(PRIVATE_KEY_STORAGE_KEY); 
        if (!pk) {
          // Adjust error message for MMKV
          throw new Error('Private key not found in storage.'); 
        }
        // Ensure the key starts with 0x for viem
        // Type assertion as Hex for viem compatibility
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
      Clipboard.setString(address);
      Alert.alert('Copied!', 'Your address has been copied to the clipboard.');
    }
  }, [address]);

  const shareAddress = useCallback(async () => {
    if (address) {
      try {
        await Share.share({
          message: `My wallet address: ${address}`,
        });
      } catch (error: any) {
        Alert.alert('Error', 'Could not share address');
      }
    }
  }, [address]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" />
        <Text>Loading your address...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="warning-outline" size={40} color="red" />
        <Text style={styles.errorText}>{error}</Text>
        {/* Optional: Add a retry button */}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Receive Funds</Text>
      <View style={styles.qrContainer}>
        {address && (
          <QRCode
            value={address}
            size={200}
            logoBackgroundColor='transparent'
          />
        )}
      </View>
      <Text style={styles.addressLabel}>Your Address:</Text>
      <TouchableOpacity onPress={copyToClipboard}>
        <Text selectable style={styles.addressText}>{address}</Text>
      </TouchableOpacity>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={copyToClipboard}>
          <Ionicons name="copy-outline" size={20} color="#fff" />
          <Text style={styles.buttonText}>Copy Address</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={shareAddress}>
          <Ionicons name="share-outline" size={20} color="#fff" />
          <Text style={styles.buttonText}>Share Address</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  center: {
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  qrContainer: {
    marginBottom: 30,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
  },
  addressLabel: {
    fontSize: 16,
    color: '#555',
    marginBottom: 5,
  },
  addressText: {
    fontSize: 14, // Smaller font for address
    fontFamily: 'monospace', // Monospace font for readability
    color: '#007AFF', // Blue color to indicate interactivity
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
  },
  errorText: {
    color: 'red',
    marginTop: 10,
    textAlign: 'center',
  },
}); 