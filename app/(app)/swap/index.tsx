import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
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
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import SwapService, { SwapQuote, SwapResult } from '../../core/services/swapService';
import PortfolioService from '../../core/services/portfolioService';
import { FontFamily, Color, Border, Gap, Padding, FontSize } from '../../(app)/home/GlobalStyles';
import Usdcvector from "../../../assets/usdclogo.svg";
import Avavector from "../../../assets/avalogo.svg";

interface TokenOption {
  symbol: 'WAVAX' | 'USDC';
  name: string;
  balance: string;
  decimals: number;
}

const SwapScreen: React.FC = () => {
  // State management
  const [fromToken, setFromToken] = useState<TokenOption | null>(null);
  const [toToken, setToToken] = useState<TokenOption | null>(null);
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isGettingQuote, setIsGettingQuote] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [swapResult, setSwapResult] = useState<SwapResult | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [tokens, setTokens] = useState<TokenOption[]>([]);

  const theme = usePaperTheme();
  const videoRef = useRef<Video>(null);

  // Available tokens for swap
  const availableTokens: TokenOption[] = [
    {
      symbol: 'WAVAX',
      name: 'Wrapped AVAX',
      balance: '0',
      decimals: 18
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      balance: '0',
      decimals: 6
    }
  ];

  // Load balances
  useEffect(() => {
    const loadBalances = async () => {
      try {
        const portfolio = await PortfolioService.getPortfolio();
        const updatedTokens = availableTokens.map(token => {
          const portfolioToken = portfolio.tokens.find(t => t.symbol === token.symbol);
          return {
            ...token,
            balance: portfolioToken ? portfolioToken.balance : '0'
          };
        });
        setTokens(updatedTokens);
        
        // Set default tokens if not set
        if (!fromToken && updatedTokens.length > 0) {
          setFromToken(updatedTokens[0]); // WAVAX
        }
        if (!toToken && updatedTokens.length > 1) {
          setToToken(updatedTokens[1]); // USDC
        }
      } catch (error) {
        console.error('Error loading balances:', error);
      }
    };

    loadBalances();
  }, []);

  // Get quote when amount or tokens change
  useEffect(() => {
    if (fromToken && toToken && amount && parseFloat(amount) > 0) {
      getQuote();
    } else {
      setQuote(null);
    }
  }, [fromToken, toToken, amount]);

  const getQuote = async () => {
    if (!fromToken || !toToken || !amount || parseFloat(amount) <= 0) return;

    setIsGettingQuote(true);
    try {
      const swapService = SwapService.getInstance();
      const quoteResult = await swapService.getSwapQuote(
        fromToken.symbol,
        toToken.symbol,
        amount,
        0.5 // 0.5% slippage
      );
      setQuote(quoteResult);
    } catch (error) {
      console.error('Error getting quote:', error);
      setSnackbarMessage(`Error getting quote: ${(error as Error).message}`);
      setSnackbarVisible(true);
    } finally {
      setIsGettingQuote(false);
    }
  };

  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setAmount('');
    setQuote(null);
  };

  const handleMaxAmount = () => {
    if (fromToken) {
      setAmount(fromToken.balance);
    }
  };

  const validateSwap = (): string | null => {
    if (!fromToken || !toToken) return 'Please select both tokens';
    if (!amount || parseFloat(amount) <= 0) return 'Please enter an amount';
    if (parseFloat(amount) > parseFloat(fromToken.balance)) return 'Insufficient balance';
    if (!quote) return 'No quote available';
    return null;
  };

  const handleSwap = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const validation = validateSwap();
    if (validation) {
      setSnackbarMessage(validation);
      setSnackbarVisible(true);
      return;
    }

    setShowConfirmDialog(true);
  };

  const executeSwap = async () => {
    if (!fromToken || !toToken || !quote) return;

    setIsLoading(true);
    setShowConfirmDialog(false);

    try {
      const swapService = SwapService.getInstance();
      let result: SwapResult;

      if (fromToken.symbol === 'WAVAX') {
        result = await swapService.swapWAVAXToUSDC(amount);
      } else {
        result = await swapService.swapUSDCToWAVAX(amount);
      }

      setSwapResult(result);

      if (result.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSnackbarMessage(`Swap successful! ${result.amountIn} ${result.fromToken} → ${result.amountOut} ${result.toToken}`);
        
        // Reset form
        setAmount('');
        setQuote(null);
        
        // Reload balances
        setTimeout(() => {
          const loadBalances = async () => {
            try {
              const portfolio = await PortfolioService.getPortfolio();
              const updatedTokens = availableTokens.map(token => {
                const portfolioToken = portfolio.tokens.find(t => t.symbol === token.symbol);
                return {
                  ...token,
                  balance: portfolioToken ? portfolioToken.balance : '0'
                };
              });
              setTokens(updatedTokens);
              
              // Update selected tokens with new balances
              if (fromToken) {
                setFromToken(updatedTokens.find(t => t.symbol === fromToken.symbol) || fromToken);
              }
              if (toToken) {
                setToToken(updatedTokens.find(t => t.symbol === toToken.symbol) || toToken);
              }
            } catch (error) {
              console.error('Error reloading balances:', error);
            }
          };
          loadBalances();
        }, 2000);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setSnackbarMessage(`Swap failed: ${result.error}`);
      }
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setSnackbarMessage(`Error executing swap: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
      setSnackbarVisible(true);
    }
  };

  const TokenCard = ({ 
    label, 
    selectedToken, 
    onSelect, 
    excludeToken 
  }: { 
    label: string; 
    selectedToken: TokenOption | null; 
    onSelect: (token: TokenOption) => void;
    excludeToken?: TokenOption | null;
  }) => {
    const availableOptions = tokens.filter(token => token.symbol !== excludeToken?.symbol);
    
    return (
      <View style={styles.tokenSelector}>
        <PaperText style={styles.tokenLabel}>{label}</PaperText>
        {selectedToken ? (
          <View style={styles.tokenOption}>
            {selectedToken.symbol === 'USDC' ? (
              <Usdcvector width={32} height={32} />
            ) : (
              <Avavector width={32} height={32} />
            )}
            <View style={styles.tokenInfo}>
              <PaperText style={styles.tokenSymbol}>{selectedToken.symbol}</PaperText>
              <PaperText style={styles.tokenBalance}>
                Balance: {parseFloat(selectedToken.balance).toFixed(4)}
              </PaperText>
            </View>
            <TouchableOpacity 
              onPress={() => {
                const otherToken = availableOptions.find(t => t.symbol !== selectedToken.symbol);
                if (otherToken) onSelect(otherToken);
              }}
              style={styles.changeButton}
            >
              <PaperText style={styles.changeButtonText}>Change</PaperText>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {availableOptions.map((token) => (
              <TouchableOpacity
                key={token.symbol}
                onPress={() => onSelect(token)}
                style={styles.tokenOption}
              >
                {token.symbol === 'USDC' ? (
                  <Usdcvector width={32} height={32} />
                ) : (
                  <Avavector width={32} height={32} />
                )}
                <View style={styles.tokenInfo}>
                  <PaperText style={styles.tokenSymbol}>{token.symbol}</PaperText>
                  <PaperText style={styles.tokenName}>{token.name}</PaperText>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background Video */}
      <Video
        ref={videoRef}
        source={require('../../../assets/bg/header-bg.webm')}
        style={styles.backgroundVideo}
        shouldPlay
        isLooping
        isMuted
        resizeMode={ResizeMode.COVER}
      />

      <SafeAreaView style={styles.content}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={styles.headerSection}>
            <Appbar.Header style={styles.appbarHeader}>
              <Appbar.BackAction 
                onPress={() => router.back()} 
                iconColor="white" 
              />
              <Appbar.Content 
                title="Swap Tokens" 
                titleStyle={styles.appbarTitle} 
              />
            </Appbar.Header>
          </View>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Main Content Card */}
            <Surface style={styles.mainCard}>
              {/* From Token Section */}
              <TokenCard
                label="From"
                selectedToken={fromToken}
                onSelect={setFromToken}
                excludeToken={toToken}
              />

              {/* Amount Input */}
              <View style={styles.amountSection}>
                                <PaperTextInput
                  label="Amount"
                  value={amount}
                  onChangeText={setAmount}
                  mode="outlined"
          keyboardType="numeric"
                  style={styles.amountInput}
                  outlineStyle={styles.inputOutline}
                  contentStyle={styles.inputContent}
                  theme={{
                    colors: {
                      primary: Color.colorRoyalblue100,
                      onSurface: Color.colorGray100,
                      onSurfaceVariant: Color.colorGray200,
                      outline: Color.colorGray300,
                      background: Color.colorWhite,
                    }
                  }}
                  right={
                    <PaperTextInput.Affix 
                      text={fromToken?.symbol || ''} 
                      textStyle={styles.inputAffix}
                    />
                  }
                />
                <TouchableOpacity 
                  style={styles.maxButton}
                  onPress={handleMaxAmount}
                >
                  <PaperText style={styles.maxButtonText}>MAX</PaperText>
        </TouchableOpacity>
      </View>

              {/* Swap Arrow */}
              <View style={styles.swapArrowContainer}>
                <TouchableOpacity 
                  style={styles.swapArrowButton}
                  onPress={handleSwapTokens}
                >
                  <PaperText style={styles.swapArrow}>⇅</PaperText>
      </TouchableOpacity>
              </View>

              {/* To Token Section */}
              <TokenCard
                label="To"
                selectedToken={toToken}
                onSelect={setToToken}
                excludeToken={fromToken}
              />

              {/* Quote Section */}
              {(isGettingQuote || quote) && (
                <Card style={styles.quoteCard}>
                  <Card.Content>
                    {isGettingQuote ? (
                      <View style={styles.loadingContainer}>
                        <PaperActivityIndicator size="small" />
                        <PaperText style={styles.loadingText}>Getting quote...</PaperText>
                      </View>
                    ) : quote ? (
                      <View>
                        <View style={styles.quoteRow}>
                          <PaperText style={styles.quoteLabel}>You'll receive:</PaperText>
                          <PaperText style={styles.quoteValue} numberOfLines={1}>
                            {parseFloat(quote.amountOut).toFixed(4)} {quote.toToken}
                          </PaperText>
                        </View>
                        <View style={styles.quoteRow}>
                          <PaperText style={styles.quoteLabel}>Min. received:</PaperText>
                          <PaperText style={styles.quoteValue} numberOfLines={1}>
                            {parseFloat(quote.amountOutMin).toFixed(4)} {quote.toToken}
                          </PaperText>
                        </View>
                        <View style={styles.quoteRow}>
                          <PaperText style={styles.quoteLabel}>Price impact:</PaperText>
                          <PaperText style={styles.quoteValue}>
                            {quote.priceImpact.toFixed(2)}%
                          </PaperText>
                        </View>
                        <View style={styles.quoteRow}>
                          <PaperText style={styles.quoteLabel}>Gas fee:</PaperText>
                          <PaperText style={styles.quoteValue}>
                            {quote.gasEstimateUSD}
                          </PaperText>
                        </View>
                      </View>
                    ) : null}
                  </Card.Content>
                </Card>
              )}

              {/* Swap Button */}
              <PaperButton
                mode="contained"
                onPress={handleSwap}
                disabled={!quote || isLoading || isGettingQuote}
                loading={isLoading}
                style={styles.swapButton}
                labelStyle={styles.swapButtonLabel}
              >
                {isLoading ? 'Swapping...' : 'Swap Tokens'}
              </PaperButton>
            </Surface>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Confirmation Dialog */}
      <Portal>
        <Dialog visible={showConfirmDialog} onDismiss={() => setShowConfirmDialog(false)} style={styles.confirmDialog}>
          <Dialog.Content style={styles.confirmContent}>
            {quote && fromToken && toToken && (
              <View style={styles.confirmContainer}>
                <View style={styles.confirmHeader}>
                  <PaperText style={styles.confirmTitle}>Confirm Swap</PaperText>
                </View>
                
                <View style={styles.confirmSwapInfo}>
                  <View style={styles.confirmTokenRow}>
                    <View style={styles.confirmTokenInfo}>
                      {fromToken.symbol === 'USDC' ? (
                        <Usdcvector width={24} height={24} />
                      ) : (
                        <Avavector width={24} height={24} />
                      )}
                      <PaperText style={styles.confirmTokenAmount} numberOfLines={1}>{amount} {fromToken.symbol}</PaperText>
                    </View>
      </View>

                  <View style={styles.confirmArrow}>
                    <PaperText style={styles.confirmArrowText}>↓</PaperText>
      </View>

                  <View style={styles.confirmTokenRow}>
                    <View style={styles.confirmTokenInfo}>
                      {toToken.symbol === 'USDC' ? (
                        <Usdcvector width={24} height={24} />
                      ) : (
                        <Avavector width={24} height={24} />
                      )}
                      <PaperText style={styles.confirmTokenAmount} numberOfLines={1}>
                        {parseFloat(quote.amountOut).toFixed(4)} {toToken.symbol}
                      </PaperText>
                    </View>
                  </View>
                </View>

                <View style={styles.confirmDetails}>
                  <View style={styles.confirmDetailRow}>
                    <PaperText style={styles.confirmDetailLabel}>Minimum received:</PaperText>
                    <PaperText style={styles.confirmDetailValue}>
                      {parseFloat(quote.amountOutMin).toFixed(4)} {toToken.symbol}
                    </PaperText>
                  </View>
                  <View style={styles.confirmDetailRow}>
                    <PaperText style={styles.confirmDetailLabel}>Price impact:</PaperText>
                    <PaperText style={[styles.confirmDetailValue, quote.priceImpact > 5 ? styles.warningText : null]}>
                      {quote.priceImpact.toFixed(2)}%
                    </PaperText>
                  </View>
                  <View style={styles.confirmDetailRow}>
                    <PaperText style={styles.confirmDetailLabel}>Network fee:</PaperText>
                    <PaperText style={styles.confirmDetailValue}>{quote.gasEstimateUSD}</PaperText>
                  </View>
                </View>

                <View style={styles.confirmActions}>
                  <PaperButton 
                    mode="contained" 
                    onPress={executeSwap}
                    disabled={isLoading}
                    loading={isLoading}
                    style={styles.confirmButton}
                    labelStyle={styles.confirmButtonText}
                  >
                    {isLoading ? 'Swapping...' : 'Confirm'}
                  </PaperButton>
                  <PaperButton 
                    mode="outlined" 
                    onPress={() => setShowConfirmDialog(false)}
                    style={styles.cancelButton}
                    labelStyle={styles.cancelButtonText}
                  >
                    Cancel
                  </PaperButton>
                </View>
              </View>
            )}
          </Dialog.Content>
        </Dialog>
      </Portal>

      {/* Snackbar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={4000}
        style={styles.snackbar}
        theme={{
          colors: {
            onSurface: Color.colorWhite,
            surface: Color.colorRoyalblue100,
          }
        }}
      >
        <PaperText style={styles.snackbarText}>{snackbarMessage}</PaperText>
      </Snackbar>
    </View>
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
  keyboardView: {
    flex: 1,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Padding.p_24,
  },
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Border.br_24,
    padding: Padding.p_24,
    elevation: 4,
  },
  tokenSelector: {
    marginBottom: Padding.p_12,
  },
  tokenLabel: {
    fontFamily: FontFamily.geist,
    fontSize: FontSize.size_14,
    fontWeight: '600',
    color: Color.colorGray200,
    marginBottom: Gap.gap_4,
  },
  tokenList: {
    flexDirection: 'row',
  },
  tokenOption: {
    backgroundColor: '#F8FAFC',
    borderRadius: Border.br_12,
    padding: Padding.p_12,
    marginRight: Gap.gap_12,
    minWidth: 80,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tokenOptionSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: Color.colorRoyalblue100,
  },
  tokenIcon: {
    fontSize: FontSize.size_20,
    marginBottom: Gap.gap_4,
  },
  tokenSymbol: {
    fontFamily: FontFamily.geist,
    fontSize: FontSize.size_12,
    fontWeight: '600',
    marginBottom: Gap.gap_4,
  },
  tokenBalance: {
    fontFamily: FontFamily.geist,
    fontSize: FontSize.size_12,
    color: Color.colorGray200,
  },
  amountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Padding.p_12,
  },
  amountInput: {
    flex: 1,
    marginRight: Gap.gap_4,
  },
  inputOutline: {
    borderColor: Color.colorGray300,
    borderRadius: Border.br_12,
    backgroundColor: Color.colorWhite,
  },
  inputContent: {
    fontFamily: FontFamily.geist,
    fontSize: FontSize.size_14,
    backgroundColor: Color.colorWhite,
  },
  inputAffix: {
    fontFamily: FontFamily.geist,
    fontSize: FontSize.size_14,
    fontWeight: '600',
  },
  maxButton: {
    backgroundColor: Color.colorRoyalblue100,
    borderRadius: Border.br_12,
    paddingHorizontal: Padding.p_12,
    paddingVertical: Padding.p_8,
  },
  maxButtonText: {
    fontFamily: FontFamily.geist,
    fontSize: FontSize.size_12,
    fontWeight: '600',
    color: 'white',
  },
  swapArrowContainer: {
    alignItems: 'center',
    marginVertical: Padding.p_8,
  },
  swapArrowButton: {
    backgroundColor: Color.colorRoyalblue100,
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  swapArrow: {
    fontSize: FontSize.size_20,
    color: 'white',
    fontWeight: 'bold',
  },
  quoteCard: {
    backgroundColor: Color.colorWhite,
    marginBottom: Padding.p_12,
    borderWidth: 1,
    borderColor: Color.colorGray300,
  },
  quoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Gap.gap_4,
    paddingHorizontal: Padding.p_4,
  },
  quoteLabel: {
    fontFamily: FontFamily.geist,
    fontSize: FontSize.size_12,
    color: Color.colorGray200,
    flex: 1,
  },
  quoteValue: {
    fontFamily: FontFamily.geist,
    fontSize: FontSize.size_12,
    fontWeight: '600',
    color: Color.colorGray100,
    textAlign: 'right',
    flex: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: Gap.gap_4,
    fontFamily: FontFamily.geist,
    fontSize: FontSize.size_14,
  },
  swapButton: {
    backgroundColor: Color.colorRoyalblue100,
    borderRadius: Border.br_12,
    paddingVertical: Padding.p_8,
  },
  swapButtonLabel: {
    fontFamily: FontFamily.geist,
    fontSize: FontSize.size_14,
    fontWeight: '600',
  },
  snackbar: {
    backgroundColor: Color.colorRoyalblue100,
  },
  snackbarText: {
    fontFamily: FontFamily.geist,
    fontSize: FontSize.size_14,
    color: Color.colorWhite,
    fontWeight: '600',
  },
  // Confirmation Dialog Styles
  confirmDialog: {
    margin: Padding.p_24,
    backgroundColor: Color.colorWhite,
  },
  confirmContent: {
    padding: 0,
    backgroundColor: Color.colorWhite,
  },
  confirmContainer: {
    padding: Padding.p_24,
    backgroundColor: Color.colorWhite,
  },
  confirmHeader: {
    alignItems: 'center',
    marginBottom: Padding.p_24,
  },
  confirmTitle: {
    fontFamily: FontFamily.geist,
    fontSize: FontSize.size_20,
    fontWeight: '700',
    color: Color.colorGray100,
  },
  confirmSwapInfo: {
    backgroundColor: '#F8FAFC',
    borderRadius: Border.br_16,
    padding: Padding.p_24,
    marginBottom: Padding.p_24,
  },
  confirmTokenRow: {
    alignItems: 'center',
  },
  confirmTokenInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Color.colorWhite,
    borderRadius: Border.br_12,
    padding: Padding.p_12,
    elevation: 1,
  },
  confirmTokenAmount: {
    fontFamily: FontFamily.geist,
    fontSize: FontSize.size_12,
    fontWeight: '600',
    marginLeft: Gap.gap_12,
    color: Color.colorGray100,
    flex: 1,
    flexShrink: 1,
  },
  confirmArrow: {
    alignItems: 'center',
    marginVertical: Padding.p_12,
  },
  confirmArrowText: {
    fontSize: FontSize.size_20,
    color: Color.colorRoyalblue100,
    fontWeight: 'bold',
  },
  confirmDetails: {
    backgroundColor: '#F8FAFC',
    borderRadius: Border.br_12,
    padding: Padding.p_12,
    marginBottom: Padding.p_24,
  },
  confirmDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Gap.gap_4,
    flexWrap: 'wrap',
  },
  confirmDetailLabel: {
    fontFamily: FontFamily.geist,
    fontSize: FontSize.size_12,
    color: Color.colorGray200,
    flex: 1,
    minWidth: 80,
  },
  confirmDetailValue: {
    fontFamily: FontFamily.geist,
    fontSize: FontSize.size_12,
    fontWeight: '600',
    color: Color.colorGray100,
    flex: 1,
    textAlign: 'right',
    flexShrink: 1,
  },
  warningText: {
    color: '#FF6B6B',
  },
  confirmActions: {
    flexDirection: 'column',
    gap: Gap.gap_12,
    marginTop: Padding.p_8,
  },
  cancelButton: {
    width: '100%',
    borderColor: Color.colorGray300,
    borderRadius: Border.br_12,
    height: 44,
  },
  cancelButtonText: {
    fontFamily: FontFamily.geist,
    fontSize: FontSize.size_14,
    fontWeight: '600',
    color: Color.colorGray200,
  },
  confirmButton: {
    width: '100%',
    backgroundColor: Color.colorRoyalblue100,
    borderRadius: Border.br_12,
    height: 44,
  },
  confirmButtonText: {
    fontFamily: FontFamily.geist,
    fontSize: FontSize.size_14,
    fontWeight: '600',
    color: Color.colorWhite,
  },
  // New token selector styles with consistent colors
  tokenInfo: {
    flex: 1,
    marginLeft: 12,
  },
  tokenName: {
    fontFamily: FontFamily.geist,
    fontSize: FontSize.size_12,
    color: Color.colorGray200,
  },
  changeButton: {
    padding: Padding.p_8,
    borderRadius: Border.br_12,
    backgroundColor: Color.colorRoyalblue200,
  },
  changeButtonText: {
    fontFamily: FontFamily.geist,
    fontSize: FontSize.size_12,
    color: Color.colorRoyalblue100,
    fontWeight: '600',
  },
}); 

export default SwapScreen; 