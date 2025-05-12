import { handleWalletAction } from '@/app/core/walletActionHandler';
import { avalancheFuji } from '@/constants/chains';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View
} from 'react-native';
import {
  Appbar,
  Card,
  ActivityIndicator as PaperActivityIndicator,
  Button as PaperButton,
  Text as PaperText,
  TextInput as PaperTextInput,
  Surface,
  useTheme as usePaperTheme
} from 'react-native-paper';
import { createPublicClient, formatEther, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { storage } from '../../core/storage';

const PRIVATE_KEY_STORAGE_KEY = 'userPrivateKey';

export default function SendScreen() {
  const paperTheme = usePaperTheme();
  const { colors } = paperTheme;
  const isDark = paperTheme.dark;
  
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
      `Are you sure you want to send ${amount} ${avalancheFuji.nativeCurrency.symbol} to ${recipient}?`,
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
                currency: avalancheFuji.nativeCurrency.symbol
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

  return (
    <Surface style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={`Send ${avalancheFuji.nativeCurrency.symbol}`} />
        <View style={{ width: 40 }} />{/* Spacer for centering title */}
      </Appbar.Header>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0} // Adjust as needed
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Card style={styles.card}>
            <Card.Content>
              <PaperText variant="labelLarge" style={styles.balanceLabel}>Current Balance</PaperText>
              {isLoading ? (
                <PaperActivityIndicator size="small" color={colors.primary} style={{alignSelf: 'center'}} />
              ) : (
                <PaperText variant="headlineSmall" style={styles.balanceValue}>
                  {balance ? `${balance} ${avalancheFuji.nativeCurrency.symbol}` : 'Loading...'}
                </PaperText>
              )}
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              {/* Recipient */}
              <View style={styles.inputGroup}>
                <PaperTextInput
                  mode="outlined"
                  label="Recipient Address"
                  placeholder="Enter 0x address"
                  value={recipient}
                  onChangeText={setRecipient}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                  right={<PaperTextInput.Icon icon="qrcode-scan" onPress={handleScanQR} />}
                />
                <PaperButton 
                  mode="text" 
                  icon="contacts"
                  onPress={() => router.push('/(app)/contacts')}
                  style={styles.contactsButton}
                >
                  Select from Contacts
                </PaperButton>
              </View>

              {/* Amount */}
              <View style={styles.inputGroup}>
                <PaperTextInput
                  mode="outlined"
                  label={`Amount (${avalancheFuji.nativeCurrency.symbol})`}
                  placeholder={`0.00 ${avalancheFuji.nativeCurrency.symbol}`}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                  right={<PaperButton onPress={handleMaxAmount} compact>MAX</PaperButton>}
                />
                <PaperText variant="bodySmall" style={styles.gasFeeNote}>
                  Note: Transaction will require gas fees (approx. 0.01 {avalancheFuji.nativeCurrency.symbol})
                </PaperText>
              </View>
            </Card.Content>
            <Card.Actions>
              <PaperButton
                mode="contained"
                onPress={handleSend}
                loading={isSending}
                disabled={!recipient || !amount || isSending || isLoading}
                icon="send"
                style={styles.sendButtonFill}
              >
                {isSending ? 'Sending...' : 'Send Transaction'}
              </PaperButton>
            </Card.Actions>
          </Card>

          <View style={styles.warningContainer}>
            <PaperText variant="bodySmall" style={styles.warningText}>
              ⚠️ Always double-check the recipient address before sending. Transactions cannot be reversed.
            </PaperText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  balanceLabel: {
    textAlign: 'center',
    marginBottom: 8,
    opacity: 0.7,
  },
  balanceValue: {
    textAlign: 'center',
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 16,
  },
  input: {
    // backgroundColor: 'transparent', // TextInput manages its own background with theme
  },
  contactsButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  gasFeeNote: {
    marginTop: 8,
    opacity: 0.7,
    textAlign: 'center',
  },
  sendButtonFill: {
    flex: 1, // Make button take full width in Card.Actions
  },
  warningContainer: {
    marginTop: 8,
    marginBottom: 24, // Extra space at the bottom
    paddingHorizontal: 16,
  },
  warningText: {
    textAlign: 'center',
    opacity: 0.7,
  },
}); 