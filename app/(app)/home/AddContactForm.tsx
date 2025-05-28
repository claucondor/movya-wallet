import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button as PaperButton, SegmentedButtons, TextInput as PaperTextInput, Text as PaperText, IconButton } from 'react-native-paper';
import { Color, Padding, Border, Gap, FontFamily, FontSize } from './GlobalStyles'; // Assuming GlobalStyles is in the same folder or adjust path

type ContactType = 'address' | 'email';

interface AddContactFormProps {
  initialContactType?: ContactType;
  initialNickname?: string;
  initialContactValue?: string;
  onSave: (nickname: string, contactValue: string, contactType: ContactType) => Promise<void>;
  onDismiss: () => void;
  isSaving: boolean;
}

const AddContactForm: React.FC<AddContactFormProps> = React.memo(({
  initialContactType = 'address',
  initialNickname = '',
  initialContactValue = '',
  onSave,
  onDismiss,
  isSaving,
}) => {
  const [contactType, setContactType] = useState<ContactType>(initialContactType);
  const [nicknameText, setNicknameText] = useState(initialNickname);
  const [contactValue, setContactValue] = useState(initialContactValue);

  useEffect(() => {
    setContactType(initialContactType);
    setNicknameText(initialNickname);
    setContactValue(initialContactValue);
  }, [initialContactType, initialNickname, initialContactValue]);

  const handleInternalSave = () => {
    // Validations can be moved here or kept in the parent if preferred
    // For now, assuming parent (Home component) handles validation before calling onSave from its own handleSaveContact
    onSave(nicknameText, contactValue, contactType);
  };

  return (
    <View style={styles.formContainer}> 
        <View style={styles.modalHeader}>
            <PaperText style={styles.modalTitle}>Add New Contact</PaperText>
            <IconButton
                icon="close"
                size={24}
                onPress={onDismiss}
                style={styles.modalCloseButton}
                iconColor={Color.colorGray100}
            />
        </View>

        <SegmentedButtons
            value={contactType}
            onValueChange={(val) => setContactType(val as ContactType)}
            style={styles.segmentedButtons}
            buttons={[
                { value: 'address', label: 'Address', icon: 'wallet-outline', style: styles.segmentedButton, labelStyle: styles.segmentedButtonLabel },
                { value: 'email', label: 'Email', icon: 'email-outline', style: styles.segmentedButton, labelStyle: styles.segmentedButtonLabel },
            ]}
        />

        <View style={styles.inputRow}>
            <IconButton
                icon="account-outline"
                size={24}
                style={styles.inputIcon}
                iconColor={Color.colorGray200} // Consistent icon color
            />
            <PaperTextInput
                mode="outlined"
                label="Nickname"
                placeholder="e.g., John Doe"
                value={nicknameText}
                onChangeText={setNicknameText}
                style={styles.modalInput} // Will take flex: 1
                theme={{
                    roundness: Border.br_12,
                    colors: {
                        primary: Color.colorRoyalblue100,
                        text: Color.colorGray100,
                        placeholder: Color.colorGray200,
                        outline: Color.colorGray400,
                        background: Color.colorWhite
                    }
                }}
            />
        </View>

        <View style={styles.inputRow}>
            <IconButton
                icon={contactType === 'address' ? 'format-letter-matches' : 'at'}
                size={24}
                style={styles.inputIcon}
                iconColor={Color.colorGray200} // Consistent icon color
            />
            <PaperTextInput
                mode="outlined"
                label={contactType === 'address' ? 'Wallet Address' : 'Email Address'}
                placeholder={contactType === 'address' ? '0x...' : 'user@example.com'}
                value={contactValue}
                onChangeText={setContactValue}
                style={styles.modalInput} // Will take flex: 1
                keyboardType={contactType === 'email' ? 'email-address' : 'default'}
                autoCapitalize="none"
                theme={{
                    roundness: Border.br_12,
                    colors: {
                        primary: Color.colorRoyalblue100,
                        text: Color.colorGray100,
                        placeholder: Color.colorGray200,
                        outline: Color.colorGray400,
                        background: Color.colorWhite
                    }
                }}
            />
        </View>

        <PaperButton
            onPress={handleInternalSave}
            mode="contained"
            style={styles.saveButtonModal}
            labelStyle={styles.saveButtonModalLabel}
            loading={isSaving}
            disabled={isSaving}
        >
            {isSaving ? 'Saving...' : 'Save Contact'}
        </PaperButton>
    </View>
  );
});

const styles = StyleSheet.create({
    formContainer: { // This will be the contentContainerStyle for the Modal in Home
        backgroundColor: Color.colorWhite, // Match modal background
        padding: Padding.p_24,
        borderRadius: Border.br_16, // Match modal border radius 
        // alignItems: 'center', // Keep from modalContainer if needed, or manage alignment here
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginBottom: Gap.gap_16,
    },
    modalTitle: {
        fontSize: FontSize.size_20,
        fontWeight: 'bold',
        fontFamily: FontFamily.geist,
        color: Color.colorGray100,
        textAlign: 'left',
    },
    modalCloseButton: {
        margin: -Padding.p_8,
    },
    segmentedButtons: {
        marginBottom: Gap.gap_16,
        height: 48,
        width: '100%',
    },
    segmentedButton: {},
    segmentedButtonLabel: {
        fontSize: 11,
        fontFamily: FontFamily.geist,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        marginBottom: Gap.gap_16,
    },
    inputIcon: {
        marginRight: Gap.gap_4,
        // Potentially adjust vertical alignment if needed:
        // alignSelf: 'center', // Or adjust top/bottom margin
    },
    modalInput: {
        flex: 1, 
        fontSize: FontSize.size_12,
        // No specific width or margin needed here now
    },
    saveButtonModal: {
        marginTop: Gap.gap_12,
        backgroundColor: Color.colorRoyalblue100,
        paddingVertical: Padding.p_4,
        borderRadius: Border.br_32,
        width: '100%',
    },
    saveButtonModalLabel: {
        fontFamily: FontFamily.geist,
        fontSize: FontSize.size_12,
        fontWeight: 'bold',
        color: Color.colorWhite,
    }
});

export default AddContactForm; 