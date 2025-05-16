import ActionButtons from '@/components/ui/ActionButtons';
import ChatInput from '@/components/ui/ChatInput';
import { avalanche, avalancheFuji } from '@/constants/chains';
import { ResizeMode, Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Alert, Clipboard, Image, Platform, StatusBar as ReactNativeStatusBar, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import 'react-native-get-random-values';
import {
  Card,
  Chip,
  List,
  ActivityIndicator as PaperActivityIndicator,
  Button as PaperButton,
  IconButton as PaperIconButton,
  Text as PaperText,
  Portal,
  Surface,
  useTheme as usePaperTheme
} from 'react-native-paper';
import 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createPublicClient, formatEther, http } from 'viem';
import { PrivateKeyAccount, privateKeyToAccount } from 'viem/accounts';
import { storage } from '../core/storage';

const PRIVATE_KEY_STORAGE_KEY = 'userPrivateKey';

// Estilos para ActionView
const actionViewStyles = StyleSheet.create({
  fullScreenView: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    alignSelf: 'center',
    marginTop: 30, // Aumentar margen superior para separarlo del contenido
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
});

const ActionView = ({ title, onBack, children }: { title: string; onBack: () => void; children?: React.ReactNode }) => {
  const paperTheme = usePaperTheme();
  
  return (
    <Surface style={[actionViewStyles.fullScreenView, { backgroundColor: paperTheme.colors.background }]}>
      <PaperText variant="headlineSmall" style={{ marginBottom: 20, color: paperTheme.colors.onBackground }}>{title}</PaperText>
      {children}
      <PaperButton
        mode="contained"
        style={actionViewStyles.backButton}
        onPress={onBack}
        icon="arrow-left"
      >
        Back
      </PaperButton>
    </Surface>
  );
};

