import { ThemedText } from '@/components/ThemedText';
import ActionButtons from '@/components/ui/ActionButtons';
import ChatInput from '@/components/ui/ChatInput';
import { useTheme } from '@/hooks/ThemeContext';
import { ResizeMode, Video } from 'expo-av';
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

// Mock data
const tokens = [{
  id: "1",
  name: "APTOS",
  symbol: "APT",
  amount: "12.34",
  value: "$123.45"
}];

const transactions = [
  { id: "1", type: "Received", amount: "+5.00 APT", value: "$31.70", date: "Today" },
  { id: "2", type: "Sent", amount: "-2.50 APT", value: "$15.85", date: "Yesterday" }
];

export default function WalletScreen() {
  const [activeTab, setActiveTab] = useState<'tokens' | 'transactions'>('tokens');
  const [currentView, setCurrentView] = useState<'main' | 'send' | 'receive' | 'deposit' | 'swap'>('main');
  const { colorScheme } = useTheme();
  const [user, setUser] = useState<{name?: string, photo?: string}>({});
  
  const isDark = colorScheme === 'dark';

  const handleAction = (view: 'send' | 'receive' | 'deposit' | 'swap') => {
    setCurrentView(view);
  };

  const handleBack = () => {
    setCurrentView('main');
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0A0E17' : '#F5F7FA' }]}>
      {/* Video Background */}
      <View style={styles.videoContainer}>
        <Video
          source={require('@/assets/bg/header-bg.webm')}
          style={styles.videoBackground}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
        />
      </View>

      {currentView === 'main' ? (
        <>
          {/* Header */}
          <View style={styles.header}>
            {user.photo ? (
              <Image
                source={{uri: user.photo}}
                style={styles.logo}
              />
            ) : user.name ? (
              <View style={[styles.initialsContainer, {backgroundColor: isDark ? '#252D4A' : '#E8EAF6'}]}>
                <ThemedText
                  type="title"
                  lightColor="#0A0E17"
                  darkColor="white"
                >
                  {user.name.split(' ').map(n => n[0]).join('')}
                </ThemedText>
              </View>
            ) : (
              <Image
                source={require('@/assets/logo/logo@SD.png')}
                style={styles.logo}
              />
            )}
            <ThemedText
              type="title"
              style={styles.balanceText}
              lightColor="#0A0E17"
              darkColor="white"
            >
              $123.45
            </ThemedText>
            <ThemedText
              type="default"
              style={styles.walletAddress}
              lightColor="#6C7A9C"
              darkColor="#9BA1A6"
            >
              0x1a2...3b4c
            </ThemedText>
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
                    <Image
                      source={require('@/assets/react-logo.png')}
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
                {/* Transaction List */}
                {transactions.map(tx => (
                  <View key={tx.id} style={[styles.transactionItem, { backgroundColor: isDark ? '#252D4A' : '#E8EAF6' }]}>
                    <View style={styles.transactionDetails}>
                      <ThemedText
                        type="defaultSemiBold"
                        lightColor="#0A0E17"
                        darkColor="white"
                      >
                        {tx.type}
                      </ThemedText>
                      <ThemedText
                        type="default"
                        lightColor="#6C7A9C"
                        darkColor="#9BA1A6"
                      >
                        {tx.date}
                      </ThemedText>
                    </View>
                    <View style={styles.transactionAmount}>
                      <ThemedText
                        type="defaultSemiBold"
                        lightColor="#0A0E17"
                        darkColor="white"
                      >
                        {tx.amount}
                      </ThemedText>
                      <ThemedText
                        type="default"
                        lightColor="#6C7A9C"
                        darkColor="#9BA1A6"
                      >
                        {tx.value}
                      </ThemedText>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </>
      ) : (
        /* Send/Receive/Deposit/Swap Screens */
        <View style={styles.fullScreenView}>
          <ThemedText
            type="title"
            lightColor="#0A0E17"
            darkColor="white"
          >
            {currentView === 'send' ? 'Send Screen' :
             currentView === 'receive' ? 'Receive Screen' :
             currentView === 'deposit' ? 'Deposit Screen' : 'Swap Screen'}
          </ThemedText>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: isDark ? '#252D4A' : '#E8EAF6' }]}
            onPress={handleBack}
          >
            <ThemedText
              type="defaultSemiBold"
              lightColor="#0A0E17"
              darkColor="white"
            >
              Back
            </ThemedText>
          </TouchableOpacity>
        </View>
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
});