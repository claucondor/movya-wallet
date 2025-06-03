import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Modal, Portal, IconButton } from 'react-native-paper';
import { Color, FontSize, FontFamily, Border, Padding, Gap } from './GlobalStyles';
import { Contact } from '../../internal/contactService';

interface ContactDetailsModalProps {
  visible: boolean;
  contact: Contact | null;
  onDismiss: () => void;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
  onSend: (contact: Contact) => void;
  onChat: (contact: Contact) => void;
}

const ContactDetailsModal: React.FC<ContactDetailsModalProps> = ({
  visible,
  contact,
  onDismiss,
  onEdit,
  onDelete,
  onSend,
  onChat
}) => {
  if (!contact) return null;

  const handleDelete = () => {
    Alert.alert(
      "Delete Contact",
      `Are you sure you want to delete "${contact.nickname}"?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete", 
          style: "destructive",
          onPress: () => {
            onDelete(contact);
            onDismiss();
          }
        }
      ]
    );
  };

  const handleSend = () => {
    onSend(contact);
    onDismiss();
  };

  const handleEdit = () => {
    onEdit(contact);
    onDismiss();
  };

  const handleChat = () => {
    onChat(contact);
    onDismiss();
  };

  const getContactTypeLabel = () => {
    return contact.type === 'address' ? 'Wallet Address' : 'Email';
  };

  const truncateValue = (value: string, maxLength: number = 20) => {
    if (value.length <= maxLength) return value;
    return `${value.substring(0, maxLength)}...`;
  };

  return (
    <Portal>
      <Modal 
        visible={visible} 
        onDismiss={onDismiss} 
        contentContainerStyle={styles.modalContainer}
      >
        <View style={styles.header}>
          <View style={styles.contactCircle}>
            <Text style={styles.contactInitials}>
              {contact.nickname.substring(0, 2).toUpperCase()}
            </Text>
          </View>
          <IconButton 
            icon="close" 
            size={24}
            iconColor={Color.colorGray200}
            style={styles.closeButton}
            onPress={onDismiss}
          />
        </View>

        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{contact.nickname}</Text>
          <Text style={styles.contactTypeLabel}>{getContactTypeLabel()}</Text>
          <View style={styles.valueContainer}>
            <Text style={styles.contactValue}>{contact.value}</Text>
            <Text style={styles.contactValueTruncated}>
              {truncateValue(contact.value)}
            </Text>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity style={[styles.actionButton, styles.sendButton]} onPress={handleSend}>
            <Text style={[styles.actionButtonText, styles.sendButtonText]}>
              💸 Send Money
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.chatButton]} onPress={handleChat}>
            <Text style={[styles.actionButtonText, styles.chatButtonText]}>
              🤖 Ask Movya
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={handleEdit}>
            <Text style={[styles.actionButtonText, styles.editButtonText]}>
              ✏️ Edit Contact
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleDelete}>
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
              🗑️ Delete Contact
            </Text>
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
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  contactCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Color.colorRoyalblue100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInitials: {
    fontSize: 28,
    fontWeight: '700',
    color: Color.colorWhite,
    fontFamily: FontFamily.geist,
  },
  closeButton: {
    margin: 0,
  },
  contactInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  contactName: {
    fontSize: 24,
    fontWeight: '700',
    color: Color.colorGray100,
    fontFamily: FontFamily.geist,
    marginBottom: 8,
    textAlign: 'center',
  },
  contactTypeLabel: {
    fontSize: FontSize.size_14,
    color: Color.colorGray200,
    fontFamily: FontFamily.geist,
    marginBottom: Gap.gap_12,
  },
  valueContainer: {
    width: '100%',
    backgroundColor: Color.colorGray400,
    borderRadius: Border.br_12,
    padding: 16,
  },
  contactValue: {
    fontSize: FontSize.size_12,
    color: Color.colorGray100,
    fontFamily: FontFamily.geist,
    textAlign: 'center',
    display: 'none', // Hidden by default, shown on press
  },
  contactValueTruncated: {
    fontSize: FontSize.size_14,
    color: Color.colorGray100,
    fontFamily: FontFamily.geist,
    textAlign: 'center',
    fontWeight: '500',
  },
  actionsContainer: {
    gap: Gap.gap_12,
  },
  actionButton: {
    borderRadius: Border.br_16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  sendButton: {
    backgroundColor: Color.colorRoyalblue100,
    borderColor: Color.colorRoyalblue100,
  },
  chatButton: {
    backgroundColor: '#F0F8FF',
    borderColor: Color.colorRoyalblue100,
  },
  editButton: {
    backgroundColor: Color.colorWhite,
    borderColor: Color.colorGray300,
  },
  deleteButton: {
    backgroundColor: Color.colorWhite,
    borderColor: '#FF4444',
  },
  actionButtonText: {
    fontSize: FontSize.size_14,
    fontWeight: '600',
    fontFamily: FontFamily.geist,
  },
  sendButtonText: {
    color: Color.colorWhite,
  },
  chatButtonText: {
    color: Color.colorRoyalblue100,
  },
  editButtonText: {
    color: Color.colorGray100,
  },
  deleteButtonText: {
    color: '#FF4444',
  },
});

export default ContactDetailsModal; 