export default function WalletScreen() {
  const [activeTab, setActiveTab] = useState<'tokens' | 'transactions'>('tokens');
  const [currentView, setCurrentView] = useState<'main' | 'send' | 'receive' | 'deposit' | 'swap'>('main');
  const paperTheme = usePaperTheme();
  const { colors, dark: isDark } = paperTheme;
  const insets = useSafeAreaInsets();
  
  const [account, setAccount] = useState<PrivateKeyAccount | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [currentChain, setCurrentChain] = useState(avalancheFuji);
  const [avaxBalance, setAvaxBalance] = useState('0');
  const [totalValueUSD, setTotalValueUSD] = useState('$0.00');

  const [tokens, setTokens] = useState([{
    id: "1",
    name: "Avalanche",
    symbol: "AVAX",
    amount: "0",
    value: "$0.00"
  }]);

  const [isCopied, setIsCopied] = useState(false);

  const [dialogVisible, setDialogVisible] = useState(false);
  const showDialog = () => setDialogVisible(true);
  const hideDialog = () => setDialogVisible(false);

  const switchNetwork = async () => {
    const newChain = currentChain.id === avalanche.id ? avalancheFuji : avalanche;
    setCurrentChain(newChain);
    setAvaxBalance('...');
    setTokens([{
      id: "1",
      name: newChain.name,
      symbol: newChain.nativeCurrency.symbol,
      amount: '...',
      value: '$?.??'
    }]);
  };

  const fetchAvaxBalance = async () => {
    if (!account) return;
    try {
      const client = createPublicClient({ chain: currentChain, transport: http(currentChain.rpcUrls.default.http[0]) });
      const balanceWei = await client.getBalance({ address: account.address });
      const balanceFormatted = formatEther(balanceWei);
      const balanceDisplay = parseFloat(balanceFormatted).toFixed(4);
      setAvaxBalance(balanceDisplay);
      let calculatedValueUSD = 0;
      const pricePerToken = currentChain.id === avalanche.id ? 35 : 0.01;
      calculatedValueUSD = parseFloat(balanceDisplay) * pricePerToken;
      const formattedTotalValueUSD = `$${calculatedValueUSD.toFixed(2)}`;
      setTotalValueUSD(formattedTotalValueUSD);
      setTokens([{
        id: "1",
        name: currentChain.name,
        symbol: currentChain.nativeCurrency.symbol,
        amount: balanceDisplay,
        value: formattedTotalValueUSD
      }]);
    } catch (error) {
      console.error('Error fetching balance:', error);
      setAvaxBalance("Error");
      setTotalValueUSD('$?.??');
      setTokens([{
        id: "1",
        name: currentChain.name,
        symbol: currentChain.nativeCurrency.symbol,
        amount: "Error",
        value: "$?.??"
      }]);
    }
  };

  useEffect(() => {
    if (account) {
      fetchAvaxBalance();
      const interval = setInterval(fetchAvaxBalance, 15000);
      return () => clearInterval(interval);
    }
  }, [account, currentChain]);

  useEffect(() => {
    const loadAccount = () => {
      setIsLoading(true);
      try {
        const privateKey = storage.getString(PRIVATE_KEY_STORAGE_KEY);
        if (privateKey) {
          const loadedAccount = privateKeyToAccount(privateKey as `0x${string}`); 
          setAccount(loadedAccount);
          setWalletAddress(loadedAccount.address);
        }
      } catch (error) {
        console.error('Failed to load wallet from MMKV:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadAccount();
  }, []);

  const handleAction = (view: 'send' | 'receive' | 'deposit' | 'swap') => router.push(`/(app)/${view}`);
  const handleBack = () => setCurrentView('main');

  const copyWalletAddress = () => {
    if (walletAddress) {
      Clipboard.setString(walletAddress);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <Surface style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <PaperActivityIndicator animating={true} size="large" color={colors.primary} />
        <PaperText variant="titleMedium" style={{marginTop: 16, color: colors.onSurface}}>Loading Wallet...</PaperText>
      </Surface>
    );
  }
  
  if (!account) {
      return (
         <Surface style={[styles.container, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }]}>
             <PaperIconButton icon="alert-circle-outline" size={48} iconColor={colors.error} />
             <PaperText variant="headlineSmall" style={{color: colors.error, marginTop: 16, marginBottom: 8, textAlign: 'center'}}>Error Loading Wallet</PaperText>
             <PaperText style={{textAlign: 'center', color: colors.onSurfaceVariant}}>Could not load wallet details.</PaperText>
             <PaperText style={{textAlign: 'center', color: colors.onSurfaceVariant}}>Please try logging out and back in.</PaperText>
         </Surface>
      )
  }

  if (currentView !== 'main') {
    switch (currentView) {
      case 'deposit':
        return (
          <ActionView title="Deposit Crypto" onBack={handleBack}>
            <PaperText variant="bodyLarge" style={{color: colors.onSurface}}>Deposit UI Placeholder</PaperText>
            <PaperText style={{marginTop:10, color: colors.onSurfaceVariant}}>Your address for deposit:</PaperText>
            <Chip icon="content-copy" style={{marginTop:8}} onPress={copyWalletAddress}>
                {walletAddress ? `${walletAddress.slice(0,10)}...${walletAddress.slice(-8)}` : 'Loading...'}
            </Chip>
            {isCopied && <Chip style={{marginTop:8, backgroundColor:colors.tertiaryContainer}} textStyle={{color:colors.onTertiaryContainer}}>Copied!</Chip>}
          </ActionView>
        );
      case 'swap':
        return (
          <ActionView title="Swap Tokens" onBack={handleBack}>
            <PaperText variant="bodyLarge" style={{color: colors.onSurface}}>Swap UI Placeholder</PaperText>
          </ActionView>
        );
      default:
        setCurrentView('main'); 
        return null;
    }
  }

  return (
    <Portal.Host>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? "light" : "dark"} translucent={true} backgroundColor="transparent" />

        <View style={styles.videoContainer}>
          <Video
            source={require('@/assets/bg/header-bg.mp4')}
            style={StyleSheet.absoluteFill}
            resizeMode={ResizeMode.COVER}
            isLooping shouldPlay isMuted
          />
          <LinearGradient
            colors={isDark ? ['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.4)'] : ['rgba(0,10,30,0.6)', 'rgba(0,10,30,0.4)']}
            style={StyleSheet.absoluteFill}
          />
        </View>

        {/* Encabezado personalizado para evitar el recorte del texto */}
        <View style={{ height: insets.top }} />
        <View style={styles.customHeader}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Movya Wallet</Text>
            <Text style={styles.headerSubtitle}>{currentChain.name}</Text>
          </View>
          <View style={styles.headerActions}>
            <PaperIconButton 
              icon="swap-horizontal-bold" 
              onPress={switchNetwork} 
              iconColor="#FFFFFF" 
              rippleColor="rgba(255,255,255,0.3)"
            />
            <PaperIconButton 
              icon="account-multiple-outline" 
              onPress={() => router.push("/(app)/contacts")} 
              iconColor="#FFFFFF" 
              rippleColor="rgba(255,255,255,0.3)"
            />
          </View>
        </View>

        {currentView === 'main' && (
          <>
            <View style={styles.balanceHeaderContent}> 
              <PaperText variant="labelLarge" style={[styles.totalBalanceText, { color: '#FFFFFF' }]}>
                Total Estimated Balance
              </PaperText>
              <PaperText variant="displaySmall" style={[styles.totalBalanceValue, { color: '#FFFFFF', textShadowColor: 'rgba(0, 0, 0, 0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }]}>
                {totalValueUSD}
              </PaperText>

              <View style={styles.addressAndControlsContainer}>                
                <TouchableOpacity 
                  onPress={copyWalletAddress} 
                  style={styles.addressTouchable}
                >
                  <PaperIconButton 
                      icon="wallet-outline" 
                      size={20} 
                      iconColor={'#FFFFFF'} 
                      style={{marginRight:0}} 
                  />
                  <PaperText
                    variant="bodyMedium"
                    style={[styles.walletAddressText, { color: '#FFFFFF', textShadowColor: 'rgba(0, 0, 0, 0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }]} 
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {walletAddress 
                      ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}` 
                      : 'Loading address...'}
                  </PaperText>
                  {isCopied && (
                    <Chip 
                      icon="check-circle" 
                      mode="flat" 
                      style={[styles.copiedChip, { backgroundColor: 'rgba(0,255,0,0.2)' }]} 
                      textStyle={{ color: '#FFFFFF', fontSize: 11, fontWeight:'bold' }}
                    >
                      COPIED
                    </Chip>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <Surface style={[
              styles.contentSurface,
              { 
                backgroundColor: colors.surface, 
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -3 },
                shadowOpacity: 0.1,
                shadowRadius: 6,
                elevation: 5, 
              }
            ]}>
              <View style={styles.tabs}>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'tokens' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
                  onPress={() => setActiveTab('tokens')}
                >
                  <PaperIconButton 
                    icon="format-list-bulleted-square"
                    size={20} 
                    iconColor={activeTab === 'tokens' ? colors.primary : colors.onSurfaceVariant}
                  />
                  <PaperText
                    variant="labelLarge"
                    style={{ fontWeight: activeTab === 'tokens' ? 'bold' : 'normal', color: activeTab === 'tokens' ? colors.primary : colors.onSurfaceVariant, marginLeft: 4 }}
                  >
                    Tokens
                  </PaperText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'transactions' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
                  onPress={() => setActiveTab('transactions')}
                >
                  <PaperIconButton 
                    icon="history" 
                    size={20} 
                    iconColor={activeTab === 'transactions' ? colors.primary : colors.onSurfaceVariant}
                  />
                  <PaperText
                    variant="labelLarge"
                    style={{ fontWeight: activeTab === 'transactions' ? 'bold' : 'normal', color: activeTab === 'transactions' ? colors.primary : colors.onSurfaceVariant, marginLeft: 4 }}
                  >
                    Transactions
                  </PaperText>
                </TouchableOpacity>
              </View>

              {activeTab === 'tokens' ? (
                <View style={{ flex: 1 }}>
                  {tokens.length === 0 || (tokens.length === 1 && tokens[0].amount === "Error") ? (
                    <View style={styles.emptyStateContainer}>
                        <PaperIconButton icon="cancel" size={48} iconColor={colors.onSurfaceDisabled} />
                        <PaperText variant="titleMedium" style={{marginTop:16, color: colors.onSurfaceDisabled}}>No Tokens Found</PaperText>
                        <PaperText variant="bodyMedium" style={{marginTop:8, color: colors.onSurfaceDisabled, textAlign:'center'}}>Could not load token balances or your wallet is empty.</PaperText>
                    </View>
                  ) : (
                    <ScrollView style={styles.tokenListContainer}>
                    {tokens.map(token => (
                        <Card key={token.id} style={[styles.tokenCard, {backgroundColor: colors.surfaceVariant}]} elevation={1}>
                        <Card.Content style={styles.tokenCardContent}>
                            <Image
                            source={require('@/assets/Avax_Token.png')}
                            style={styles.tokenIcon}
                            resizeMode="contain"
                            />
                            <View style={styles.tokenInfo}>
                            <PaperText variant="titleMedium" style={{color: colors.onSurface}}>{token.symbol}</PaperText>
                            <PaperText variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>{token.name}</PaperText>
                            </View>
                            <View style={styles.tokenAmount}>
                            <PaperText variant="titleMedium" style={{color: colors.onSurface}}>{token.amount}</PaperText>
                            <PaperText variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>{token.value}</PaperText>
                            </View>
                        </Card.Content>
                        </Card>
                    ))}
                    </ScrollView>
                  )}
                  <ActionButtons
                    onSend={() => handleAction('send')}
                    onReceive={() => handleAction('receive')}
                    onDeposit={() => handleAction('deposit')}
                    onSwap={() => handleAction('swap')}
                  />
                </View>
              ) : (
                <View style={{ flex: 1 }}>
                   { (true) ? (
                    <ScrollView style={styles.transactionListContainer}>
                    {[
                        { id: "1", type: "Received", amount: "+1.50 AVAX", value: "$55.70", date: "Today, 10:45 AM", from: "0x123...abc" },
                        { id: "2", type: "Sent", amount: "-0.75 AVAX", value: "$27.85", date: "Yesterday, 03:20 PM", to: "0x456...def" },
                        { id: "3", type: "Swapped", amount: "-10 USDC for +0.2 AVAX", value: "~$35.00", date: "Jan 15, 2024", details: "USDC/AVAX" }
                    ].map((tx) => {
                        const isReceived = tx.type === "Received";
                        let amountColor = colors.onSurface;
                        let iconName = "history";
                        if (tx.type === "Received") {
                            amountColor = 'green';
                            iconName = "arrow-down-bold-circle-outline";
                        } else if (tx.type === "Sent") {
                            amountColor = colors.error;
                            iconName = "arrow-up-bold-circle-outline";
                        } else if (tx.type === "Swapped") {
                            amountColor = colors.primary;
                            iconName = "swap-horizontal-bold";
                        }
                        return (
                        <List.Item
                            key={tx.id}
                            title={tx.type}
                            description={`${tx.date}${tx.from ? ` from ${tx.from}` : tx.to ? ` to ${tx.to}` : tx.details ? ` (${tx.details})` : ''}`}
                            left={props => <List.Icon {...props} icon={iconName} color={amountColor} />}
                            right={props => <PaperText {...props} variant="bodyLarge" style={{ color: amountColor, alignSelf: 'center', marginRight: 8 }}>{tx.amount.split(' ')[0] + ' ' + tx.amount.split(' ')[1]}</PaperText>}
                            style={[styles.transactionListItem, { backgroundColor: colors.surfaceVariant }]}
                            titleStyle={{ fontWeight: 'bold', color: colors.onSurface}}
                            descriptionStyle={{ color: colors.onSurfaceVariant, fontSize: 12 }}
                            onPress={() => Alert.alert("Transaction Details", `ID: ${tx.id}\nValue: ${tx.value}`)}
                        />
                        );
                    })}
                    </ScrollView>
                  ) : (
                      <View style={styles.emptyStateContainer}>
                          <PaperIconButton icon="format-list-bulleted" size={48} iconColor={colors.onSurfaceDisabled} />
                          <PaperText variant="titleMedium" style={{marginTop:16, color: colors.onSurfaceDisabled}}>No Transactions Yet</PaperText>
                          <PaperText variant="bodyMedium" style={{marginTop:8, color: colors.onSurfaceDisabled, textAlign:'center'}}>Your transaction history will appear here.</PaperText>
                      </View>
                  )}
                </View>
              )}
            </Surface>
          </>
        )}
        
        <ChatInput
          onSendMessage={(message) => {
            router.push({
              pathname: '/(app)/chat',
              params: { initialMessage: message, from: 'wallet' }
            });
          }}
        />
      </View>
    </Portal.Host>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  customHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 60,
  },
  headerTitleContainer: {
    justifyContent: 'center',
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    lineHeight: 28,
  },
  headerSubtitle: {
    fontSize: 12,
    opacity: 0.8,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoContainer: {
    position: 'absolute',
    left: 0, right: 0, top: 0, 
    height: '40%',
    overflow: 'hidden',
    zIndex: 0,
  },
  balanceHeaderContent: {
    paddingHorizontal: 16,
    paddingTop: 5,
    paddingBottom: 15,
    alignItems: 'center',
    zIndex: 1,
  },
  totalBalanceText: { marginBottom: 2, opacity: 0.9, fontWeight: '500' },
  totalBalanceValue: { marginBottom: 12, fontWeight: '700', letterSpacing: 0.5 },
  addressAndControlsContainer: { width: '100%', alignItems: 'center', marginTop: 8 },
  addressTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16, 
    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
  },
  walletAddressText: { 
    flexShrink: 1, 
    fontSize: 13, 
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copiedChip: {
    marginLeft: 10,
    paddingHorizontal:6, 
    height: 26, 
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  contentSurface: {
    flex: 1, 
    paddingHorizontal: 16, 
    paddingTop: 20, 
    zIndex: 1,
    marginTop: 0,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 16, 
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  tab: {
    flex: 1, paddingVertical: 12, paddingHorizontal: 4, alignItems: 'center',
    borderBottomWidth: 3, borderBottomColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'center', marginHorizontal: 4,
  },
  tokenListContainer: { flex: 1 },
  emptyStateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  tokenCard: { borderRadius: 16, marginBottom: 12 },
  tokenCardContent: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  tokenIcon: { width: 42, height: 42, marginRight: 16 },
  tokenInfo: { flex: 1 },
  tokenAmount: { alignItems: 'flex-end' },
  transactionListContainer: { flex: 1 },
  transactionListItem: { marginBottom: 10, borderRadius: 16, paddingVertical: 4 },
  fullScreenView: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    alignSelf: 'center',
    marginTop: 30,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
});
