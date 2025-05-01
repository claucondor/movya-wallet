import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
// Consider adding icons, e.g., from @expo/vector-icons
// import { FontAwesome } from '@expo/vector-icons';

export default function DepositScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Deposit Funds</Text>
      {/* <FontAwesome name="bank" size={24} color="black" /> */}
      {/* TODO: Implement Deposit UI/options */}
      {/* Could show QR code like Receive, or list exchanges */}
      <Text style={styles.placeholder}>Deposit functionality coming soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  placeholder: {
    fontSize: 16,
    color: 'gray',
    marginTop: 15,
  },
}); 