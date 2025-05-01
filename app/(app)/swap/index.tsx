import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
// Import constants and types
import { SWAP_TOKENS, TokenInfo } from '@/app/core/constants/tokens';
import { Ionicons } from '@expo/vector-icons';

// TODO: Implement a proper Token Selector component (e.g., Modal or Dropdown)

export default function SwapScreen() {
  const [fromToken, setFromToken] = useState<TokenInfo>(SWAP_TOKENS[0]); // Default to first token
  const [toToken, setToToken] = useState<TokenInfo | null>(null);
  const [fromAmount, setFromAmount] = useState<string>('');
  const [toAmount, setToAmount] = useState<string>(''); // Placeholder for estimated amount

  const handleSwap = () => {
    if (!fromToken || !toToken || !fromAmount) {
      Alert.alert('Error', 'Please select tokens and enter an amount.');
      return;
    }
    // TODO: Implement swap logic
    // 1. Get private key from SecureStore
    // 2. Get quote from a DEX aggregator/router (e.g., 1inch, Uniswap Universal Router)
    // 3. Build and sign transaction using viem
    // 4. Send transaction
    // 5. Show feedback (pending, success, error)
    Alert.alert('Placeholder', `Swap ${fromAmount} ${fromToken.symbol} for ${toToken.symbol} - Not implemented yet.`);
    console.log({ fromToken, toToken, fromAmount });
  };

  // Basic placeholder for token selection
  const selectToken = (type: 'from' | 'to') => {
    // In a real app, this would open a modal to select a token from SWAP_TOKENS
    const currentFromIndex = SWAP_TOKENS.findIndex(t => t.symbol === fromToken.symbol);
    const currentToIndex = toToken ? SWAP_TOKENS.findIndex(t => t.symbol === toToken.symbol) : -1;

    let nextIndex;
    if (type === 'from') {
      nextIndex = (currentFromIndex + 1) % SWAP_TOKENS.length;
      // Skip the 'to' token if it's the next one
      if (nextIndex === currentToIndex) {
        nextIndex = (nextIndex + 1) % SWAP_TOKENS.length;
      }
    } else { // type === 'to'
      nextIndex = (currentToIndex + 1) % SWAP_TOKENS.length;
       // If 'to' was null, start from index 1 (or 0 if only 1 token exists)
      if(currentToIndex === -1) nextIndex = SWAP_TOKENS.length > 1 ? 1 : 0; 
      // Skip the 'from' token if it's the next one
      if (nextIndex === currentFromIndex) {
        nextIndex = (nextIndex + 1) % SWAP_TOKENS.length;
      }
    }
    
    const selected = SWAP_TOKENS[nextIndex];

    if (type === 'from') {
        setFromToken(selected);
    } else { // type === 'to'
        setToToken(selected);
    }
    
    // TODO: Recalculate estimated toAmount when tokens/fromAmount change
    setToAmount(''); // Clear estimate
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Swap Tokens</Text>

      {/* From Token Input */}
      <View style={styles.inputGroup}>
        <TextInput
          style={styles.input}
          placeholder="0.0"
          value={fromAmount}
          onChangeText={setFromAmount}
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.tokenSelector} onPress={() => selectToken('from')}>
          {/* TODO: Add token logo */}
          <Text style={styles.tokenSymbol}>{fromToken.symbol}</Text>
          <Ionicons name="chevron-down" size={16} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Swap Direction Button */}
      <TouchableOpacity style={styles.swapIconContainer} onPress={() => {
        if(toToken) {
          const tempToken = fromToken;
          setFromToken(toToken);
          setToToken(tempToken);
          // Also swap amounts if needed, or clear them
          const tempAmount = fromAmount;
          setFromAmount(toAmount);
          setToAmount(tempAmount); // Keep amounts aligned with tokens
        }
      }}>
        <Ionicons name="swap-vertical" size={24} color="#007AFF" />
      </TouchableOpacity>

      {/* To Token Input */}
      <View style={styles.inputGroup}>
        <TextInput
          style={[styles.input, styles.inputDisabled]} // Make 'To' amount read-only for now
          placeholder="0.0"
          value={toAmount} // Display estimated amount
          editable={false} // Or recalculate based on fromAmount and rate
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.tokenSelector} onPress={() => selectToken('to')}>
          {toToken ? (
            <>
              {/* TODO: Add token logo */}
              <Text style={styles.tokenSymbol}>{toToken.symbol}</Text>
            </>
          ) : (
            <Text style={styles.tokenPlaceholder}>Select Token</Text>
          )}
          <Ionicons name="chevron-down" size={16} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* TODO: Display Swap Rate, Slippage Tolerance, Fees etc. */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>Estimated Rate: N/A</Text>
        <Text style={styles.infoText}>Slippage Tolerance: 0.5%</Text>
      </View>

      <Button title="Swap" onPress={handleSwap} disabled={!toToken || !fromAmount} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333',
  },
  inputGroup: {
    flexDirection: 'row',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  input: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 18,
  },
  inputDisabled: {
    backgroundColor: '#eee',
    color: '#777',
  },
  tokenSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    borderLeftWidth: 1,
    borderLeftColor: '#ccc',
  },
  tokenSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 5,
  },
  tokenPlaceholder: {
    fontSize: 16,
    color: '#999',
    marginRight: 5,
  },
  swapIconContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  infoContainer: {
    marginVertical: 20,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
}); 