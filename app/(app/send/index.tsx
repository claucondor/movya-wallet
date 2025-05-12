import { handleWalletAction } from '@/app/core/walletActionHandler';
import { avalancheFuji } from '@/constants/chains';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert, // Se mantendrá para alertas simples de error/éxito por ahora
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    View
} from 'react-native';
import {
    Appbar,
    Card, // Añadido
    Dialog,
    ActivityIndicator as PaperActivityIndicator,
    Button as PaperButton,
    Text as PaperText,
    TextInput as PaperTextInput,
    Portal,
    Surface, // Añadido
    useTheme as usePaperTheme
} from 'react-native-paper';

const PRIVATE_KEY_STORAGE_KEY = 'userPrivateKey';

export default function SendScreen() {
  const paperTheme = usePaperTheme();
  const { colors } = paperTheme;
  // const isDark = paperTheme.dark; // No se usa directamente si los colores vienen de paperTheme.colors
  
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isConfirmDialogVisible, setIsConfirmDialogVisible] = useState(false);

  const showConfirmDialog = () => setIsConfirmDialogVisible(true);
  const hideConfirmDialog = () => setIsConfirmDialogVisible(false);

  useEffect(() => { fetchBalance(); }, []);

  const fetchBalance = async () => { /* ... (sin cambios) ... */ };

  const proceedWithSend = async () => {
    hideConfirmDialog();
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
                fetchBalance(); // Refrescar balance después del envío
                router.push('/(app)/wallet');
              }
            }
          ]
        );
      } else {
        Alert.alert('Transaction Error', result.responseMessage || 'An unknown error occurred.');
      }
    } catch (error: any) {
      console.error('Transaction error:', error);
      Alert.alert('Error', `Failed to send transaction: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendConfirmation = async () => {
    if (!recipient) { Alert.alert('Error', 'Please enter a recipient address'); return; }
    if (!recipient.startsWith('0x') || recipient.length !== 42) { Alert.alert('Error', 'Please enter a valid Ethereum address'); return; }
    if (!amount) { Alert.alert('Error', 'Please enter an amount to send'); return; }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) { Alert.alert('Error', 'Please enter a valid amount greater than 0'); return; }
    if (balance && amountNum > parseFloat(balance)) { Alert.alert('Error', 'Insufficient balance'); return; }

    showConfirmDialog(); // Mostrar diálogo en lugar de Alert.alert para confirmación
  };

  const handleMaxAmount = () => { /* ... (sin cambios) ... */ };
  const handleScanQR = () => { /* ... (sin cambios) ... */ };

  return (
    <Portal.Host> 
      <Surface style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title={`Send ${avalancheFuji.nativeCurrency.symbol}`} />
          <View style={{ width: 40 }} />
        </Appbar.Header>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
        >
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* ... (Card de Balance y Card de Formulario como antes, usando PaperTextInput, etc.) ... */}
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
                    onPress={handleSendConfirmation} // Cambiado a handleSendConfirmation
                    loading={isSending} // isSending se usará para el estado de carga del botón y diálogo
                    disabled={!recipient || !amount || isSending || isLoading} // Mismas condiciones de disabled
                    icon="send"
                    style={styles.sendButtonFill}
                >
                    {isSending ? 'Processing...' : 'Send Transaction'} 
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

        <Portal>
          <Dialog visible={isConfirmDialogVisible} onDismiss={hideConfirmDialog}>
            <Dialog.Icon icon="information" size={32} />
            <Dialog.Title style={{textAlign: 'center'}}>Confirm Transaction</Dialog.Title>
            <Dialog.Content>
              <PaperText variant="bodyMedium" style={{textAlign: 'center'}}>
                Are you sure you want to send {amount} {avalancheFuji.nativeCurrency.symbol} to:
              </PaperText>
              <PaperText variant="bodyMedium" style={{textAlign: 'center', fontWeight:'bold', marginVertical:8}}>
                {recipient}
              </PaperText>
              <PaperText variant="bodySmall" style={{textAlign: 'center', color: colors.onSurfaceVariant}}>
                This action cannot be undone.
              </PaperText>
            </Dialog.Content>
            <Dialog.Actions>
              <PaperButton onPress={hideConfirmDialog} textColor={colors.secondary}>Cancel</PaperButton>
              <PaperButton onPress={proceedWithSend} buttonColor={colors.primary} textColor={colors.onPrimary}>Send</PaperButton>
            </Dialog.Actions>
          </Dialog>
        </Portal>

      </Surface>
    </Portal.Host>
  );
}

// ... (styles sin cambios) ...
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