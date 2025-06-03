import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  StyleSheet,
  Dimensions,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Types for the interactive elements
export interface ChatAction {
  type: 'button' | 'link' | 'transaction_link';
  label: string;
  value: string;
  style?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  url?: string;
}

export interface RichContent {
  type: 'transaction_details' | 'balance_info' | 'contact_info';
  data: {
    transactionHash?: string;
    amount?: string;
    currency?: string;
    usdValue?: string;
    recipient?: string;
    recipientNickname?: string;
    explorerUrl?: string;
    balance?: string;
    tokens?: Array<{ symbol: string; balance: string; usdValue: string }>;
  };
}

interface InteractiveChatBubbleProps {
  quickActions?: ChatAction[];
  richContent?: RichContent;
  onActionPress: (value: string) => void;
}

// Quick Action Buttons Component
const QuickActionButtons: React.FC<{ actions: ChatAction[]; onPress: (value: string) => void }> = ({ actions, onPress }) => {
  const getButtonStyle = (style?: string) => {
    switch (style) {
      case 'primary':
        return styles.primaryButton;
      case 'success':
        return styles.successButton;
      case 'danger':
        return styles.dangerButton;
      case 'warning':
        return styles.warningButton;
      default:
        return styles.secondaryButton;
    }
  };

  const getTextStyle = (style?: string) => {
    switch (style) {
      case 'primary':
      case 'success':
      case 'danger':
        return styles.primaryButtonText;
      default:
        return styles.secondaryButtonText;
    }
  };

  return (
    <View style={styles.quickActionsContainer}>
      {actions.map((action, index) => (
        <TouchableOpacity
          key={index}
          style={[styles.actionButton, getButtonStyle(action.style)]}
          onPress={() => {
            if (action.type === 'transaction_link' && action.url) {
              Linking.openURL(action.url);
            } else {
              onPress(action.value);
            }
          }}
          activeOpacity={0.7}
        >
          {action.type === 'transaction_link' && (
            <MaterialIcons name="open-in-new" size={16} color="#fff" style={styles.buttonIcon} />
          )}
          <Text style={[styles.actionButtonText, getTextStyle(action.style)]}>
            {action.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// Transaction Details Component
const TransactionDetails: React.FC<{ data: RichContent['data'] }> = ({ data }) => {
  return (
    <View style={styles.richContentContainer}>
      <LinearGradient
        colors={['#4C63D2', '#5A7FDB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.transactionCard}
      >
        <View style={styles.transactionHeader}>
          <MaterialIcons name="check-circle" size={24} color="#4ADE80" />
          <Text style={styles.transactionTitle}>Transaction Successful</Text>
        </View>
        
        <View style={styles.transactionDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount:</Text>
            <Text style={styles.detailValue}>
              {data.amount} {data.currency}
              {data.usdValue && <Text style={styles.usdValue}> (≈ {data.usdValue})</Text>}
            </Text>
          </View>
          
          {data.recipientNickname && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>To:</Text>
              <Text style={styles.detailValue}>{data.recipientNickname}</Text>
            </View>
          )}
          
          {data.transactionHash && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Transaction:</Text>
              <TouchableOpacity
                onPress={() => data.explorerUrl && Linking.openURL(data.explorerUrl)}
                style={styles.hashContainer}
              >
                <Text style={styles.hashText}>
                  {`${data.transactionHash.slice(0, 6)}...${data.transactionHash.slice(-4)}`}
                </Text>
                <MaterialIcons name="open-in-new" size={14} color="#A5B4FC" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

// Balance Info Component
const BalanceInfo: React.FC<{ data: RichContent['data'] }> = ({ data }) => {
  return (
    <View style={styles.richContentContainer}>
      <LinearGradient
        colors={['#059669', '#10B981']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.balanceCard}
      >
        <View style={styles.balanceHeader}>
          <MaterialIcons name="account-balance-wallet" size={24} color="#fff" />
          <Text style={styles.balanceTitle}>Your Balance</Text>
        </View>
        
        <View style={styles.tokensContainer}>
          {data.tokens?.map((token, index) => (
            <View key={index} style={styles.tokenRow}>
              <View style={styles.tokenInfo}>
                <Text style={styles.tokenSymbol}>{token.symbol}</Text>
                <Text style={styles.tokenBalance}>{token.balance}</Text>
              </View>
              <Text style={styles.tokenUsdValue}>{token.usdValue}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>
    </View>
  );
};

// Main Interactive Chat Bubble Component
export const InteractiveChatBubble: React.FC<InteractiveChatBubbleProps> = ({
  quickActions,
  richContent,
  onActionPress,
}) => {
  return (
    <View style={styles.interactiveBubbleContainer}>
      {/* Rich Content */}
      {richContent && (
        <>
          {richContent.type === 'transaction_details' && (
            <TransactionDetails data={richContent.data} />
          )}
          {richContent.type === 'balance_info' && (
            <BalanceInfo data={richContent.data} />
          )}
        </>
      )}
      
      {/* Quick Actions */}
      {quickActions && quickActions.length > 0 && (
        <QuickActionButtons actions={quickActions} onPress={onActionPress} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  interactiveBubbleContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  
  // Quick Actions Styles
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    minHeight: 36,
  },
  primaryButton: {
    backgroundColor: '#4C63D2',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  successButton: {
    backgroundColor: '#10B981',
  },
  dangerButton: {
    backgroundColor: '#EF4444',
  },
  warningButton: {
    backgroundColor: '#F59E0B',
  },
  buttonIcon: {
    marginRight: 4,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  primaryButtonText: {
    color: '#fff',
  },
  secondaryButtonText: {
    color: '#374151',
  },
  
  // Rich Content Styles
  richContentContainer: {
    marginVertical: 8,
  },
  
  // Transaction Styles
  transactionCard: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 4,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  transactionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  transactionDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    color: '#A5B4FC',
    fontSize: 14,
  },
  detailValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  usdValue: {
    color: '#A5B4FC',
    fontSize: 12,
  },
  hashContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hashText: {
    color: '#A5B4FC',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  
  // Balance Styles
  balanceCard: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 4,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  tokensContainer: {
    gap: 12,
  },
  tokenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tokenInfo: {
    flex: 1,
  },
  tokenSymbol: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  tokenBalance: {
    color: '#D1FAE5',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
  },
  tokenUsdValue: {
    color: '#D1FAE5',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default InteractiveChatBubble; 