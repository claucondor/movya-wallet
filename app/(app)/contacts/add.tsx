import { addContactByAddress, addContactByEmail } from '@/app/internal/contactService';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type ContactType = 'address' | 'email';

export default function AddContactScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [contactType, setContactType] = useState<ContactType>('address');
  const [nickname, setNickname] = useState('');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);

  // Función para validar y guardar contacto
  const saveContact = async () => {
    // Validar campos
    if (!nickname.trim()) {
      Alert.alert('Error', 'El nickname es obligatorio');
      return;
    }

    if (!value.trim()) {
      Alert.alert('Error', `La ${contactType === 'address' ? 'dirección' : 'email'} es obligatoria`);
      return;
    }

    // Validación específica
    if (contactType === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        Alert.alert('Error', 'El email no es válido');
        return;
      }
    }

    try {
      setLoading(true);
      const userId = 'current'; // Esto debería venir de tu sistema de autenticación
      
      let result;
      if (contactType === 'address') {
        result = await addContactByAddress(userId, nickname, value);
      } else {
        result = await addContactByEmail(userId, nickname, value);
      }
      
      if (result.success) {
        Alert.alert('Éxito', 'Contacto añadido correctamente', [
          { 
            text: 'OK', 
            onPress: () => router.push("/(app)/contacts") 
          }
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
      style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <Stack.Screen 
        options={{
          headerTitle: 'Añadir Contacto',
          headerShown: true,
          headerBackTitle: 'Atrás',
        }} 
      />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Selector de tipo de contacto */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[
              styles.segmentButton,
              contactType === 'address' && { backgroundColor: Colors[colorScheme ?? 'light'].tint },
            ]}
            onPress={() => setContactType('address')}
          >
            <Text
              style={[
                styles.segmentText,
                contactType === 'address' && { color: 'white' },
                contactType !== 'address' && { color: Colors[colorScheme ?? 'light'].text }
              ]}
            >
              Dirección
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.segmentButton,
              contactType === 'email' && { backgroundColor: Colors[colorScheme ?? 'light'].tint },
            ]}
            onPress={() => setContactType('email')}
          >
            <Text
              style={[
                styles.segmentText,
                contactType === 'email' && { color: 'white' },
                contactType !== 'email' && { color: Colors[colorScheme ?? 'light'].text }
              ]}
            >
              Email
            </Text>
          </TouchableOpacity>
        </View>

        {/* Formulario */}
        <View style={[styles.formCard, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: Colors[colorScheme ?? 'light'].text }]}>Nickname</Text>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: Colors[colorScheme ?? 'light'].inputBackground,
                  color: Colors[colorScheme ?? 'light'].text,
                  borderColor: Colors[colorScheme ?? 'light'].border
                }
              ]}
              placeholder="Ejemplo: Amigo1"
              placeholderTextColor={Colors[colorScheme ?? 'light'].placeholder}
              value={nickname}
              onChangeText={setNickname}
              autoCapitalize="none"
              maxLength={50}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: Colors[colorScheme ?? 'light'].text }]}>
              {contactType === 'address' ? 'Dirección de Wallet' : 'Email'}
            </Text>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: Colors[colorScheme ?? 'light'].inputBackground,
                  color: Colors[colorScheme ?? 'light'].text,
                  borderColor: Colors[colorScheme ?? 'light'].border
                }
              ]}
              placeholder={contactType === 'address' ? '0x...' : 'ejemplo@correo.com'}
              placeholderTextColor={Colors[colorScheme ?? 'light'].placeholder}
              value={value}
              onChangeText={setValue}
              autoCapitalize="none"
              keyboardType={contactType === 'email' ? 'email-address' : 'default'}
              autoCorrect={false}
              multiline={contactType === 'address'}
              numberOfLines={contactType === 'address' ? 2 : 1}
            />
          </View>
        </View>

        {/* Botón de guardar */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: Colors[colorScheme ?? 'light'].tint },
            loading && { opacity: 0.7 }
          ]}
          onPress={saveContact}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <IconSymbol name="person.badge.plus" color="white" size={20} />
              <Text style={styles.saveButtonText}>Guardar Contacto</Text>
            </>
          )}
        </TouchableOpacity>
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
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 20,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  segmentText: {
    fontWeight: '600',
  },
  formCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
}); 