import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import TransactionHistoryService, { Transaction } from '../../core/services/transactionHistoryService';

const TransactionHistoryScreen = () => {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    received: 0,
    totalSentUsd: 0,
    totalReceivedUsd: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'sent' | 'received'>('all');

  const historyService = TransactionHistoryService.getInstance();

  // Load transaction data
  const loadTransactions = useCallback(async () => {
    const allTransactions = await historyService.fetchTransactionHistory(100);
    setTransactions(allTransactions);
    // Calculate stats from transactions
    const sent = allTransactions.filter(tx => tx.type === 'sent').length;
    const received = allTransactions.filter(tx => tx.type === 'received').length;
    setStats({ total: allTransactions.length, sent, received, totalSentUsd: 0, totalReceivedUsd: 0 });
  }, [historyService]);

  // Filter transactions based on selected filter
  const filteredTransactions = transactions.filter(tx => {
    if (selectedFilter === 'all') return true;
    return tx.type === selectedFilter;
  });

  // Refresh data
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    loadTransactions();
    setRefreshing(false);
  }, [loadTransactions]);

  // Load data on mount
  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Format transaction amount
  const formatAmount = (transaction: Transaction) => {
    const symbol = transaction.type === 'sent' ? '-' : '+';
    return `${symbol}${transaction.amount} ${transaction.currency}`;
  };

  // Get transaction icon
  const getTransactionIcon = (transaction: Transaction) => {
    if (transaction.type === 'sent') {
      return 'arrow-upward';
    } else if (transaction.type === 'received') {
      return 'arrow-downward';
    } else {
      return 'schedule';
    }
  };

  // Get transaction color
  const getTransactionColor = (transaction: Transaction) => {
    if (transaction.type === 'sent') {
      return '#EF4444'; // Red
    } else if (transaction.type === 'received') {
      return '#10B981'; // Green
    } else {
      return '#F59E0B'; // Orange for pending
    }
  };

  // Handle transaction press (open in explorer)
  const handleTransactionPress = (transaction: Transaction) => {
    if (transaction.txid && transaction.explorerUrl) {
      Alert.alert(
        'Open Transaction',
        `View transaction ${transaction.txid.slice(0, 8)}... on Stacks Explorer?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open', onPress: () => Linking.openURL(transaction.explorerUrl!) },
        ]
      );
    } else {
      Alert.alert('Info', 'This transaction doesn\'t have an explorer link available.');
    }
  };

  // Clear history (for testing) - Note: History is fetched from blockchain, not stored locally
  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'Transaction history is fetched from the blockchain and cannot be cleared.',
      [{ text: 'OK' }]
    );
  };

  // Render filter button
  const renderFilterButton = (filter: 'all' | 'sent' | 'received', label: string) => (
    <TouchableOpacity
      style={[styles.filterButton, selectedFilter === filter && styles.filterButtonActive]}
      onPress={() => setSelectedFilter(filter)}
    >
      <Text style={[styles.filterButtonText, selectedFilter === filter && styles.filterButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  // Render transaction item
  const renderTransaction = ({ item }: { item: Transaction }) => (
    <TouchableOpacity
      style={styles.transactionItem}
      onPress={() => handleTransactionPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.transactionLeft}>
        <View style={[styles.transactionIcon, { backgroundColor: getTransactionColor(item) }]}>
          <MaterialIcons
            name={getTransactionIcon(item)}
            size={20}
            color="#fff"
          />
        </View>
        <View style={styles.transactionDetails}>
          <Text style={styles.transactionTitle}>
            {item.type === 'sent'
              ? `To ${item.recipient?.slice(0, 8) + '...' || 'Unknown'}`
              : `From ${item.sender?.slice(0, 8) + '...' || 'Unknown'}`
            }
          </Text>
          <Text style={styles.transactionDate}>
            {new Date(item.timestamp).toLocaleDateString()} at {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {item.txid && (
            <Text style={styles.transactionHash}>
              {item.txid.slice(0, 10)}...{item.txid.slice(-6)}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.transactionRight}>
        <Text style={[styles.transactionAmount, { color: getTransactionColor(item) }]}>
          {formatAmount(item)}
        </Text>
        <View style={styles.transactionStatus}>
          <MaterialIcons
            name={item.status === 'success' ? 'check-circle' : 'schedule'}
            size={12}
            color={item.status === 'success' ? '#10B981' : '#F59E0B'}
          />
          <Text style={[styles.statusText, { color: item.status === 'success' ? '#10B981' : '#F59E0B' }]}>
            {item.status === 'success' ? 'Confirmed' : 'Pending'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction History</Text>
        <TouchableOpacity onPress={handleClearHistory} style={styles.clearButton}>
          <MaterialIcons name="delete-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <LinearGradient colors={['#4C63D2', '#5A7FDB']} style={styles.statsCard}>
          <Text style={styles.statsLabel}>Total Transactions</Text>
          <Text style={styles.statsValue}>{stats.total}</Text>
        </LinearGradient>
        <LinearGradient colors={['#EF4444', '#F87171']} style={styles.statsCard}>
          <Text style={styles.statsLabel}>Sent</Text>
          <Text style={styles.statsValue}>{stats.sent}</Text>
        </LinearGradient>
        <LinearGradient colors={['#10B981', '#34D399']} style={styles.statsCard}>
          <Text style={styles.statsLabel}>Received</Text>
          <Text style={styles.statsValue}>{stats.received}</Text>
        </LinearGradient>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {renderFilterButton('all', 'All')}
        {renderFilterButton('sent', 'Sent')}
        {renderFilterButton('received', 'Received')}
      </View>

      {/* Transaction List */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.txid}
        renderItem={renderTransaction}
        style={styles.transactionsList}
        contentContainerStyle={styles.transactionsListContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="history" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Transactions</Text>
            <Text style={styles.emptySubtitle}>
              Your transaction history will appear here once you start sending or receiving crypto.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  clearButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  statsCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statsLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.9,
  },
  statsValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#4C63D2',
    borderColor: '#4C63D2',
  },
  filterButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  transactionsList: {
    flex: 1,
  },
  transactionsListContent: {
    paddingHorizontal: 16,
  },
  transactionItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  transactionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  transactionHash: {
    fontSize: 10,
    color: '#9ca3af',
    fontFamily: 'monospace',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  transactionUsd: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  transactionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 32,
  },
});

export default TransactionHistoryScreen; 