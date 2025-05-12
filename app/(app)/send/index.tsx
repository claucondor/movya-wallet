import { handleWalletAction } from '@/app/core/walletActionHandler';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { avalancheFuji } from '@/constants/chains';
import { useTheme } from '@/hooks/ThemeContext';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { createPublicClient, formatEther, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { storage } from '../../core/storage';

const PRIVATE_KEY_STORAGE_KEY = 'userPrivateKey';

export default function SendScreen() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    setIsLoading(true);
    try {
      const privateKey = storage.getString(PRIVATE_KEY_STORAGE_KEY);
      if (!privateKey) {
        throw new Error('No private key found');
      }

      const account = privateKeyToAccount(privateKey as `0x${string}`);
      
      const client = createPublicClient({
        chain: avalancheFuji,
        transport: http(avalancheFuji.rpcUrls.default.http[0])
      });

      const balanceWei = await client.getBalance({
        address: account.address
      });

      const balanceFormatted = formatEther(balanceWei);
      setBalance(parseFloat(balanceFormatted).toFixed(4));
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!recipient) {
      Alert.alert('Error', 'Please enter a recipient address');
      return;
    }

    if (!recipient.startsWith('0x') || recipient.length !== 42) {
      Alert.alert('Error', 'Please enter a valid Ethereum address');
      return;
    }

    if (!amount) {
      Alert.alert('Error', 'Please enter an amount to send');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount greater than 0');
      return;
    }

    if (balance && amountNum > parseFloat(balance)) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    Alert.alert(
      'Confirm Transaction',
      `Are you sure you want to send ${amount} AVAX to ${recipient}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Send',
          style: 'destructive',
          onPress: async () => {
            setIsSending(true);
            try {
              const result = await handleWalletAction('SEND_TRANSACTION', {
                recipientAddress: recipient,
                amount: amount,
                recipientEmail: null,
                currency: 'AVAX'
              });

              if (result.success) {
                Alert.alert(
                  'Success',
                  result.responseMessage,
                  [
                    { 
                      text: 'OK', 
                      onPress: () => {
                        setRecipient('');
                        setAmount('');
                        fetchBalance();
                        router.push('/(app)/wallet');
                      }
                    }
                  ]
                );
              } else {
                Alert.alert('Error', result.responseMessage);
              }
            } catch (error: any) {
              console.error('Transaction error:', error);
              Alert.alert('Error', `Failed to send transaction: ${error.message}`);
            } finally {
              setIsSending(false);
            }
          }
        }
      ]
    );
  };

  const handleMaxAmount = () => {
    if (balance) {
      const balanceNum = parseFloat(balance);
      const max = Math.max(0, balanceNum - 0.01).toFixed(4);
      setAmount(max);
    }
  };

  const handleScanQR = () => {
    Alert.alert('Coming Soon', 'QR scanner will be available in a future update');
  };

  // Completely rebuilt UI with careful attention to nesting
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: isDark ? '#0A0E17' : '#F5F7FA' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
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
        
        <ThemedText type="title" style={styles.headerTitle}>
          {`Send ${avalancheFuji.nativeCurrency.symbol}`}
        </ThemedText>
        
        <View style={{ width: 40 }}></View>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.scrollContent}>
          {/* Balance Card */}
          <View style={[styles.balanceCard, { backgroundColor: isDark ? '#1A1F38' : '#FFFFFF' }]}>
            <ThemedText style={styles.balanceLabel}>Current Balance</ThemedText>
            {isLoading ? (
              <ActivityIndicator size="small" color={isDark ? '#3A5AFF' : '#0A7EA4'} />
            ) : (
              <ThemedText type="title" style={styles.balanceValue}>
                {balance ? `${balance} ${avalancheFuji.nativeCurrency.symbol}` : 'Loading...'}
              </ThemedText>
            )}
          </View>

          {/* Form Card */}
          <View style={[styles.formCard, { backgroundColor: isDark ? '#1A1F38' : '#FFFFFF' }]}>
            {/* Recipient */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Recipient Address</ThemedText>
              
              <View style={styles.addressInputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    { 
                      backgroundColor: isDark ? '#252D4A' : '#E8EAF6',
                      color: isDark ? '#FFFFFF' : '#0A0E17',
                      flex: 1,
                    }
                  ]}
                  placeholder="Enter 0x address"
                  placeholderTextColor={isDark ? '#9BA1A6' : '#6C7A9C'}
                  value={recipient}
                  onChangeText={setRecipient}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                
                <TouchableOpacity 
                  style={[
                    styles.scanButton,
                    { backgroundColor: isDark ? '#3A5AFF' : '#0A7EA4' }
                  ]}
                  onPress={handleScanQR}
                >
                  <IconSymbol
                    name="qrcode"
                    size={20}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.contactsButton}
                onPress={() => router.push('/(app)/contacts')}
              >
                <IconSymbol
                  name="person.2.fill"
                  size={16}
                  color={isDark ? '#3A5AFF' : '#0A7EA4'}
                />
                <ThemedText
                  style={[styles.contactsText, { color: isDark ? '#3A5AFF' : '#0A7EA4' }]}
                >
                  Select from Contacts
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Amount */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>
                {`Amount (${avalancheFuji.nativeCurrency.symbol})`}
              </ThemedText>
              
              <View style={styles.amountInputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    { 
                      backgroundColor: isDark ? '#252D4A' : '#E8EAF6',
                      color: isDark ? '#FFFFFF' : '#0A0E17',
                      flex: 1,
                    }
                  ]}
                  placeholder={`0.0 ${avalancheFuji.nativeCurrency.symbol}`}
                  placeholderTextColor={isDark ? '#9BA1A6' : '#6C7A9C'}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                
                <TouchableOpacity 
                  style={[
                    styles.maxButton,
                    { backgroundColor: isDark ? '#3A5AFF' : '#0A7EA4' }
                  ]}
                  onPress={handleMaxAmount}
                >
                  <ThemedText style={{ color: '#FFFFFF', fontWeight: '600' }}>
                    MAX
                  </ThemedText>
                </TouchableOpacity>
              </View>
              
              <ThemedText style={styles.gasFeeNote}>
                Note: Transaction will require gas fees (~0.01 AVAX)
              </ThemedText>
            </View>

            {/* Send Button */}
            <TouchableOpacity
              style={[
                styles.sendButton,
                { backgroundColor: isSending ? (isDark ? '#324499' : '#086483') : (isDark ? '#3A5AFF' : '#0A7EA4') },
                (!recipient || !amount || isSending) && styles.disabledButton
              ]}
              onPress={handleSend}
              disabled={!recipient || !amount || isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.buttonContent}>
                  <IconSymbol
                    name="paperplane.fill"
                    size={18}
                    color="#FFFFFF"
                  />
                  <ThemedText style={styles.sendButtonText}>
                    Send Transaction
                  </ThemedText>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Warning Note */}
          <View style={styles.warningContainer}>
            <ThemedText style={styles.warningText}>
              ⚠️ Always double-check the recipient address before sending. Transactions cannot be reversed.
            </ThemedText>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  balanceCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  balanceLabel: {
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.7,
  },
  balanceValue: {
    fontSize: 24,
  },
  formCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  addressInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  scanButton: {
    marginLeft: 8,
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  contactsText: {
    marginLeft: 4,
    textDecorationLine: 'underline',
    fontSize: 14,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  maxButton: {
    marginLeft: 8,
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gasFeeNote: {
    fontSize: 12,
    marginTop: 8,
    opacity: 0.7,
  },
  sendButton: {
    borderRadius: 8,
    paddingVertical: 16,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  warningContainer: {
    marginTop: 8,
    marginBottom: 24,
  },
  warningText: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
  },
}); 