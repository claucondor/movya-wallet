import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Modal, Portal, IconButton, ActivityIndicator } from 'react-native-paper';
import { Color, FontSize, FontFamily, Border, Padding, Gap } from './GlobalStyles';
import { Contact } from '../../internal/contactService';

interface EditContactModalProps {
  visible: boolean;
  contact: Contact | null;
  onDismiss: () => void;
  onSave: (contactId: string, nickname: string, value: string) => Promise<void>;
  isSaving?: boolean;
}

const EditContactModal: React.FC<EditContactModalProps> = ({
  visible,
  contact,
  onDismiss,
  onSave,
  isSaving = false
}) => {
  const [nickname, setNickname] = useState('');
  const [value, setValue] = useState('');
  const [isNicknameValid, setIsNicknameValid] = useState(true);
  const [isValueValid, setIsValueValid] = useState(true);

  useEffect(() => {
    if (contact) {
      setNickname(contact.nickname);
      setValue(contact.value);
    }
  }, [contact]);

  const validateNickname = (text: string) => {
    const valid = text.trim().length >= 2;
    setIsNicknameValid(valid);
    return valid;
  };

  const validateValue = (text: string) => {
    if (!contact) return false;
    
    let valid = false;
    if (contact.type === 'address') {
      // Validar dirección de wallet (0x + 40 caracteres hexadecimales)
      valid = /^0x[a-fA-F0-9]{40}$/.test(text);
    } else if (contact.type === 'email') {
      // Validar email
      valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
    }
    
    setIsValueValid(valid);
    return valid;
  };

  const handleSave = async () => {
    if (!contact?.id) return;

    const isNicknameOk = validateNickname(nickname);
    const isValueOk = validateValue(value);

    if (!isNicknameOk || !isValueOk) {
      Alert.alert(
        "Error de Validación",
        "Por favor, corrige los errores antes de guardar."
      );
      return;
    }

    try {
      await onSave(contact.id, nickname.trim(), value.trim());
      onDismiss();
    } catch (error) {
      Alert.alert(
        "Error",
        "No se pudo actualizar el contacto. Inténtalo de nuevo."
      );
    }
  };

  const getValuePlaceholder = () => {
    if (!contact) return '';
    return contact.type === 'address' 
      ? '0x123...abc (Dirección de wallet)'
      : 'usuario@ejemplo.com';
  };

  const getValueLabel = () => {
    if (!contact) return '';
    return contact.type === 'address' ? 'Dirección de Wallet' : 'Email';
  };

  if (!contact) return null;

  return (
    <Portal>
      <Modal 
        visible={visible} 
        onDismiss={onDismiss} 
        contentContainerStyle={styles.modalContainer}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Editar Contacto</Text>
          <IconButton 
            icon="close" 
            size={24}
            iconColor={Color.colorGray200}
            style={styles.closeButton}
            onPress={onDismiss}
          />
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nickname</Text>
            <TextInput
              style={[styles.input, !isNicknameValid && styles.inputError]}
              value={nickname}
              onChangeText={(text) => {
                setNickname(text);
                validateNickname(text);
              }}
              placeholder="Ej: Juan, María, etc."
              maxLength={50}
              editable={!isSaving}
            />
            {!isNicknameValid && (
              <Text style={styles.errorText}>
                El nickname debe tener al menos 2 caracteres
              </Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{getValueLabel()}</Text>
            <TextInput
              style={[styles.input, !isValueValid && styles.inputError]}
              value={value}
              onChangeText={(text) => {
                setValue(text);
                validateValue(text);
              }}
              placeholder={getValuePlaceholder()}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSaving}
              multiline={contact.type === 'address'}
              numberOfLines={contact.type === 'address' ? 2 : 1}
            />
            {!isValueValid && (
              <Text style={styles.errorText}>
                {contact.type === 'address' 
                  ? 'La dirección debe ser válida (0x seguido de 40 caracteres)'
                  : 'El email debe tener un formato válido'
                }
              </Text>
            )}
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.cancelButton]} 
            onPress={onDismiss}
            disabled={isSaving}
          >
            <Text style={[styles.actionButtonText, styles.cancelButtonText]}>
              Cancelar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.saveButton]} 
            onPress={handleSave}
            disabled={isSaving || !isNicknameValid || !isValueValid}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={Color.colorWhite} />
            ) : (
              <Text style={[styles.actionButtonText, styles.saveButtonText]}>
                Guardar Cambios
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: Color.colorWhite,
    margin: 20,
    borderRadius: Border.br_20,
    padding: Padding.p_24,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: FontSize.size_20,
    fontWeight: '700',
    color: Color.colorGray100,
    fontFamily: FontFamily.geist,
  },
  closeButton: {
    margin: 0,
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: FontSize.size_14,
    fontWeight: '600',
    color: Color.colorGray100,
    fontFamily: FontFamily.geist,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Color.colorGray300,
    borderRadius: Border.br_12,
    padding: Padding.p_12,
    fontSize: FontSize.size_14,
    fontFamily: FontFamily.geist,
    color: Color.colorGray100,
    backgroundColor: Color.colorWhite,
  },
  inputError: {
    borderColor: '#FF4444',
  },
  errorText: {
    fontSize: FontSize.size_12,
    color: '#FF4444',
    fontFamily: FontFamily.geist,
    marginTop: Gap.gap_4,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: Gap.gap_12,
  },
  actionButton: {
    flex: 1,
    borderRadius: Border.br_16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButton: {
    backgroundColor: Color.colorWhite,
    borderColor: Color.colorGray300,
  },
  saveButton: {
    backgroundColor: Color.colorRoyalblue100,
    borderColor: Color.colorRoyalblue100,
  },
  actionButtonText: {
    fontSize: FontSize.size_14,
    fontWeight: '600',
    fontFamily: FontFamily.geist,
  },
  cancelButtonText: {
    color: Color.colorGray100,
  },
  saveButtonText: {
    color: Color.colorWhite,
  },
});

export default EditContactModal; 