import { storage } from '@/app/core/storage';
import { Contact, deleteContact, getContacts } from '@/app/internal/contactService';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Appbar, Button, IconButton, List, ActivityIndicator as PaperActivityIndicator, Text as PaperText, useTheme as usePaperTheme } from 'react-native-paper';

export default function ContactsScreen() {
  const router = useRouter();
  const paperTheme = usePaperTheme();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  useEffect(() => {
    loadContacts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadContacts();
  };

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
                Alert.alert('Error de Autenticación', 'No se pudo obtener el ID de usuario.');
                return;
              }
              const result = await deleteContact(userId, contactId);
              if (result.success) {
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

  const renderContact = ({ item }: { item: Contact }) => (
    <List.Item
      title={item.nickname}
      description={item.value.length > 30 ? `${item.value.substring(0, 15)}...${item.value.substring(item.value.length - 10)}` : item.value}
      descriptionNumberOfLines={1}
      titleStyle={{ fontWeight: 'bold' }}
      left={props => <List.Icon {...props} icon={item.type === 'email' ? 'email-outline' : 'wallet-outline'} />}
      right={props => 
        <IconButton 
          {...props} 
          icon="trash-can-outline" 
          iconColor={paperTheme.colors.error}
          onPress={() => handleDeleteContact(item.id || '')} 
        />
      }
      style={[styles.listItem, { backgroundColor: paperTheme.colors.surfaceVariant }]}
      onPress={() => {
        console.log('Pressed contact:', item.nickname);
      }}
    />
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
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  listItem: {
    marginBottom: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    elevation: 1,
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
  addFirstButton: {},
  addFirstButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
}); 