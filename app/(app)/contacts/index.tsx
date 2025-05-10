import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Contact, deleteContact, getContacts } from '../../../internal/contactService';

export default function ContactsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Función para cargar contactos
  const loadContacts = async () => {
    try {
      setLoading(true);
      const userId = 'current'; // Esto debería venir de tu sistema de autenticación
      const result = await getContacts(userId);
      
      if (result.success) {
        setContacts(result.contacts);
      } else {
        Alert.alert('Error', result.message || 'No se pudieron cargar los contactos');
      }
    } catch (error) {
      console.error('Error al cargar contactos:', error);
      Alert.alert('Error', 'No se pudieron cargar los contactos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Cargar contactos al iniciar
  useEffect(() => {
    loadContacts();
  }, []);

  // Función para refrescar
  const onRefresh = () => {
    setRefreshing(true);
    loadContacts();
  };

  // Función para eliminar contacto
  const handleDeleteContact = (contactId: string) => {
    Alert.alert(
      'Eliminar contacto',
      '¿Estás seguro de que quieres eliminar este contacto?',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const userId = 'current'; // Esto debería venir de tu sistema de autenticación
              const result = await deleteContact(userId, contactId);
              
              if (result.success) {
                // Actualizar lista de contactos
                setContacts(contacts.filter(contact => contact.id !== contactId));
                Alert.alert('Éxito', 'Contacto eliminado correctamente');
              } else {
                Alert.alert('Error', result.message || 'No se pudo eliminar el contacto');
              }
            } catch (error) {
              console.error('Error al eliminar contacto:', error);
              Alert.alert('Error', 'No se pudo eliminar el contacto');
            }
          }
        }
      ]
    );
  };

  // Renderizar cada contacto
  const renderContact = ({ item }: { item: Contact }) => (
    <View style={[styles.contactCard, { backgroundColor: Colors[colorScheme ?? 'light'].cardBackground }]}>
      <View style={styles.contactInfo}>
        <Text style={[styles.nickname, { color: Colors[colorScheme ?? 'light'].text }]}>
          {item.nickname}
        </Text>
        <Text style={[styles.value, { color: Colors[colorScheme ?? 'light'].secondaryText }]}>
          {item.type === 'email' ? '📧 ' : '👛 '}
          {item.value.length > 25 ? `${item.value.substring(0, 10)}...${item.value.substring(item.value.length - 10)}` : item.value}
        </Text>
      </View>
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => handleDeleteContact(item.id || '')}
      >
        <IconSymbol name="trash" color={Colors[colorScheme ?? 'light'].danger} size={20} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      <Stack.Screen 
        options={{
          headerTitle: 'Mis Contactos',
          headerShown: true,
          headerBackTitle: 'Atrás',
          headerRight: () => (
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => router.push('/contacts/add')}
            >
              <IconSymbol name="plus" color={Colors[colorScheme ?? 'light'].tint} size={24} />
            </TouchableOpacity>
          ),
        }} 
      />
      
      {loading && !refreshing ? (
        <ActivityIndicator style={styles.loader} size="large" color={Colors[colorScheme ?? 'light'].tint} />
      ) : contacts.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol name="person.2" color={Colors[colorScheme ?? 'light'].secondaryText} size={50} />
          <Text style={[styles.emptyText, { color: Colors[colorScheme ?? 'light'].secondaryText }]}>
            No tienes contactos guardados
          </Text>
          <TouchableOpacity 
            style={[styles.addFirstButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
            onPress={() => router.push('/contacts/add')}
          >
            <Text style={styles.addFirstButtonText}>Añadir contacto</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={contacts}
          renderItem={renderContact}
          keyExtractor={(item) => item.id || item.nickname}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors[colorScheme ?? 'light'].tint]}
              tintColor={Colors[colorScheme ?? 'light'].tint}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  contactCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  contactInfo: {
    flex: 1,
  },
  nickname: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
  },
  deleteButton: {
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  addButton: {
    padding: 8,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  addFirstButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  addFirstButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
}); 