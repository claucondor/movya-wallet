import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SwapButtonProps {
  tokenSymbol: 'WAVAX' | 'USDC';
  onPress: () => void;
  isLoading?: boolean;
}

const SwapButton: React.FC<SwapButtonProps> = ({
  tokenSymbol,
  onPress,
  isLoading = false
}) => {
  const icon = 'swap-horizontal-outline';
  const label = 'Swap';

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      disabled={isLoading}
      activeOpacity={0.7}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="white" />
      ) : (
        <>
          <Ionicons name={icon} size={16} color="white" />
          <Text style={styles.buttonText}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B00', // Orange color to differentiate from wrap button
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 4,
    minWidth: 60,
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 2,
  },
});

export default SwapButton; 