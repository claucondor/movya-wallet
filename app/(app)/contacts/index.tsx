import { storage } from '@/app/core/storage';
import { Contact, deleteContact, getContacts } from '@/app/internal/contactService';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Appbar, Button, IconButton, ActivityIndicator as PaperActivityIndicator, Text as PaperText, useTheme as usePaperTheme } from 'react-native-paper';

export default function ContactsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const paperTheme = usePaperTheme();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Función para cargar contactos
  const loadContacts = async () => {
    try {
      setLoading(true);
      const userId = storage.getString('userId');
      console.log('[ContactsScreen] Attempting to load contacts. Retrieved userId from storage:', userId);
      if (!userId) {
        console.error('[ContactsScreen] userId is null or undefined. Cannot load contacts.');
        Alert.alert('Error de Autenticación', 'No se pudo obtener el ID de usuario. Por favor, intente iniciar sesión de nuevo.');
        setLoading(false);
        setRefreshing(false);
        return;
      }
      console.log('[ContactsScreen] Calling getContacts with userId:', userId);
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
              const userId = storage.getString('userId');
              
              if (!userId) {
                Alert.alert('Error de Autenticación', 'No se pudo obtener el ID de usuario. Por favor, intente iniciar sesión de nuevo.');
                return;
              }
              
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
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Mis Contactos" />
        <Appbar.Action icon="plus" onPress={() => router.push("/(app)/contacts/add")} />
      </Appbar.Header>
      
      {loading && !refreshing ? (
        <View style={styles.loaderContainer}>
          <PaperActivityIndicator animating={true} size="large" color={paperTheme.colors.primary} />
        </View>
      ) : contacts.length === 0 ? (
        <View style={styles.emptyState}>
          <IconButton 
            icon="account-group-outline"
            size={50} 
            iconColor={paperTheme.colors.onSurfaceDisabled} 
          />
          <PaperText variant="titleMedium" style={[styles.emptyText, { color: paperTheme.colors.onSurfaceDisabled }]}>
            No tienes contactos guardados
          </PaperText>
          <Button 
            mode="contained" 
            onPress={() => router.push("/(app)/contacts/add")}
            style={styles.addFirstButton}
            labelStyle={styles.addFirstButtonText}
          >
            Añadir contacto
          </Button>
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
              colors={[paperTheme.colors.primary]}
              tintColor={paperTheme.colors.primary}
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
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  addFirstButton: {
  },
  addFirstButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
}); 