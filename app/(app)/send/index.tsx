import React from 'react';
import { Controller, ControllerRenderProps, useForm, UseFormHandleSubmit } from 'react-hook-form';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
// import * as SecureStore from 'expo-secure-store';
// import { privateKeyToAccount } from 'viem/accounts';

// Define a type for the form data
interface SendFormData {
  recipientAddress: string;
  amount: string;
}

export default function SendScreen() {
  // Use the specific form data type with useForm
  const { control, handleSubmit, formState: { errors } }: { control: any, handleSubmit: UseFormHandleSubmit<SendFormData>, formState: { errors: any } } = useForm<SendFormData>({
    defaultValues: {
      recipientAddress: '',
      amount: '',
    },
    mode: 'onChange', // Optional: Add validation mode
  });

  const onSubmit = async (data: SendFormData) => {
    console.log('Send data:', data);
    // TODO: Implement sending logic
    // 1. Get private key from SecureStore
    // const pk = await SecureStore.getItemAsync('userPrivateKey');
    // if (!pk) { Alert.alert('Error', 'Private key not found.'); return; }
    // const account = privateKeyToAccount(`0x${pk}`);
    // 2. Validate address (e.g., using isAddress from viem)
    // if (!isAddress(data.recipientAddress)) { Alert.alert('Error', 'Invalid recipient address.'); return; }
    // 3. Validate amount (is number, > 0)
    // const sendAmount = parseFloat(data.amount);
    // if (isNaN(sendAmount) || sendAmount <= 0) { Alert.alert('Error', 'Invalid amount.'); return; }
    // 4. Use viem client to send transaction
    // try { /* send transaction */ Alert.alert('Success', 'Transaction sent!'); } catch (error) { Alert.alert('Error', 'Failed to send transaction.'); }

    Alert.alert('Placeholder', 'Send functionality not yet implemented.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Send Crypto</Text>

      <Controller
        control={control}
        rules={{
          required: 'Recipient address is required',
          // Add address validation using viem's isAddress
          // validate: value => isAddress(value) || 'Invalid address format'
        }}
        // Use the specific form data type here
        render={({ field }: { field: ControllerRenderProps<SendFormData, 'recipientAddress'> }) => (
          <TextInput
            placeholder="Recipient Address"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            value={field.value}
            style={[styles.input, errors.recipientAddress ? styles.inputError : null]}
            autoCapitalize="none"
            autoCorrect={false}
          />
        )}
        name="recipientAddress"
      />
      {errors.recipientAddress && <Text style={styles.errorText}>{errors.recipientAddress.message}</Text>}

      <Controller
        control={control}
        rules={{
          required: 'Amount is required',
          // Add numeric validation
          // validate: value => !isNaN(parseFloat(value)) && parseFloat(value) > 0 || 'Invalid amount'
        }}
        // Use the specific form data type here
        render={({ field }: { field: ControllerRenderProps<SendFormData, 'amount'> }) => (
          <TextInput
            placeholder="Amount"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            value={field.value}
            style={[styles.input, errors.amount ? styles.inputError : null]}
            keyboardType="numeric"
          />
        )}
        name="amount"
      />
      {errors.amount && <Text style={styles.errorText}>{errors.amount.message}</Text>}

      {/* Optional: Token Selector */}
      {/* <Text>Token:</Text> ... */}

      <Button title="Send" onPress={handleSubmit(onSubmit)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff', // Add a background color
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30, // Increase spacing
    textAlign: 'center',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc', // Lighter border
    backgroundColor: '#f9f9f9', // Slight background tint
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  inputError: {
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    fontSize: 12,
  },
}); 