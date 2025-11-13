import { handleWalletAction } from '@/app/core/walletActionHandler';
import { avalanche } from '@/constants/chains';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
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
  Chip,
  Dialog,
  ActivityIndicator as PaperActivityIndicator,
  Button as PaperButton,
  Text as PaperText,
  TextInput as PaperTextInput,
  Portal,
  Snackbar,
  Surface,
  useTheme as usePaperTheme
} from 'react-native-paper';
import { Video, ResizeMode } from 'expo-av';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from "react-native-safe-area-context";
import BalanceService from '../../core/services/balanceService';
import { FontFamily, Color, Border, Gap, Padding, FontSize } from '../home/GlobalStyles';

export default function SendScreen() {
  const paperTheme = usePaperTheme();
  const { colors } = paperTheme;
  const isDark = paperTheme.dark;
  const searchParams = useLocalSearchParams();
  
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isConfirmDialogVisible, setIsConfirmDialogVisible] = useState(false);

  // Estados para Snackbar
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarIsError, setSnackbarIsError] = useState(false);

  const showConfirmDialog = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsConfirmDialogVisible(true);
  }
  const hideConfirmDialog = () => {
    // No haptic feedback needed when just dismissing, 
    // but could add if triggered by a specific user action like a swipe (not the case here)
    setIsConfirmDialogVisible(false);
  }

  useEffect(() => {
    fetchBalance();
  }, []);

  // Handle navigation parameters from contact selection
  useEffect(() => {
    if (searchParams.recipientValue) {
      setRecipient(searchParams.recipientValue as string);
      console.log('[Send] Preselected recipient from contact:', searchParams.recipientNickname, searchParams.recipientValue);
    }
  }, [searchParams.recipientValue, searchParams.recipientNickname]);

  const fetchBalance = async () => {
    setIsLoading(true);
    try {
      const stxBalance = await BalanceService.getSTXBalance('mainnet');
      setBalance(parseFloat(stxBalance.balance).toFixed(4));
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance('0.0000');
    } finally {
      setIsLoading(false);
    }
  };

  const proceedWithSend = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    hideConfirmDialog();
    setIsSending(true);
    try {
      const result = await handleWalletAction('SEND_TRANSACTION', {
        recipientAddress: recipient,
        amount: amount,
        recipientEmail: null,
        currency: avalanche.nativeCurrency.symbol
      });

      if (result.success) {
        setSnackbarMessage(result.responseMessage || 'Transaction successful!');
        setSnackbarIsError(false);
        setSnackbarVisible(true);
        setRecipient('');
        setAmount('');
        fetchBalance(); 
        // Considerar un pequeño delay antes de navegar para que el snackbar sea visible
        setTimeout(() => router.push('/(app)/wallet'), Snackbar.DURATION_SHORT + 500);
      } else {
        setSnackbarMessage(result.responseMessage || 'Transaction failed. Please try again.');
        setSnackbarIsError(true);
        setSnackbarVisible(true);
      }
    } catch (error: any) {
      console.error('Transaction error:', error);
      setSnackbarMessage(`Error: ${error.message || 'An unexpected error occurred.'}`);
      setSnackbarIsError(true);
      setSnackbarVisible(true);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendConfirmation = async () => {
    if (!recipient) { setSnackbarMessage('Please enter a recipient address'); setSnackbarIsError(true); setSnackbarVisible(true); return; }
    if (!recipient.startsWith('0x') || recipient.length !== 42) { setSnackbarMessage('Please enter a valid Ethereum address'); setSnackbarIsError(true); setSnackbarVisible(true); return; }
    if (!amount) { setSnackbarMessage('Please enter an amount to send'); setSnackbarIsError(true); setSnackbarVisible(true); return; }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) { setSnackbarMessage('Please enter a valid amount greater than 0'); setSnackbarIsError(true); setSnackbarVisible(true); return; }
    if (balance && amountNum > parseFloat(balance)) { setSnackbarMessage('Insufficient balance'); setSnackbarIsError(true); setSnackbarVisible(true); return; }

    showConfirmDialog();
  };
  
  const onDialogCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    hideConfirmDialog();
  }

  const handleMaxAmount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (balance) {
      const balanceNum = parseFloat(balance);
      // Considerar una pequeña reserva para gas, por ejemplo 0.01 o 0.005
      const gasReserve = 0.01;
      const maxSendable = balanceNum > gasReserve ? balanceNum - gasReserve : 0;
      setAmount(maxSendable.toFixed(4)); // Ajustar decimales según sea necesario
    }
  };

  const handleScanQR = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Coming Soon', 'QR scanner will be available in a future update');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <Video
        source={require('../../../assets/bg/header-bg.webm')}
        style={styles.backgroundVideo}
        isLooping
        shouldPlay
        isMuted
        resizeMode={ResizeMode.COVER}
      />
      
      <Portal.Host>
        <View style={styles.content}>
          {/* Header Section with blue background */}
          <View style={styles.headerSection}>
            <Appbar.Header style={styles.appbarHeader}>
              <Appbar.BackAction onPress={() => router.back()} color={Color.colorWhite} />
              <Appbar.Content title={`Send ${avalanche.nativeCurrency.symbol}`} color={Color.colorWhite} titleStyle={styles.appbarTitle} />
              <View style={{ width: 48 }} />
            </Appbar.Header>

            {/* Balance Card in header */}
            <View style={styles.balanceSection}>
              <PaperText variant="bodyMedium" style={styles.balanceLabel}>Current Balance</PaperText>
              {isLoading ? (
                <PaperActivityIndicator size="small" color={Color.colorWhite} style={{alignSelf: 'center'}} />
              ) : (
                <PaperText variant="headlineSmall" style={styles.balanceValue}>
                  {balance ? `${balance} ${avalanche.nativeCurrency.symbol}` : 'Loading...'}
                </PaperText>
              )}
            </View>
          </View>

          {/* Main Content Section with white background */}
          <View style={styles.mainContent}>
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
                <View style={styles.formContainer}>
                  {/* Recipient */}
                  <View style={styles.inputGroup}>
                    {searchParams.recipientNickname && (
                      <View style={styles.preselectedContactInfo}>
                        <PaperText variant="bodyMedium" style={styles.preselectedContactText}>
                          📞 Selected contact: {searchParams.recipientNickname}
                        </PaperText>
                      </View>
                    )}
                    <PaperTextInput
                      mode="outlined"
                      label="Recipient Address"
                      placeholder="Enter 0x address"
                      value={recipient}
                      onChangeText={setRecipient}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={styles.textInput}
                      theme={{ colors: { primary: Color.colorRoyalblue100, text: Color.colorGray100, placeholder: Color.colorGray200, outline: Color.colorGray400 }, roundness: Border.br_16 }}
                      right={<PaperTextInput.Icon icon="qrcode-scan" onPress={handleScanQR} color={Color.colorGray200} />}
                    />
                    <PaperButton 
                      mode="text" 
                      icon="contacts"
                      onPress={() => router.push('/(app)/contacts')}
                      style={styles.contactsButton}
                      labelStyle={styles.textButtonLabel}
                      textColor={Color.colorRoyalblue100}
                    >
                      Select from Contacts
                    </PaperButton>
                  </View>

                  {/* Amount */}
                  <View style={styles.inputGroup}>
                    <PaperTextInput
                      mode="outlined"
                      label={`Amount (${avalanche.nativeCurrency.symbol})`}
                      placeholder={`0.00 ${avalanche.nativeCurrency.symbol}`}
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="decimal-pad"
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={styles.textInput}
                      theme={{ colors: { primary: Color.colorRoyalblue100, text: Color.colorGray100, placeholder: Color.colorGray200, outline: Color.colorGray400 }, roundness: Border.br_16 }}
                      right={<PaperButton onPress={handleMaxAmount} compact textColor={Color.colorRoyalblue100} labelStyle={styles.textButtonLabel}>MAX</PaperButton>}
                    />
                    <Chip 
                      icon="information-outline" 
                      style={[styles.gasFeeChip, { backgroundColor: Color.colorRoyalblue200 }]}
                      textStyle={[styles.gasFeeChipText, { color: Color.colorRoyalblue100, fontFamily: FontFamily.geist }]}
                      onPress={() => Alert.alert("Gas Fee Information", "A small network fee (gas) is required for every transaction on the Avalanche network. This fee is paid to network validators and is not collected by Movya Wallet. The amount displayed is an approximation.")}
                    >
                      Gas fee: ~0.01 {avalanche.nativeCurrency.symbol}
                    </Chip>
                  </View>

                  {/* Send Button */}
                  <View style={styles.buttonContainer}>
                    <PaperButton
                      mode="contained"
                      onPress={handleSendConfirmation}
                      loading={isSending}
                      disabled={!recipient || !amount || isSending || isLoading}
                      icon="send"
                      style={styles.sendButtonFill}
                      labelStyle={styles.sendButtonLabel}
                    >
                      Send
                    </PaperButton>
                  </View>

                  <View style={styles.warningContainer}>
                    <PaperText variant="bodySmall" style={styles.warningText}>
                      ⚠️ Always double-check the recipient address before sending. Transactions cannot be reversed.
                    </PaperText>
                  </View>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </View>

        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={Snackbar.DURATION_SHORT}
          style={snackbarIsError ? styles.snackbarError : styles.snackbarSuccess}
        >
          {snackbarMessage}
        </Snackbar>

        <Portal>
          <Dialog visible={isConfirmDialogVisible} onDismiss={onDialogCancel}>
            <Dialog.Title style={styles.dialogTitle}>Confirm Transaction</Dialog.Title>
            <Dialog.Content>
              <PaperText style={styles.dialogContentText}>Send {amount} {avalanche.nativeCurrency.symbol} to:</PaperText>
              <PaperText selectable style={styles.dialogContentTextRecipient}>{recipient}</PaperText>
            </Dialog.Content>
            <Dialog.Actions>
              <PaperButton onPress={onDialogCancel} textColor={Color.colorRoyalblue100} labelStyle={styles.textButtonLabel}>Cancel</PaperButton>
              <PaperButton onPress={proceedWithSend} buttonColor={Color.colorRoyalblue100} textColor={Color.colorWhite} labelStyle={styles.textButtonLabel}>Confirm</PaperButton>
            </Dialog.Actions>
          </Dialog>
        </Portal>

      </Portal.Host>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.colorGray400,
  },
  backgroundVideo: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  content: {
    flex: 1,
    flexDirection: 'column',
  },
  headerSection: {
    paddingBottom: Padding.p_24,
  },
  appbarHeader: {
    backgroundColor: 'transparent',
    elevation: 0,
  },
  appbarTitle: {
    fontFamily: FontFamily.geist,
    fontSize: FontSize.size_20,
    fontWeight: 'bold',
  },
  balanceSection: {
    paddingHorizontal: Padding.p_24,
    paddingTop: Padding.p_12,
    alignItems: 'center',
  },
  balanceLabel: {
    fontFamily: FontFamily.geist,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: Gap.gap_4,
    fontSize: FontSize.size_14,
  },
  balanceValue: {
    fontFamily: FontFamily.geist,
    color: Color.colorWhite,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 28,
  },
  mainContent: {
    flex: 1,
    backgroundColor: Color.colorWhite,
    borderTopLeftRadius: Border.br_32,
    borderTopRightRadius: Border.br_32,
    paddingTop: Padding.p_24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Padding.p_24,
    paddingBottom: Padding.p_24,
  },
  formContainer: {
    gap: Gap.gap_16,
  },
  inputGroup: {
    gap: Gap.gap_4,
  },
  textInput: {
    backgroundColor: Color.colorWhite,
    fontFamily: FontFamily.geist,
  },
  contactsButton: {
    alignSelf: 'flex-start',
  },
  textButtonLabel: {
    fontFamily: FontFamily.geist,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  buttonContainer: {
    marginTop: Gap.gap_12,
  },
  sendButtonFill: {
    backgroundColor: Color.colorRoyalblue100,
    borderRadius: Border.br_32,
    paddingVertical: Padding.p_12,
  },
  sendButtonLabel: {
    fontFamily: FontFamily.geist,
    color: Color.colorWhite,
    fontSize: FontSize.size_14,
    fontWeight: 'bold',
  },
  gasFeeChip: {
    alignSelf: 'flex-start',
  },
  gasFeeChipText: {
    fontSize: FontSize.size_12,
  },
  snackbarError: {
    backgroundColor: '#B00020',
  },
  snackbarSuccess: {
    backgroundColor: '#4CAF50',
  },
  dialogTitle: {
    fontFamily: FontFamily.geist,
    color: Color.colorGray100,
    fontWeight: 'bold',
    fontSize: FontSize.size_20,
  },
  dialogContentText: {
    fontFamily: FontFamily.geist,
    color: Color.colorGray200,
    fontSize: FontSize.size_14,
    marginBottom: Gap.gap_4,
  },
  dialogContentTextRecipient: {
    fontFamily: FontFamily.geist,
    color: Color.colorGray100,
    fontSize: FontSize.size_14,
    fontWeight: 'bold',
  },
  warningContainer: {
    paddingHorizontal: Padding.p_12,
  },
  warningText: {
    textAlign: 'center',
    opacity: 0.7,
    fontFamily: FontFamily.geist,
    color: Color.colorGray200,
  },
  preselectedContactInfo: {
    backgroundColor: '#F0F8FF',
    borderRadius: Border.br_12,
    padding: Padding.p_12,
    borderWidth: 1,
    borderColor: Color.colorRoyalblue100,
  },
  preselectedContactText: {
    fontFamily: FontFamily.geist,
    color: Color.colorRoyalblue100,
    fontWeight: '600',
  },
}); 