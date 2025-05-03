import { storage } from '@/app/core/storage';
import { ThemedText } from '@/components/ThemedText';
import { avalancheFuji } from '@/constants/chains';
import { useTheme } from '@/hooks/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useRef } from 'react';
import { Controller, ControllerRenderProps, useForm, UseFormHandleSubmit } from 'react-hook-form';
import { Alert, Animated, Image, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { createWalletClient, http, isAddress, parseEther } from 'viem';
import { PrivateKeyAccount, privateKeyToAccount } from 'viem/accounts';

// Define a type for the form data
interface SendFormData {
  recipientAddress: string;
  amount: string;
}

// Use the same key as in wallet.tsx for consistency
const PRIVATE_KEY_STORAGE_KEY = 'userPrivateKey'; 

export default function SendScreen() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  // Use the specific form data type with useForm
  const { control, handleSubmit, formState: { errors, isSubmitting } }: { control: any, handleSubmit: UseFormHandleSubmit<SendFormData>, formState: { errors: any, isSubmitting: boolean } } = useForm<SendFormData>({
    defaultValues: {
      recipientAddress: '',
      amount: '',
    },
    mode: 'onChange', // Optional: Add validation mode
  });

  // Animation values
  const cancelAnimatedValue = useRef(new Animated.Value(1)).current;
  const sendAnimatedValue = useRef(new Animated.Value(1)).current;

  const animateButton = (value: Animated.Value, callback?: () => void) => {
    Animated.sequence([
      Animated.timing(value, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(value, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(callback);
  };

  const onSubmit = async (data: SendFormData) => {
    // 1. Get private key from Storage
    const pk = storage.getString(PRIVATE_KEY_STORAGE_KEY);
    if (!pk) {
      Alert.alert('Error', 'Private key not found. Please ensure you are logged in.');
      return;
    }

    let account: PrivateKeyAccount;
    try {
        account = privateKeyToAccount(pk as `0x${string}`);
    } catch (error) {
        console.error("Failed to create account from private key:", error);
        Alert.alert('Error', 'Failed to load wallet account.');
        return;
    }


    // 2. Validate address (using isAddress from viem)
    if (!isAddress(data.recipientAddress)) {
      Alert.alert('Error', 'Invalid recipient address format.');
      return; // Already handled by form validation rules, but good as a double check
    }

    // 3. Validate amount (is positive number)
    let sendAmountWei: bigint;
    try {
        const sendAmount = parseFloat(data.amount);
        if (isNaN(sendAmount) || sendAmount <= 0) {
            Alert.alert('Error', 'Invalid amount. Please enter a positive number.');
            return; // Also handled by form validation, but good to double check
        }
        // Convert amount to Wei using viem's parseEther
        sendAmountWei = parseEther(data.amount);
    } catch (error) {
        console.error("Failed to parse amount:", error);
        Alert.alert('Error', 'Invalid amount format.');
        return;
    }


    // 4. Use viem client to send transaction
    try {
      // Create a Wallet Client
      const client = createWalletClient({
        account,
        chain: avalancheFuji, // Use the imported chain config
        transport: http(avalancheFuji.rpcUrls.default.http[0]), // Use the default RPC URL
      });

      console.log(`Attempting to send ${data.amount} AVAX to ${data.recipientAddress} from ${account.address}...`);

      // Send the transaction
      const hash = await client.sendTransaction({
        to: data.recipientAddress as `0x${string}`,
        value: sendAmountWei, // Send value in Wei
      });

      console.log('Transaction successful, hash:', hash);
      Alert.alert('Success', `Transaction sent! Hash: ${hash}`);
      // Optionally, clear the form or navigate away
      // reset(); // Requires `reset` from useForm

    } catch (error: any) {
      console.error('Failed to send transaction:', error);
      // Provide more specific error feedback if possible
      const errorMessage = error.shortMessage || error.message || 'An unknown error occurred.';
      Alert.alert('Error', `Failed to send transaction: ${errorMessage}`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Video */}
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

      <View style={styles.header}>
        <ThemedText
          type="title"
          style={styles.headerTitle}
          lightColor="#FFFFFF"
          darkColor="#FFFFFF"
        >
          Send AVAX
        </ThemedText>
        <Image
          source={require('@/assets/Avax_Token.png')}
          style={styles.tokenLogo}
          resizeMode="contain"
        />
      </View>

      <View style={[styles.formContainer, { backgroundColor: isDark ? '#1A1F38' : '#FFFFFF' }]}>
        <View style={styles.inputContainer}>
          <ThemedText 
            type="defaultSemiBold" 
            style={styles.inputLabel}
            lightColor="#6C7A9C"
            darkColor="#9BA1A6"
          >
            Recipient Address
          </ThemedText>
          <Controller
            control={control}
            rules={{
              required: 'Recipient address is required',
              validate: value => isAddress(value) || 'Invalid address format'
            }}
            render={({ field }: { field: ControllerRenderProps<SendFormData, 'recipientAddress'> }) => (
              <TextInput
                placeholder="0x..."
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                value={field.value}
                style={[
                  styles.input,
                  isDark ? styles.inputDark : styles.inputLight,
                  errors.recipientAddress && styles.inputError
                ]}
                placeholderTextColor={isDark ? '#4A5568' : '#A0AEC0'}
                autoCapitalize="none"
                autoCorrect={false}
              />
            )}
            name="recipientAddress"
          />
          {errors.recipientAddress && (
            <ThemedText style={styles.errorText} lightColor="#E53E3E" darkColor="#FC8181">
              {errors.recipientAddress.message as string}
            </ThemedText>
          )}
        </View>

        <View style={styles.inputContainer}>
          <ThemedText 
            type="defaultSemiBold" 
            style={styles.inputLabel}
            lightColor="#6C7A9C"
            darkColor="#9BA1A6"
          >
            Amount
          </ThemedText>
          <Controller
            control={control}
            rules={{
              required: 'Amount is required',
              validate: value => {
                try {
                  const num = parseFloat(value);
                  if (isNaN(num) || num <= 0) return 'Amount must be a positive number';
                  parseEther(value);
                  return true;
                } catch {
                  return 'Invalid amount format';
                }
              }
            }}
            render={({ field }: { field: ControllerRenderProps<SendFormData, 'amount'> }) => (
              <View style={styles.amountInputContainer}>
                <TextInput
                  placeholder="0.0"
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  value={field.value}
                  style={[
                    styles.input,
                    styles.amountInput,
                    isDark ? styles.inputDark : styles.inputLight,
                    errors.amount && styles.inputError
                  ]}
                  placeholderTextColor={isDark ? '#4A5568' : '#A0AEC0'}
                  keyboardType="numeric"
                />
                <ThemedText 
                  type="defaultSemiBold" 
                  style={styles.currencyLabel}
                  lightColor="#6C7A9C"
                  darkColor="#9BA1A6"
                >
                  AVAX
                </ThemedText>
              </View>
            )}
            name="amount"
          />
          {errors.amount && (
            <ThemedText style={styles.errorText} lightColor="#E53E3E" darkColor="#FC8181">
              {errors.amount.message as string}
            </ThemedText>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <Animated.View style={[
            styles.buttonWrapper,
            { transform: [{ scale: cancelAnimatedValue }] }
          ]}>
            <LinearGradient
              colors={isDark ? ['#2D3748', '#1A202C'] : ['#EDF2F7', '#E2E8F0']}
              style={[styles.button, styles.cancelButton]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Pressable
                style={styles.buttonContent}
                onPressIn={() => {
                  animateButton(cancelAnimatedValue);
                }}
                onPress={() => {
                  animateButton(cancelAnimatedValue, () => router.push('/(app)/wallet'));
                }}
              >
                <Ionicons 
                  name="arrow-back" 
                  size={20} 
                  color={isDark ? '#FFFFFF' : '#4A5568'} 
                  style={styles.buttonIcon} 
                />
                <ThemedText 
                  type="defaultSemiBold" 
                  style={styles.buttonText}
                  lightColor="#4A5568"
                  darkColor="#FFFFFF"
                >
                  Cancel
                </ThemedText>
              </Pressable>
            </LinearGradient>
          </Animated.View>

          <Animated.View style={[
            styles.buttonWrapper,
            { transform: [{ scale: sendAnimatedValue }] }
          ]}>
            <LinearGradient
              colors={['#3A5AFF', '#2541CC']}
              style={[styles.button, styles.sendButton]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Pressable
                style={styles.buttonContent}
                onPressIn={() => {
                  if (!isSubmitting) animateButton(sendAnimatedValue);
                }}
                onPress={() => {
                  if (!isSubmitting) {
                    animateButton(sendAnimatedValue, handleSubmit(onSubmit));
                  }
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <View style={styles.loadingContainer}>
                    <Ionicons 
                      name="sync" 
                      size={20} 
                      color="#FFFFFF" 
                      style={[styles.buttonIcon, styles.spinningIcon]} 
                    />
                    <ThemedText 
                      type="defaultSemiBold" 
                      style={styles.buttonText}
                      lightColor="#FFFFFF"
                      darkColor="#FFFFFF"
                    >
                      Sending...
                    </ThemedText>
                  </View>
                ) : (
                  <>
                    <Ionicons 
                      name="send" 
                      size={20} 
                      color="#FFFFFF" 
                      style={styles.buttonIcon} 
                    />
                    <ThemedText 
                      type="defaultSemiBold" 
                      style={styles.buttonText}
                      lightColor="#FFFFFF"
                      darkColor="#FFFFFF"
                    >
                      Send AVAX
                    </ThemedText>
                  </>
                )}
              </Pressable>
            </LinearGradient>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  videoContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: '60%',
    overflow: 'hidden',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  tokenLogo: {
    width: 60,
    height: 60,
    marginBottom: 20,
  },
  formContainer: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    marginBottom: 8,
    fontSize: 14,
  },
  input: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  inputLight: {
    backgroundColor: '#F7FAFC',
    borderColor: '#E2E8F0',
    color: '#1A202C',
  },
  inputDark: {
    backgroundColor: '#2D3748',
    borderColor: '#4A5568',
    color: '#FFFFFF',
  },
  inputError: {
    borderColor: '#E53E3E',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountInput: {
    flex: 1,
  },
  currencyLabel: {
    marginLeft: 12,
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
    paddingHorizontal: 6,
  },
  buttonWrapper: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  button: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  sendButton: {
    backgroundColor: '#3A5AFF',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spinningIcon: {
    transform: [{ rotate: '45deg' }],
  },
}); 