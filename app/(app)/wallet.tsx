import { ThemedText } from '@/components/ThemedText';
import ActionButtons from '@/components/ui/ActionButtons';
import ChatInput from '@/components/ui/ChatInput';
import { avalanche, avalancheFuji } from '@/constants/chains';
import { useTheme } from '@/hooks/ThemeContext';
import { ResizeMode, Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import 'react-native-get-random-values';
import 'react-native-reanimated';
import { createPublicClient, formatEther, http } from 'viem';
import { PrivateKeyAccount, privateKeyToAccount } from 'viem/accounts';
import { storage } from '../core/storage';

const PRIVATE_KEY_STORAGE_KEY = 'userPrivateKey';

// Simple placeholder component for action views
const ActionView = ({ title, onBack, children }: { title: string; onBack: () => void; children?: React.ReactNode }) => {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  return (
    <View style={[styles.fullScreenView, { backgroundColor: isDark ? '#0A0E17' : '#F5F7FA' }]}>
      <ThemedText type="title" style={{ marginBottom: 20 }} lightColor="#0A0E17" darkColor="white">{title}</ThemedText>
      {children}
      <TouchableOpacity
        style={[styles.backButton, { backgroundColor: isDark ? '#252D4A' : '#E8EAF6' }]}
        onPress={onBack}
      >
        <ThemedText type="defaultSemiBold" lightColor="#0A0E17" darkColor="white">Back</ThemedText>
      </TouchableOpacity>
    </View>
  );
};

export default function WalletScreen() {
  const [activeTab, setActiveTab] = useState<'tokens' | 'transactions'>('tokens');
  const [currentView, setCurrentView] = useState<'main' | 'send' | 'receive' | 'deposit' | 'swap'>('main');
  const { colorScheme } = useTheme();
  
  const [account, setAccount] = useState<PrivateKeyAccount | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [currentChain, setCurrentChain] = useState(avalancheFuji);
  const [avaxBalance, setAvaxBalance] = useState('0');
  const [tokens, setTokens] = useState([{
    id: "1",
    name: "Avalanche",
    symbol: "AVAX",
    amount: "0",
    value: "$0.00"
  }]);

  const isDark = colorScheme === 'dark';

  const switchNetwork = async () => {
    // Determine the target chain
    const newChain = currentChain.id === avalanche.id ? avalancheFuji : avalanche;
    
    console.log(`[Network] Switching configuration from ${currentChain.name} to ${newChain.name}`);

    try {
      // Simply update the currentChain state.
      // The useEffect hook watching [account, currentChain] will automatically
      // trigger fetchAvaxBalance with the new chain configuration.
      setCurrentChain(newChain);
      
      // Optional: Clear old balance state immediately for better UX
      setAvaxBalance('...'); // Show loading indicator
      setTokens([{
        id: "1",
        name: newChain.name,
        symbol: newChain.nativeCurrency.symbol,
        amount: '...',
        value: '$?.??'
      }]);

      // No need to manually call fetchAvaxBalance here, useEffect handles it.
      console.log(`[Network] Configuration switched to ${newChain.name}. Balance refresh triggered.`);

    } catch (error) {
      // This catch block might be less relevant now unless state updates fail
      console.error('[Network] Unexpected error during state update for switch:', error);
      Alert.alert('Error', 'An unexpected error occurred while switching networks');
    }
  };

  const fetchAvaxBalance = async () => {
    if (!account) {
      console.log('fetchAvaxBalance: Account not loaded yet.');
      return; // No account loaded yet
    }

    console.log(`Fetching balance for ${account.address} on ${currentChain.name}`);

    try {
      // 1. Create Viem Public Client for the current chain
      const client = createPublicClient({
        chain: currentChain, // Pass the whole chain object from constants
        transport: http(currentChain.rpcUrls.default.http[0]), // Use the default RPC URL
      });

      // 2. Fetch balance
      const balanceWei = await client.getBalance({ 
        address: account.address, 
      });
      
      // 3. Format balance (Viem returns BigInt in wei)
      const balanceFormatted = formatEther(balanceWei);
      // Truncate for display purposes if desired
      const balanceDisplay = parseFloat(balanceFormatted).toFixed(4); 

      console.log(`Balance fetched: ${balanceDisplay} AVAX`);

      // 4. Update state
      setAvaxBalance(balanceDisplay);
      setTokens([{
        id: "1", // Keep static ID for the native token
        name: currentChain.name, // Use current chain name
        symbol: currentChain.nativeCurrency.symbol, // Use symbol from chain config
        amount: balanceDisplay,
        // Keep approximate price calculation for now
        value: currentChain.id === avalanche.id
          ? "$" + (parseFloat(balanceDisplay) * 35).toFixed(2) // Approx Mainnet price
          : "$" + (parseFloat(balanceDisplay) * 0.01).toFixed(2) // Approx Testnet price
      }]);

    } catch (error) {
      console.error('Error fetching balance:', error);
      // Optionally set an error state or show an alert
      // Keep previous balance state on error for now
       setTokens([{
        id: "1",
        name: currentChain.name,
        symbol: currentChain.nativeCurrency.symbol,
        amount: "Error", // Indicate error in amount
        value: "$?.??"
      }]);
    }
  };

  useEffect(() => {
    if (account) {
      console.log('Account loaded, fetching balance for:', account.address, 'on chain:', currentChain.name);
      fetchAvaxBalance();
      const interval = setInterval(fetchAvaxBalance, 15000);
      return () => clearInterval(interval);
    } else {
        console.log('Account not loaded yet, balance fetch skipped.');
    }
  }, [account, currentChain]);

  useEffect(() => {
    const loadAccount = () => {
      setIsLoading(true);
      try {
        const privateKey = storage.getString(PRIVATE_KEY_STORAGE_KEY);
        if (privateKey) {
          const loadedAccount = privateKeyToAccount(privateKey as `0x${string}`); 
          console.log('Wallet loaded from MMKV for address:', loadedAccount.address);
          setAccount(loadedAccount);
          setWalletAddress(loadedAccount.address);
        } else {
          console.error('No private key found in MMKV. User might not be properly logged in or wallet not generated.');
        }
      } catch (error) {
        console.error('Failed to load wallet from MMKV:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAccount();
  }, []);

  const handleAction = (view: 'send' | 'receive' | 'deposit' | 'swap') => {
    // Use Expo Router navigation instead of internal view state
    router.push(`/(app)/${view}`);
  };

  const handleBack = () => {
    setCurrentView('main');
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#0A0E17' : '#F5F7FA', justifyContent: 'center', alignItems: 'center' }]}>
        <ThemedText type="title">Loading Wallet...</ThemedText>
      </View>
    );
  }
  
  if (!account) {
      return (
         <View style={[styles.container, { backgroundColor: isDark ? '#0A0E17' : '#F5F7FA', justifyContent: 'center', alignItems: 'center' }]}>
             <ThemedText type="title" style={{color: 'red', marginBottom: 10}}>Error Loading Wallet</ThemedText>
             <ThemedText>Could not load wallet details.</ThemedText>
             <ThemedText>Please try logging out and back in.</ThemedText>
         </View>
      )
  }

  if (currentView !== 'main') {
    switch (currentView) {
      case 'send':
        return (
          <ActionView title="Send Crypto" onBack={handleBack}>
            <ThemedText>Send UI Placeholder</ThemedText>
          </ActionView>
        );
      case 'receive':
      case 'deposit':
        return (
          <ActionView title={currentView === 'receive' ? "Receive Crypto" : "Deposit Crypto"} onBack={handleBack}>
            <ThemedText style={{ marginBottom: 10 }}>Your Wallet Address:</ThemedText>
            <ThemedText selectable type="defaultSemiBold" style={{ marginBottom: 20 }}>{walletAddress ?? 'Error loading address'}</ThemedText>
            <ThemedText>(QR Code Placeholder)</ThemedText>
          </ActionView>
        );
      case 'swap':
        return (
          <ActionView title="Swap Tokens" onBack={handleBack}>
            <ThemedText>Swap UI Placeholder</ThemedText>
          </ActionView>
        );
      default:
        setCurrentView('main');
        return null;
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0A0E17' : '#F5F7FA' }]}>
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

      {currentView === 'main' && (
        <>
          <View style={styles.header}>
            <ThemedText
              type="title"
              style={[styles.balanceText, {marginTop: 20}]}
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
            >
              <View style={{flexDirection: 'column', alignItems: 'center'}}>
                <ThemedText
                  type="title"
                  style={{
                    fontSize: 22,
                    fontWeight: '600',
                    textShadowColor: 'rgba(0, 0, 0, 0.3)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 4,
                  }}
                  lightColor="#FFFFFF"
                  darkColor="#FFFFFF"
                >
                  {'Welcome to Movya Wallet'}
                </ThemedText>
              </View>
            </ThemedText>

            <View style={{flexDirection: 'column', alignItems: 'center', marginTop: 16}}>
              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
                <Image
                  source={require('@/assets/logo/logo@SD.png')}
                  style={{width: 16, height: 16, marginRight: 8}}
                />
                <ThemedText
                  type="defaultSemiBold"
                  style={[styles.walletAddress, {
                    textShadowColor: 'rgba(0, 0, 0, 0.3)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 3,
                  }]}
                  lightColor="#FFFFFF"
                  darkColor="#FFFFFF"
                >
                  {walletAddress 
                    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                    : 'Loading address...'}
                </ThemedText>
              </View>
              <TouchableOpacity 
                onPress={switchNetwork} 
                style={[
                  styles.networkSwitch, 
                  {
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.2)'
                  }
                ]}
              >
                <ThemedText 
                  type="defaultSemiBold" 
                  style={{
                    fontSize: 12,
                    textShadowColor: 'rgba(0, 0, 0, 0.3)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 3,
                  }}
                  lightColor="#FFFFFF"
                  darkColor="#FFFFFF"
                >
                  {currentChain.name}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.content, { 
            backgroundColor: isDark ? '#1A1F38' : '#FFFFFF',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
            elevation: 5,
          }]}>
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'tokens' && styles.activeTab]}
                onPress={() => setActiveTab('tokens')}
              >
                <ThemedText
                  type="defaultSemiBold"
                  lightColor="#0A0E17"
                  darkColor="white"
                >
                  Tokens
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'transactions' && styles.activeTab]}
                onPress={() => setActiveTab('transactions')}
              >
                <ThemedText
                  type="defaultSemiBold"
                  lightColor="#0A0E17"
                  darkColor="white"
                >
                  Transactions
                </ThemedText>
              </TouchableOpacity>
            </View>

            {activeTab === 'tokens' ? (
              <ScrollView style={styles.tabContent}>
                {tokens.map(token => (
                  <View key={token.id} style={[styles.tokenCard, { backgroundColor: isDark ? '#252D4A' : '#E8EAF6' }]}>
                    <Image
                      source={require('@/assets/Avax_Token.png')}
                      style={styles.tokenIcon}
                      resizeMode="contain"
                    />
                    <View style={styles.tokenInfo}>
                      <ThemedText
                        type="defaultSemiBold"
                        lightColor="#0A0E17"
                        darkColor="white"
                      >
                        {token.symbol}
                      </ThemedText>
                      <ThemedText
                        type="default"
                        lightColor="#6C7A9C"
                        darkColor="#9BA1A6"
                      >
                        {token.name}
                      </ThemedText>
                    </View>
                    <View style={styles.tokenAmount}>
                      <ThemedText
                        type="defaultSemiBold"
                        lightColor="#0A0E17"
                        darkColor="white"
                      >
                        {token.amount}
                      </ThemedText>
                      <ThemedText
                        type="default"
                        lightColor="#6C7A9C"
                        darkColor="#9BA1A6"
                      >
                        {token.value}
                      </ThemedText>
                    </View>
                  </View>
                ))}

                <ActionButtons
                  onSend={() => handleAction('send')}
                  onReceive={() => handleAction('receive')}
                  onDeposit={() => handleAction('deposit')}
                  onSwap={() => handleAction('swap')}
                />
              </ScrollView>
            ) : (
              <ScrollView style={styles.tabContent}>
                {[
                  { id: "1", type: "Received", amount: "+1.50 AVAX", value: "$55.70", date: "Today" },
                  { id: "2", type: "Sent", amount: "-0.75 AVAX", value: "$27.85", date: "Yesterday" }
                ].map((tx: { id: string; type: string; amount: string; value: string; date: string }) => {
                  return (
                    <View key={tx.id} style={[styles.transactionItem, { backgroundColor: isDark ? '#252D4A' : '#E8EAF6' }]}>
                      <View style={styles.transactionDetails}>
                        <ThemedText type="defaultSemiBold" lightColor="#0A0E17" darkColor="white">
                          {tx.type}
                        </ThemedText>
                        <ThemedText type="default" lightColor="#6C7A9C" darkColor="#9BA1A6">
                          {tx.date}
                        </ThemedText>
                      </View>
                      <View style={styles.transactionAmount}>
                        <ThemedText type="defaultSemiBold" lightColor="#0A0E17" darkColor="white">
                          {tx.amount}
                        </ThemedText>
                        <ThemedText type="default" lightColor="#6C7A9C" darkColor="#9BA1A6">
                          {tx.value}
                        </ThemedText>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </>
      )}
      
      <ChatInput
        onSendMessage={(message) => {
          console.log('Navigating to chat with message:', message);
          // Navigate to chat screen with the message as a parameter
          router.push({ 
            pathname: '/(app)/chat' as any,
            params: { initialMessage: message }
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  initialsContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  container: {
    flex: 1,
  },
  videoContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: '60%', // Solo cubre la parte superior
    overflow: 'hidden',
  },
  videoBackground: {
    width: '100%',
    height: '100%',
  },
  header: {
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
  },
  logo: {
    width: 50,
    height: 50,
    marginBottom: 16,
  },
  balanceText: {
    fontSize: 32,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  walletAddress: {
    fontSize: 14,
  },
  content: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    marginTop: -20,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#3A5AFF',
  },
  tabContent: {
    flex: 1,
  },
  tokenCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  tokenIcon: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  tokenInfo: {
    flex: 1,
  },
  tokenAmount: {
    alignItems: 'flex-end',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    marginBottom: 10,
  },
  actionButton: {
  },
  transactionItem: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  fullScreenView: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  networkSwitch: {
    marginTop: 8,
    marginLeft: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
}); 