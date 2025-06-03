import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

interface WrapUnwrapButtonProps {
  tokenSymbol: 'AVAX' | 'WAVAX';
  onPress: () => void;
  isLoading?: boolean;
}

const WrapUnwrapButton: React.FC<WrapUnwrapButtonProps> = ({
  tokenSymbol,
  onPress,
  isLoading = false
}) => {
  const isWrap = tokenSymbol === 'AVAX';
  const icon = isWrap ? 'arrow-forward-circle-outline' : 'arrow-back-circle-outline';
  const label = isWrap ? 'Wrap' : 'Unwrap';
  const toToken = isWrap ? 'WAVAX' : 'AVAX';

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
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
    minWidth: 80,
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default WrapUnwrapButton; 