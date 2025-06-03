import React from 'react';
import { 
    View, 
    StyleSheet, 
    Linking, 
    Alert, 
    TouchableOpacity 
} from 'react-native';
import {
    Modal,
    Portal,
    Text as PaperText,
    Button as PaperButton,
    IconButton,
    Divider,
    Card,
    Chip
} from 'react-native-paper';
import Clipboard from '@react-native-clipboard/clipboard';
import * as Haptics from 'expo-haptics';
import { FontFamily, Color, Border, Gap, Padding, FontSize } from './GlobalStyles';

import { Transaction } from "../../core/services/transactionHistoryService";

interface TransactionDetailsModalProps {
    visible: boolean;
    transaction: Transaction | null;
    onDismiss: () => void;
}

const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({
    visible,
    transaction,
    onDismiss
}) => {
    if (!transaction) return null;

    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const formatTimestamp = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleString();
    };

    const copyToClipboard = (text: string, label: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Clipboard.setString(text);
        Alert.alert('Copied!', `${label} copied to clipboard`);
    };

    const openInExplorer = () => {
        if (transaction.hash) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const explorerUrl = `https://snowtrace.io/tx/${transaction.hash}`;
            Linking.openURL(explorerUrl).catch(() => {
                Alert.alert('Error', 'Could not open transaction in explorer');
            });
        }
    };

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'confirmed': return '#4CAF50';
            case 'pending': return '#FF9800';
            case 'failed': return '#F44336';
            default: return Color.colorGray200;
        }
    };

    const getTransactionIcon = () => {
        return transaction.type === 'sent' ? '📤' : '📥';
    };

    return (
        <Portal>
            <Modal 
                visible={visible} 
                onDismiss={onDismiss}
                contentContainerStyle={styles.modalContainer}
            >
                <Card style={styles.card}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerContent}>
                            <View style={styles.iconContainer}>
                                <PaperText style={styles.transactionIcon}>
                                    {getTransactionIcon()}
                                </PaperText>
                            </View>
                            <View style={styles.headerText}>
                                <PaperText variant="headlineSmall" style={styles.title}>
                                    {transaction.type === 'sent' ? 'Sent' : 'Received'} {transaction.currency}
                                </PaperText>
                                <PaperText variant="bodyMedium" style={styles.subtitle}>
                                    {formatTimestamp(transaction.timestamp)}
                                </PaperText>
                            </View>
                        </View>
                        <IconButton
                            icon="close"
                            size={24}
                            onPress={onDismiss}
                            iconColor={Color.colorGray200}
                        />
                    </View>

                    <Divider style={styles.divider} />

                    {/* Amount */}
                    <View style={styles.amountSection}>
                        <PaperText variant="bodyLarge" style={styles.amountLabel}>
                            Amount
                        </PaperText>
                        <PaperText 
                            variant="headlineMedium" 
                            style={[
                                styles.amount,
                                { color: transaction.type === 'sent' ? '#F44336' : '#4CAF50' }
                            ]}
                        >
                            {transaction.type === 'sent' ? '-' : '+'}
                            {transaction.amount} {transaction.currency}
                        </PaperText>
                    </View>

                    <Divider style={styles.divider} />

                    {/* Transaction Details */}
                    <View style={styles.detailsSection}>
                        {/* Status - Default to confirmed for existing transactions */}
                        <View style={styles.detailRow}>
                            <PaperText style={styles.detailLabel}>Status</PaperText>
                            <Chip 
                                style={[styles.statusChip, { backgroundColor: getStatusColor('confirmed') }]}
                                textStyle={styles.statusChipText}
                            >
                                Confirmed
                            </Chip>
                        </View>

                        {/* From/To */}
                        <View style={styles.detailRow}>
                            <PaperText style={styles.detailLabel}>
                                {transaction.type === 'sent' ? 'To' : 'From'}
                            </PaperText>
                            <TouchableOpacity 
                                onPress={() => {
                                    const address = transaction.type === 'sent' ? transaction.recipient : transaction.sender;
                                    if (address) copyToClipboard(address, 'Address');
                                }}
                                style={styles.addressContainer}
                            >
                                <View style={styles.recipientInfo}>
                                    <PaperText style={styles.detailValue}>
                                        {transaction.type === 'sent' 
                                            ? (transaction.recipientNickname || (transaction.recipient ? formatAddress(transaction.recipient) : 'Unknown'))
                                            : (transaction.senderNickname || (transaction.sender ? formatAddress(transaction.sender) : 'Unknown'))
                                        }
                                    </PaperText>
                                    {/* Show app user indicator if sender is from the app */}
                                    {transaction.type === 'received' && (transaction as any).isFromApp && (
                                        <PaperText style={styles.appUserBadge}>📱 Movya User</PaperText>
                                    )}
                                </View>
                                <IconButton
                                    icon="content-copy"
                                    size={16}
                                    iconColor={Color.colorRoyalblue100}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Transaction Hash */}
                        {transaction.hash && (
                            <View style={styles.detailRow}>
                                <PaperText style={styles.detailLabel}>Transaction Hash</PaperText>
                                <TouchableOpacity 
                                    onPress={() => copyToClipboard(transaction.hash!, 'Transaction hash')}
                                    style={styles.addressContainer}
                                >
                                    <PaperText style={styles.detailValue}>
                                        {formatAddress(transaction.hash)}
                                    </PaperText>
                                    <IconButton
                                        icon="content-copy"
                                        size={16}
                                        iconColor={Color.colorRoyalblue100}
                                    />
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Transaction ID */}
                        <View style={styles.detailRow}>
                            <PaperText style={styles.detailLabel}>Transaction ID</PaperText>
                            <TouchableOpacity 
                                onPress={() => copyToClipboard(transaction.id, 'Transaction ID')}
                                style={styles.addressContainer}
                            >
                                <PaperText style={styles.detailValue}>
                                    {formatAddress(transaction.id)}
                                </PaperText>
                                <IconButton
                                    icon="content-copy"
                                    size={16}
                                    iconColor={Color.colorRoyalblue100}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Actions */}
                    <View style={styles.actionsSection}>
                        {transaction.hash && (
                            <PaperButton
                                mode="contained"
                                onPress={openInExplorer}
                                icon="open-in-new"
                                style={styles.explorerButton}
                                labelStyle={styles.explorerButtonLabel}
                            >
                                View on Snowtrace
                            </PaperButton>
                        )}
                    </View>
                </Card>
            </Modal>
        </Portal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        marginHorizontal: Padding.p_12,
        marginVertical: '15%',
        maxHeight: '70%',
    },
    card: {
        backgroundColor: Color.colorWhite,
        borderRadius: Border.br_16,
        elevation: 8,
        maxHeight: '100%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Padding.p_12,
        paddingTop: Padding.p_12,
        paddingBottom: Padding.p_8,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Color.colorRoyalblue200,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Gap.gap_12,
    },
    transactionIcon: {
        fontSize: 20,
    },
    headerText: {
        flex: 1,
    },
    title: {
        fontFamily: FontFamily.geist,
        fontWeight: 'bold',
        color: Color.colorGray100,
        fontSize: FontSize.size_14,
    },
    subtitle: {
        fontFamily: FontFamily.geist,
        color: Color.colorGray200,
        fontSize: FontSize.size_12,
        marginTop: 2,
    },
    divider: {
        marginHorizontal: Padding.p_12,
        marginVertical: Gap.gap_4,
    },
    amountSection: {
        alignItems: 'center',
        paddingVertical: Padding.p_12,
    },
    amountLabel: {
        fontFamily: FontFamily.geist,
        color: Color.colorGray200,
        fontSize: FontSize.size_12,
        marginBottom: Gap.gap_4,
    },
    amount: {
        fontFamily: FontFamily.geist,
        fontWeight: 'bold',
        fontSize: FontSize.size_20,
    },
    detailsSection: {
        paddingHorizontal: Padding.p_12,
        paddingBottom: Padding.p_8,
        gap: Gap.gap_12,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        minHeight: 32,
    },
    detailLabel: {
        fontFamily: FontFamily.geist,
        color: Color.colorGray200,
        fontWeight: '500',
        fontSize: FontSize.size_12,
        flex: 1,
        paddingTop: 2,
    },
    detailValue: {
        fontFamily: FontFamily.geist,
        color: Color.colorGray100,
        fontWeight: '500',
        fontSize: FontSize.size_12,
    },
    addressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1.5,
        justifyContent: 'flex-end',
    },
    statusChip: {
        height: 36,
        paddingHorizontal: 12,
        paddingVertical: 4,
    },
    statusChipText: {
        fontFamily: FontFamily.geist,
        color: Color.colorWhite,
        fontSize: FontSize.size_12,
        fontWeight: 'bold',
    },
    actionsSection: {
        paddingHorizontal: Padding.p_12,
        paddingBottom: Padding.p_12,
        paddingTop: Padding.p_8,
    },
    explorerButton: {
        backgroundColor: Color.colorRoyalblue100,
        borderRadius: Border.br_24,
        height: 44,
    },
    explorerButtonLabel: {
        fontFamily: FontFamily.geist,
        color: Color.colorWhite,
        fontWeight: 'bold',
        fontSize: FontSize.size_12,
    },
    recipientInfo: {
        flex: 1,
        marginRight: Gap.gap_4,
    },
    appUserBadge: {
        fontSize: 10,
        fontFamily: FontFamily.geist,
        color: Color.colorRoyalblue100,
        fontWeight: '600',
        marginTop: 2,
    },
});

export default TransactionDetailsModal; 