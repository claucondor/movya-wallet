import { ThemedText } from '@/components/ThemedText';
import ActionButtons from '@/components/ui/ActionButtons';
import ChatInput from '@/components/ui/ChatInput';
import { avalanche, avalancheFuji } from '@/constants/chains';
import { useTheme } from '@/hooks/ThemeContext';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import 'react-native-get-random-values';
import 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getWalletAddress, loadWallet } from '../../internal/walletService'; // Adjust path if needed

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
  
  // TODO: Replace Privy user state with your app's user state
  // This state should be populated after successful login via deep link
  const [user, setUser] = useState<any>(null); // Placeholder for user state
  const [wallet, setWallet] = useState<any>(null); // Placeholder for wallet state
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

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
    try {
      // TODO: Get provider from your new wallet state
      const provider = wallet?.getProvider ? await wallet.getProvider() : null;
      if (!provider) {
        console.error('[Network] No provider available');
        Alert.alert('Error', 'No wallet provider available');
        return;
      }

      const newChain = currentChain.id === avalanche.id ? avalancheFuji : avalanche;
      console.log('[Network] Attempting to switch to:', newChain.name, `(0x${newChain.id.toString(16)})`);

      // Get current chain from provider before switch
      const currentChainId = provider ? await provider.request({ method: 'eth_chainId' }) : null;
      console.log('[Network] Provider current chain:', currentChainId);

      // Skip if already on target chain
      if (currentChainId === `0x${newChain.id.toString(16)}`) {
        console.log('[Network] Already on target chain');
        return;
      }

      try {
        // Attempt switch with timeout
        await Promise.race([
          provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${newChain.id.toString(16)}` }],
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Network switch timeout')), 5000)
          )
        ]);

        // Verify change with retries
        let updatedChainId;
        for (let i = 0; i < 3; i++) {
          updatedChainId = await provider.request({ method: 'eth_chainId' });
          if (updatedChainId === `0x${newChain.id.toString(16)}`) break;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('[Network] Provider new chain:', updatedChainId);
        
        if (updatedChainId === `0x${newChain.id.toString(16)}`) {
          setCurrentChain(newChain);
          await fetchAvaxBalance();
          console.log('[Network] Successfully switched to:', newChain.name);
        } else {
          console.warn('[Network] ChainId mismatch after switch. Expected:',
            `0x${newChain.id.toString(16)}`, 'Got:', updatedChainId);
          Alert.alert('Network Error', 'Failed to verify network change. Please check your wallet.');
        }
      } catch (error: any) {
        console.error('[Network] Switch error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to switch network. Please try again.';
        Alert.alert('Network Error', errorMessage);
      }
    } catch (error) {
      console.error('[Network] Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const fetchAvaxBalance = async () => {
    try {
      // TODO: Get provider from your new wallet state
      const provider = wallet?.getProvider ? await wallet.getProvider() : null;
      if (!provider) {
        console.log('No provider available');
        return;
      }
      
      // TODO: Ensure provider is valid
      const accounts = provider ? await provider.request({ method: 'eth_accounts' }) : []; // Keep this as empty array if provider is null
      if (!accounts.length) {
        console.log('No accounts available');
        return;
      }
      
      // TODO: Ensure provider is valid
      // Complete the ternary operator for balance
      const balance = provider ? await provider.request({
        method: 'eth_getBalance',
        params: [accounts[0], 'latest'],
      }) : null; // Add `: null` for the else case

      // Check if balance is null before parsing
      if (balance === null) {
        console.error('Failed to fetch balance because provider was null or request failed');
        return; // Exit if balance couldn't be fetched
      }

      // Now safe to parse balance
      const balanceNum = (parseInt(balance) / 10**18).toFixed(4);
      
      setAvaxBalance(balanceNum);
      setTokens([{
        id: "1",
        name: currentChain.name,
        symbol: "AVAX",
        amount: balanceNum,
        value: currentChain.id === avalanche.id
          ? "$" + (parseFloat(balanceNum) * 35).toFixed(2) // Precio realista para Mainnet
          : "$" + (parseFloat(balanceNum) * 0.01).toFixed(2) // Precio bajo para Testnet (Fuji)
      }]);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  useEffect(() => {
    // TODO: Update this effect to trigger when your actual wallet state is available
    if (wallet) {
      fetchAvaxBalance();
      const interval = setInterval(fetchAvaxBalance, 15000);
      return () => clearInterval(interval);
    }
  }, [wallet, currentChain]);

  useEffect(() => {
    const fetchAddress = async () => {
      const address = await getWalletAddress();
      setWalletAddress(address);
      // You might want to load the full wallet object into state here too
      const loadedWallet = await loadWallet();
      setWallet(loadedWallet); 
    };
    fetchAddress();
  }, []);

  const handleAction = (view: 'send' | 'receive' | 'deposit' | 'swap') => {
    setCurrentView(view);
  };

  const handleBack = () => {
    setCurrentView('main');
  };

  if (!user && !walletAddress) { // Adjust loading/auth check as needed
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#0A0E17' : '#F5F7FA' }]}>
        <ThemedText type="title">Loading Wallet...</ThemedText>
        {/* Or show login prompt if definitively not logged in */}
      </View>
    );
  }

  // --- Render logic based on currentView --- 
  if (currentView !== 'main') {
    switch (currentView) {
      case 'send':
        return (
          <ActionView title="Send Crypto" onBack={handleBack}>
            <ThemedText>Send UI Placeholder</ThemedText>
            {/* TODO: Input fields for recipient, amount, gas estimation */}
            {/* TODO: Button to call signing function using loaded wallet */}
          </ActionView>
        );
      case 'receive':
      case 'deposit': // Treat Receive and Deposit similarly for now
        return (
          <ActionView title={currentView === 'receive' ? "Receive Crypto" : "Deposit Crypto"} onBack={handleBack}>
            <ThemedText style={{ marginBottom: 10 }}>Your Wallet Address:</ThemedText>
            <ThemedText selectable type="defaultSemiBold" style={{ marginBottom: 20 }}>{walletAddress ?? 'Loading...'}</ThemedText>
            {/* TODO: Add QR Code generation using walletAddress */}
            <ThemedText>(QR Code Placeholder)</ThemedText>
          </ActionView>
        );
      case 'swap':
        return (
          <ActionView title="Swap Tokens" onBack={handleBack}>
            <ThemedText>Swap UI Placeholder</ThemedText>
            {/* TODO: Token selection inputs, amount, quote fetching */}
            {/* TODO: Button to call swap/signing function */}
          </ActionView>
        );
      default:
        setCurrentView('main'); // Fallback to main
        return null;
    }
  }

  // --- Render Main View --- 
  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0A0E17' : '#F5F7FA' }]}>
      {/* Video Background - Temporalmente comentado para diagnosticar */}
      <View style={styles.videoContainer}>
        {/* 
        <Video
          source={require('@/assets/bg/header-bg.webm')}
          style={styles.videoBackground}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
        />
        */}
        <View style={[styles.videoBackground, { backgroundColor: isDark ? '#152238' : '#A1CEDC' }]} />
      </View>

      {currentView === 'main' && (
        <>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText
              type="title"
              style={[styles.balanceText, {marginTop: 20}]}
              lightColor="#0A0E17"
              darkColor="white"
            >
              <View style={{flexDirection: 'column', alignItems: 'center'}}>
                <ThemedText
                  type="title"
                  style={{fontSize: 22, fontWeight: '600'}}
                  lightColor="#0A0E17"
                  darkColor="white"
                >
                  {user?.linked_accounts?.[0]?.name ? `Welcome back, ${user.linked_accounts[0].name}` : 'Welcome to Movya Wallet'}
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
                  style={styles.walletAddress}
                  lightColor="#6C7A9C"
                  darkColor="#9BA1A6"
                >
                  {walletAddress 
                    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                    : 'Loading address...'}
                </ThemedText>
              </View>
              <ThemedText
                type="defaultSemiBold"
                style={{color: '#3A5AFF', marginTop: 8}}
              >
                Testnet
              </ThemedText>
            </View>
          </View>

          {/* Main Content */}
          <View style={[styles.content, { backgroundColor: isDark ? '#1A1F38' : '#FFFFFF' }]}>
            {/* Tabs */}
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

            {/* Tab Content */}
            {activeTab === 'tokens' ? (
              <ScrollView style={styles.tabContent}>
                {/* Token List */}
                {tokens.map(token => (
                  <View key={token.id} style={[styles.tokenCard, { backgroundColor: isDark ? '#252D4A' : '#E8EAF6' }]}>
                    <Icon
                      name="ethereum"
                      size={40}
                      color={isDark ? 'white' : '#0A0E17'}
                      style={styles.tokenIcon}
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

                {/* Action Buttons */}
                <ActionButtons
                  onSend={() => handleAction('send')}
                  onReceive={() => handleAction('receive')}
                  onDeposit={() => handleAction('deposit')}
                  onSwap={() => handleAction('swap')}
                />
              </ScrollView>
            ) : (
              <ScrollView style={styles.tabContent}>
                {/* Transaction List - Add explicit type for tx */}
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
      
      {/* Chat input */}
      <ChatInput
        onSendMessage={(message) => console.log('Message sent:', message)}
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
    bottom: 0,
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
    color: 'white',
    marginBottom: 8,
  },
  walletAddress: {
    fontSize: 14,
    color: '#6C7A9C',
  },
  content: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
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
    justifyContent: 'space-between',
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 8,
    alignItems: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    marginTop: 20,
    padding: 12,
    borderRadius: 8,
  },
  networkSwitch: {
    marginLeft: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
}); 