import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {
  Appbar,
  Button as PaperButton,
  Text as PaperText,
  TextInput as PaperTextInput,
  Card,
  Chip,
  Surface,
  ActivityIndicator as PaperActivityIndicator,
  Snackbar,
  Dialog,
  Portal,
  useTheme as usePaperTheme
} from 'react-native-paper';
import { Video, ResizeMode } from 'expo-av';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from 'expo-haptics';
import WrapService, { WrapResult, WrapEstimate } from '../app/core/services/wrapService';
import PriceService from '../app/core/services/priceService';
import { FontFamily, Color, Border, Gap, Padding, FontSize } from '../app/(app)/home/GlobalStyles';

interface WrapUnwrapModalProps {
  visible: boolean;
  onClose: () => void;
  tokenSymbol: 'AVAX' | 'WAVAX';
  currentBalance: string;
  onSuccess: () => void;
}

const WrapUnwrapModal: React.FC<WrapUnwrapModalProps> = ({
  visible,
  onClose,
  tokenSymbol,
  currentBalance,
  onSuccess,
}) => {
  const paperTheme = usePaperTheme();
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [gasEstimate, setGasEstimate] = useState<WrapEstimate | null>(null);
  const [estimatingGas, setEstimatingGas] = useState(false);
  const [isConfirmDialogVisible, setIsConfirmDialogVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarIsError, setSnackbarIsError] = useState(false);
  const [usdValue, setUsdValue] = useState<string | null>(null);

  const isWrap = tokenSymbol === 'AVAX';
  const fromToken = tokenSymbol;
  const toToken = isWrap ? 'WAVAX' : 'AVAX';
  const title = isWrap ? 'Wrap AVAX' : 'Unwrap WAVAX';

  // Reset state when modal opens/closes
  useEffect(() => {
    if (visible) {
      setAmount('');
      setGasEstimate(null);
      setSnackbarVisible(false);
      setIsConfirmDialogVisible(false);
    }
  }, [visible]);

  // Estimate gas when amount changes
  useEffect(() => {
    const estimateGas = async () => {
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        setGasEstimate(null);
        return;
      }

      setEstimatingGas(true);
      try {
        const wrapService = WrapService.getInstance();
        let estimate: WrapEstimate;
        
        if (isWrap) {
          estimate = await wrapService.estimateWrapGas(amount);
        } else {
          estimate = await wrapService.estimateUnwrapGas(amount);
        }
        
        setGasEstimate(estimate);
      } catch (error: any) {
        console.error('Error estimating gas:', error);
        setGasEstimate(null);
        // Show error in snackbar if it's a balance issue
        if (error.message.includes('Insufficient balance')) {
          setSnackbarMessage(error.message);
          setSnackbarIsError(true);
          setSnackbarVisible(true);
        }
      } finally {
        setEstimatingGas(false);
      }
    };

    const debounceTimer = setTimeout(estimateGas, 500);
    return () => clearTimeout(debounceTimer);
  }, [amount, isWrap]);

  // Calculate USD value when amount changes
  useEffect(() => {
    const calculateUsdValue = async () => {
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        setUsdValue(null);
        return;
      }

      try {
        const usdAmount = await PriceService.calculateUSDValue(fromToken, Number(amount));
        setUsdValue(`$${usdAmount.toFixed(2)}`);
      } catch (error) {
        console.error('Error calculating USD value:', error);
        setUsdValue(null);
      }
    };

    calculateUsdValue();
  }, [amount, fromToken]);

  const handleMaxPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const balance = parseFloat(currentBalance);
    if (isWrap && balance > 0.01) {
      // Reserve 0.01 AVAX for gas when wrapping
      setAmount((balance - 0.01).toFixed(4));
    } else if (balance > 0) {
      setAmount(currentBalance);
    }
  };

  const handleWrapUnwrap = async () => {
    if (!validateInput()) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsConfirmDialogVisible(true);
  };

  const validateInput = () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setSnackbarMessage('Please enter a valid amount');
      setSnackbarIsError(true);
      setSnackbarVisible(true);
      return false;
    }

    const amountNum = Number(amount);
    const balanceNum = parseFloat(currentBalance);

    if (amountNum > balanceNum) {
      setSnackbarMessage(`Insufficient ${fromToken} balance`);
      setSnackbarIsError(true);
      setSnackbarVisible(true);
      return false;
    }

    if (isWrap && amountNum > balanceNum - 0.01) {
      setSnackbarMessage('Please reserve at least 0.01 AVAX for transaction fees');
      setSnackbarIsError(true);
      setSnackbarVisible(true);
      return false;
    }

    return true;
  };

  const executeTransaction = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsConfirmDialogVisible(false);
    setIsLoading(true);
    
    try {
      const wrapService = WrapService.getInstance();
      let result: WrapResult;
      
      if (isWrap) {
        result = await wrapService.wrapAvax(amount);
      } else {
        result = await wrapService.unwrapWavax(amount);
      }

      if (result.success) {
        setSnackbarMessage(`Successfully ${isWrap ? 'wrapped' : 'unwrapped'} ${amount} ${fromToken}!`);
        setSnackbarIsError(false);
        setSnackbarVisible(true);
        setAmount('');
        onSuccess();
        setTimeout(() => onClose(), 2000);
      } else {
        setSnackbarMessage(result.error || 'Transaction failed');
        setSnackbarIsError(true);
        setSnackbarVisible(true);
      }
    } catch (error: any) {
      console.error('Wrap/Unwrap error:', error);
      setSnackbarMessage(error.message || 'Transaction failed');
      setSnackbarIsError(true);
      setSnackbarVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = amount && 
    Number(amount) > 0 && 
    Number(amount) <= parseFloat(currentBalance) &&
    (!isWrap || Number(amount) <= parseFloat(currentBalance) - 0.01);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <Video
          source={require('../assets/bg/header-bg.webm')}
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
                <Appbar.BackAction onPress={onClose} color={Color.colorWhite} />
                <Appbar.Content title={title} color={Color.colorWhite} titleStyle={styles.appbarTitle} />
                <View style={{ width: 48 }} />
              </Appbar.Header>

              {/* Balance Card in header */}
              <View style={styles.balanceSection}>
                <PaperText variant="bodyMedium" style={styles.balanceLabel}>
                  Available {fromToken}
                </PaperText>
                <PaperText variant="headlineSmall" style={styles.balanceValue}>
                  {currentBalance} {fromToken}
                </PaperText>
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
                    {/* Conversion Display */}
                    <Surface style={styles.conversionCard} elevation={1}>
                      <View style={styles.conversionRow}>
                        <View style={styles.tokenSection}>
                          <PaperText variant="bodySmall" style={styles.tokenLabel}>From</PaperText>
                          <PaperText variant="titleMedium" style={styles.tokenSymbol}>{fromToken}</PaperText>
                        </View>
                        <View style={styles.arrowContainer}>
                          <PaperText variant="headlineMedium" style={styles.arrow}>→</PaperText>
                        </View>
                        <View style={styles.tokenSection}>
                          <PaperText variant="bodySmall" style={styles.tokenLabel}>To</PaperText>
                          <PaperText variant="titleMedium" style={styles.tokenSymbol}>{toToken}</PaperText>
                        </View>
                      </View>
                      <PaperText variant="bodySmall" style={styles.conversionNote}>
                        1:1 conversion ratio
                      </PaperText>
                    </Surface>

                    {/* Amount Input */}
                    <View style={styles.inputGroup}>
                      <PaperTextInput
                        mode="outlined"
                        label={`Amount (${fromToken})`}
                        placeholder={`0.00 ${fromToken}`}
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="decimal-pad"
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={styles.textInput}
                        theme={{ colors: { primary: Color.colorRoyalblue100, text: Color.colorGray100, placeholder: Color.colorGray200, outline: Color.colorGray400 }, roundness: Border.br_16 }}
                        right={<PaperButton onPress={handleMaxPress} compact textColor={Color.colorRoyalblue100} labelStyle={styles.textButtonLabel}>MAX</PaperButton>}
                      />
                      
                      {/* Gas Fee Display */}
                      {(estimatingGas || gasEstimate) && (
                        <Chip 
                          icon="information-outline" 
                          style={[styles.gasFeeChip, { backgroundColor: Color.colorRoyalblue200 }]}
                          textStyle={[styles.gasFeeChipText, { color: Color.colorRoyalblue100, fontFamily: FontFamily.geist }]}
                        >
                          {estimatingGas ? 'Estimating fee...' : `Gas fee: ~${gasEstimate?.estimatedFee} AVAX`}
                        </Chip>
                      )}
                      
                      {/* Result Display */}
                      {amount && Number(amount) > 0 && (
                        <View style={styles.resultSection}>
                          <PaperText variant="bodyMedium" style={styles.resultLabel}>You will receive:</PaperText>
                          <PaperText variant="titleLarge" style={styles.resultAmount}>
                            {amount} {toToken}
                          </PaperText>
                        </View>
                      )}
                    </View>

                    {/* Action Button */}
                    <View style={styles.buttonContainer}>
                      <PaperButton
                        mode="contained"
                        onPress={handleWrapUnwrap}
                        loading={isLoading}
                        disabled={!canProceed || isLoading}
                        icon={isWrap ? "wrap" : "unwrap"}
                        style={styles.actionButton}
                        labelStyle={styles.actionButtonLabel}
                      >
                        {isWrap ? 'Wrap AVAX' : 'Unwrap WAVAX'}
                      </PaperButton>
                    </View>

                    {/* Info Section */}
                    <View style={styles.infoContainer}>
                      <PaperText variant="bodySmall" style={styles.infoText}>
                        ℹ️ {isWrap 
                          ? 'Wrapping converts your AVAX to WAVAX (1:1 ratio). WAVAX is an ERC-20 token that can be used in DeFi protocols.'
                          : 'Unwrapping converts your WAVAX back to native AVAX (1:1 ratio). You can use native AVAX for gas fees and transactions.'
                        }
                      </PaperText>
                    </View>
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>
            </View>
          </View>

          {/* Snackbar */}
          <Snackbar
            visible={snackbarVisible}
            onDismiss={() => setSnackbarVisible(false)}
            duration={Snackbar.DURATION_SHORT}
            style={snackbarIsError ? styles.snackbarError : styles.snackbarSuccess}
          >
            {snackbarMessage}
          </Snackbar>

          {/* Confirmation Dialog */}
          <Portal>
            <Dialog visible={isConfirmDialogVisible} onDismiss={() => setIsConfirmDialogVisible(false)}>
              <Dialog.Title style={styles.dialogTitle}>Confirm Transaction</Dialog.Title>
              <Dialog.Content>
                <PaperText style={styles.dialogContentText}>
                  {isWrap ? 'Wrap' : 'Unwrap'} {amount} {fromToken} to {amount} {toToken}?
                </PaperText>
                {gasEstimate && (
                  <PaperText style={styles.dialogFeeText}>
                    Estimated fee: ~{gasEstimate.estimatedFee} AVAX
                  </PaperText>
                )}
              </Dialog.Content>
              <Dialog.Actions>
                <PaperButton 
                  onPress={() => setIsConfirmDialogVisible(false)} 
                  textColor={Color.colorRoyalblue100} 
                  labelStyle={styles.textButtonLabel}
                >
                  Cancel
                </PaperButton>
                <PaperButton 
                  onPress={executeTransaction} 
                  buttonColor={Color.colorRoyalblue100} 
                  textColor={Color.colorWhite} 
                  labelStyle={styles.textButtonLabel}
                >
                  Confirm
                </PaperButton>
              </Dialog.Actions>
            </Dialog>
          </Portal>

        </Portal.Host>
      </SafeAreaView>
    </Modal>
  );
};

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
  conversionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: Border.br_16,
    padding: Padding.p_12,
    marginBottom: Gap.gap_16,
    borderWidth: 1,
    borderColor: Color.colorGray400,
  },
  conversionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Gap.gap_4,
  },
  tokenSection: {
    alignItems: 'center',
    flex: 1,
  },
  tokenLabel: {
    fontFamily: FontFamily.geist,
    color: Color.colorGray200,
    fontSize: FontSize.size_12,
    marginBottom: Gap.gap_4,
  },
  tokenSymbol: {
    fontFamily: FontFamily.geist,
    color: Color.colorGray100,
    fontSize: FontSize.size_14,
    fontWeight: 'bold',
  },
  arrowContainer: {
    marginHorizontal: Padding.p_12,
  },
  arrow: {
    color: Color.colorRoyalblue100,
    fontSize: 24,
    fontWeight: 'bold',
  },
  conversionNote: {
    fontFamily: FontFamily.geist,
    color: Color.colorGray200,
    textAlign: 'center',
    fontSize: FontSize.size_12,
  },
  inputGroup: {
    gap: Gap.gap_4,
  },
  textInput: {
    backgroundColor: Color.colorWhite,
    fontFamily: FontFamily.geist,
  },
  textButtonLabel: {
    fontFamily: FontFamily.geist,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  gasFeeChip: {
    alignSelf: 'flex-start',
  },
  gasFeeChipText: {
    fontSize: FontSize.size_12,
  },
  resultSection: {
    backgroundColor: '#F0F8FF',
    borderRadius: Border.br_12,
    padding: Padding.p_12,
    borderWidth: 1,
    borderColor: Color.colorRoyalblue100,
    marginTop: Gap.gap_4,
  },
  resultLabel: {
    fontFamily: FontFamily.geist,
    color: Color.colorGray200,
    fontSize: FontSize.size_12,
    marginBottom: Gap.gap_4,
  },
  resultAmount: {
    fontFamily: FontFamily.geist,
    color: Color.colorRoyalblue100,
    fontSize: FontSize.size_14,
    fontWeight: 'bold',
  },
  buttonContainer: {
    marginTop: Gap.gap_16,
  },
  actionButton: {
    backgroundColor: Color.colorRoyalblue100,
    borderRadius: Border.br_32,
    paddingVertical: Padding.p_12,
  },
  actionButtonLabel: {
    fontFamily: FontFamily.geist,
    color: Color.colorWhite,
    fontSize: FontSize.size_14,
    fontWeight: 'bold',
  },
  infoContainer: {
    paddingHorizontal: Padding.p_12,
    marginTop: Gap.gap_16,
  },
  infoText: {
    textAlign: 'center',
    opacity: 0.7,
    fontFamily: FontFamily.geist,
    color: Color.colorGray200,
    fontSize: FontSize.size_12,
    lineHeight: 16,
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
  dialogFeeText: {
    fontFamily: FontFamily.geist,
    color: Color.colorGray100,
    fontSize: FontSize.size_14,
    fontWeight: 'bold',
  },
});

export default WrapUnwrapModal; 