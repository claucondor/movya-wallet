import { storage } from '@/app/core/storage';
import { addContactByAddress, addContactByEmail } from '@/app/internal/contactService';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import {
    Appbar,
    Button,
    TextInput as PaperTextInput,
    SegmentedButtons,
    useTheme as usePaperTheme
} from 'react-native-paper';

type ContactType = 'address' | 'email';

export default function AddContactScreen() {
  const router = useRouter();
  const paperTheme = usePaperTheme();
  const [contactType, setContactType] = useState<ContactType>('address');
  const [nickname, setNickname] = useState('');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);

  const saveContact = async () => {
    if (!nickname.trim()) {
      Alert.alert('Error', 'El nickname es obligatorio');
      return;
    }
    if (!value.trim()) {
      Alert.alert('Error', `La ${contactType === 'address' ? 'dirección' : 'email'} es obligatoria`);
      return;
    }
    if (contactType === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        Alert.alert('Error', 'El email no es válido');
        return;
      }
    }
    try {
      setLoading(true);
      const userId = storage.getString('userId');
      if (!userId) {
        Alert.alert('Error de Autenticación', 'No se pudo obtener el ID de usuario.');
        setLoading(false);
        return;
      }
      let result;
      if (contactType === 'address') {
        result = await addContactByAddress(userId, nickname, value);
      } else {
        result = await addContactByEmail(userId, nickname, value);
      }
      if (result.success) {
        Alert.alert('Éxito', 'Contacto añadido correctamente', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Error', result.message || 'No se pudo añadir el contacto');
      }
    } catch (error) {
      console.error('Error al añadir contacto:', error);
      Alert.alert('Error', 'No se pudo añadir el contacto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: paperTheme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Añadir Contacto" />
      </Appbar.Header>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <SegmentedButtons
          value={contactType}
          onValueChange={(val) => setContactType(val as ContactType)}
          style={styles.segmentedControl}
          buttons={[
            {
              value: 'address',
              label: 'Dirección',
              icon: 'wallet-outline',
            },
            {
              value: 'email',
              label: 'Email',
              icon: 'email-outline',
            },
          ]}
        />

        <View style={styles.formCard}> 
          <PaperTextInput
            mode="outlined"
            label="Nickname"
            placeholder="Ej: Amigo Juan"
            value={nickname}
            onChangeText={setNickname}
            style={styles.input}
            autoCapitalize="words"
            maxLength={50}
            left={<PaperTextInput.Icon icon="account-outline" />}
          />
          
          <PaperTextInput
            mode="outlined"
            label={contactType === 'address' ? 'Dirección de Wallet' : 'Email'}
            placeholder={contactType === 'address' ? '0x...' : 'ejemplo@correo.com'}
            value={value}
            onChangeText={setValue}
            style={styles.input}
            autoCapitalize="none"
            keyboardType={contactType === 'email' ? 'email-address' : 'default'}
            autoCorrect={false}
            multiline={contactType === 'address'}
            numberOfLines={contactType === 'address' ? 2 : 1}
            left={<PaperTextInput.Icon icon={contactType === 'address' ? 'format-letter-matches' : 'at'} />}
          />
        </View>

        <Button 
          mode="contained" 
          onPress={saveContact} 
          loading={loading} 
          disabled={loading}
          style={styles.saveButton}
          icon="content-save-outline"
        >
          {loading ? 'Guardando...' : 'Guardar Contacto'}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  segmentedControl: {
    marginBottom: 20,
  },
  formCard: {
  },
  input: {
    marginBottom: 16,
  },
  saveButton: {
    marginTop: 8,
    paddingVertical: 8,
  },
}); 