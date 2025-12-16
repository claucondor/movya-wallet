import * as React from "react";
import { Image, StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Video, ResizeMode } from 'expo-av';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from "react-native-safe-area-context";
import 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Movyalogovector from "../../../assets/movyalogovector.svg"
import Sendicon from "../../../assets/sendicon.svg"
import Receiveicon from "../../../assets/receiveicon.svg"
import Addbutton from "../../../assets/addbutton.svg"
import Contactmock from "../../../assets/contactmock.svg"
import Contactmock1 from "../../../assets/contactmock.svg"
import Contactmock2 from "../../../assets/contactmock.svg"
import Contactmock3 from "../../../assets/contactmock.svg"
import Arrowright from "../../../assets/arrowright.svg"
import Fab from "../../../assets/fab.svg"
import Sendbutton from "../../../assets/sendbutton.svg"
import { Padding, Gap, FontFamily, Color, FontSize, Border } from "./GlobalStyles";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Portal, Modal, PaperProvider, Button as PaperButton, TextInput as PaperTextInput, IconButton } from 'react-native-paper';
import { addContactByAddress, addContactByEmail, getContacts, updateContact, deleteContact, Contact } from "../../internal/contactService";
import { storage } from "../../core/storage";
import AddContactForm from './AddContactForm';
import ContactDetailsModal from './ContactDetailsModal';
import EditContactModal from './EditContactModal';
import TransactionDetailsModal from './TransactionDetailsModal';
import PortfolioService, { PortfolioToken } from "../../core/services/portfolioService";
import TransactionHistoryService, { Transaction } from "../../core/services/transactionHistoryService";
import TransactionDetectionService from "../../core/services/transactionDetectionService";
import UserLookupService from "../../core/services/userLookupService";
// NOTE: Wrap/Unwrap not needed on Stacks - STX can interact with contracts directly
// import WrapUnwrapButton from "../../../components/WrapUnwrapButton";
import SwapButton from "../../../components/SwapButton";
// import WrapUnwrapModal from "../../../components/WrapUnwrapModal";

// Define ContactType if not already defined globally or in scope
type ContactType = 'address' | 'email';

// Helper function for initials
const getInitials = (nickname?: string, value?: string, type?: 'address' | 'email'): string => {
    const name = nickname?.trim() || "";
    if (!name) {
        if (type === 'email' && value && value.length >= 2) {
            return value.substring(0, 2).toUpperCase();
        }
        return "??"; // Default placeholder if no nickname and not a usable email value
    }

    const words = name.split(' ').filter(Boolean); // Filter out empty strings from multiple spaces

    if (words.length === 0) { // Should be caught by !name but as a safeguard
         if (type === 'email' && value && value.length >= 2) {
            return value.substring(0, 2).toUpperCase();
        }
        return "??";
    }

    if (words.length >= 2) {
        return (words[0][0] + (words[1][0] || '')).toUpperCase();
    }
    // Single word
    if (name.length === 1) {
        return (name[0] + name[0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

// Token placeholder component
const TokenPlaceholder = ({ symbol, size = 48 }: { symbol: string; size?: number }) => {
    const colors: Record<string, string> = {
        'STX': '#5546FF',
        'sBTC': '#F7931A',
        'aUSD': '#2775CA',
        'ALEX': '#FF6B35'
    };

    return (
        <View style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors[symbol] || '#999',
            justifyContent: 'center',
            alignItems: 'center'
        }}>
            <Text style={{
                color: '#FFFFFF',
                fontSize: size * 0.35,
                fontWeight: '700',
                fontFamily: 'Geist'
            }}>{symbol}</Text>
        </View>
    );
};

const Home = () => {
    const router = useRouter();
    const searchParams = useLocalSearchParams();
    const [isAddContactModalVisible, setIsAddContactModalVisible] = React.useState(false);
    
    // Removed form-specific states: contactType, nicknameText, contactValue. These are now in AddContactForm.
    const [isSavingContact, setIsSavingContact] = React.useState(false);

    // Contacts List State
    const [contacts, setContacts] = React.useState<Contact[]>([]);
    const [isLoadingContacts, setIsLoadingContacts] = React.useState(false);
    const [contactsError, setContactsError] = React.useState<string | null>(null);
    
    // Portfolio/Balance States
    const [portfolioTokens, setPortfolioTokens] = React.useState<PortfolioToken[]>([]);
    const [totalBalance, setTotalBalance] = React.useState<string>('$0.00');
    const [isLoadingBalances, setIsLoadingBalances] = React.useState(false);
    const [balancesError, setBalancesError] = React.useState<string | null>(null);

    // Store initial values for the form when modal opens
    const [initialFormState, setInitialFormState] = React.useState({
        contactType: 'address' as ContactType,
        nickname: '',
        contactValue: ''
    });

    // Contact Details Modal States
    const [isContactDetailsModalVisible, setIsContactDetailsModalVisible] = React.useState(false);
    const [selectedContact, setSelectedContact] = React.useState<Contact | null>(null);

    // Edit Contact Modal States
    const [isEditContactModalVisible, setIsEditContactModalVisible] = React.useState(false);
    const [contactToEdit, setContactToEdit] = React.useState<Contact | null>(null);
    const [isUpdatingContact, setIsUpdatingContact] = React.useState(false);

    // Transaction Details Modal States
    const [isTransactionDetailsModalVisible, setIsTransactionDetailsModalVisible] = React.useState(false);
    const [selectedTransaction, setSelectedTransaction] = React.useState<Transaction | null>(null);

    // Tab Management
    const [activeTab, setActiveTab] = React.useState<'assets' | 'history'>('assets');

    // Transaction History States
    const [transactions, setTransactions] = React.useState<Transaction[]>([]);
    const [historyFilter, setHistoryFilter] = React.useState<'all' | 'sent' | 'received' | 'swap'>('all');
    const [isLoadingHistory, setIsLoadingHistory] = React.useState(false);

    // Auto-refresh states
    const [lastKnownBalance, setLastKnownBalance] = React.useState<string>('$0.00');
    const [refreshInterval, setRefreshInterval] = React.useState<NodeJS.Timeout | null>(null);

    // Wrap/Unwrap Modal States - DISABLED: Not needed on Stacks
    // const [isWrapModalVisible, setIsWrapModalVisible] = React.useState(false);
    // const [wrapTokenSymbol, setWrapTokenSymbol] = React.useState<'AVAX' | 'WAVAX'>('AVAX');
    // const [wrapTokenBalance, setWrapTokenBalance] = React.useState('0');
    
    // Floating Menu State
    const [showFloatingMenu, setShowFloatingMenu] = React.useState(false);
    

    
    // User Data State
    const [userName, setUserName] = React.useState<string>('User');

    const loadContacts = async () => {
        setIsLoadingContacts(true);
        setContactsError(null);
        const userId = storage.getString('userId');
        if (!userId) {
            setContactsError('User ID not found. Cannot load contacts.');
            setIsLoadingContacts(false);
            setContacts([]); // Clear contacts if no user ID
            return;
        }
        try {
            const result = await getContacts(userId);
            if (result.success) {
                setContacts(result.contacts);
            } else {
                setContactsError(result.message || 'Failed to load contacts.');
                setContacts([]); // Clear contacts on error
            }
        } catch (error: any) {
            console.error("[Home] Error loading contacts:", error);
            setContactsError(error.message || 'An unexpected error occurred while loading contacts.');
            setContacts([]); // Clear contacts on exception
        } finally {
            setIsLoadingContacts(false);
        }
    };

    const loadPortfolio = async (isBackgroundRefresh = false) => {
        if (!isBackgroundRefresh) {
            setIsLoadingBalances(true);
        }
        setBalancesError(null);
        try {
            console.log('[Home] Loading portfolio...');
            const portfolio = await PortfolioService.getPortfolio('mainnet'); // Stacks mainnet
            
            const newBalance = `$${portfolio.totalValueUSD}`;
            
            // Check if balance changed (potential received transaction)
            if (lastKnownBalance !== '$0.00' && lastKnownBalance !== newBalance) {
                const oldValue = parseFloat(lastKnownBalance.replace('$', ''));
                const newValue = parseFloat(newBalance.replace('$', ''));
                
                if (newValue > oldValue) {
                    console.log('[Home] Balance increased! Potential incoming transaction detected');
                    // Reload transaction history to capture new received transactions
                    loadTransactionHistory();
                }
            }
            
            setPortfolioTokens(portfolio.tokens);
            setTotalBalance(newBalance);
            setLastKnownBalance(newBalance);
            
            console.log(`[Home] Portfolio loaded: ${portfolio.tokens.length} tokens, total: $${portfolio.totalValueUSD}`);
        } catch (error: any) {
            console.error('[Home] Error loading portfolio:', error);
            if (!isBackgroundRefresh) {
                setBalancesError(error.message || 'Failed to load portfolio data.');
                setPortfolioTokens([]);
                setTotalBalance('$0.00');
            }
        } finally {
            if (!isBackgroundRefresh) {
                setIsLoadingBalances(false);
            }
        }
    };

    const loadTransactionHistory = async () => {
        setIsLoadingHistory(true);
        try {
            console.log('[Home] Loading transaction history...');
            const historyService = TransactionHistoryService.getInstance();
            const allTransactions = await historyService.fetchTransactionHistory(50);
            setTransactions(allTransactions);
            console.log(`[Home] Loaded ${allTransactions.length} transactions`);
        } catch (error: any) {
            console.error('[Home] Error loading transaction history:', error);
            setTransactions([]);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    // --- Extract First Name Only ---
    const getFirstName = (fullName: string): string => {
        if (!fullName || fullName.trim() === '') {
            return 'User';
        }
        const nameParts = fullName.trim().split(' ');
        return nameParts[0] || 'User';
    };

    const loadUserName = async () => {
        try {
            const userId = storage.getString('userId');
            console.log('[Home] Loading user name for userId:', userId);
            
            if (userId) {
                // Try to get user profile from backend first
                const userLookupService = UserLookupService.getInstance();
                console.log('[Home] Calling getUserProfile...');
                const userProfile = await userLookupService.getUserProfile(userId);
                
                console.log('[Home] User profile response:', userProfile);
                
                if (userProfile && userProfile.name) {
                    const firstName = getFirstName(userProfile.name);
                    console.log('[Home] Setting user name from backend:', firstName);
                    setUserName(firstName);
                    // Store in local storage for faster subsequent loads
                    storage.set('userName', userProfile.name);
                } else {
                    // Fallback to storage or default
                    const storedName = storage.getString('userName');
                    const firstName = getFirstName(storedName || '');
                    console.log('[Home] Fallback to stored name:', firstName);
                    setUserName(firstName);
                }
            } else {
                console.log('[Home] No userId found, using default');
                setUserName('User');
            }
        } catch (error) {
            console.error('[Home] Error loading user name:', error);
            // Fallback to storage or default on error
            const storedName = storage.getString('userName');
            const firstName = getFirstName(storedName || '');
            console.log('[Home] Error fallback to stored name:', firstName);
            setUserName(firstName);
        }
    };

    React.useEffect(() => {
        loadContacts();
        loadPortfolio();
        loadTransactionHistory();
        loadUserName();
        initializeTransactionDetection();
    }, []); // Load contacts, portfolio, history and user name on mount

    const initializeTransactionDetection = async () => {
        try {
            const detectionService = TransactionDetectionService.getInstance();
            // Start monitoring with callback for new transactions
            detectionService.startMonitoring((tx) => {
                console.log(`[Home] 🎉 New incoming transaction detected: ${tx.tx_id}`);
                // Reload transaction history and portfolio to show new transaction
                loadTransactionHistory();
                loadPortfolio(true);
            });
            console.log('[Home] Transaction detection service initialized');
        } catch (error) {
            console.error('[Home] Error initializing transaction detection:', error);
        }
    };

    // Set up periodic balance refresh and transaction detection
    React.useEffect(() => {
        // Start auto-refresh every 60 seconds (detection service already polls at 30s)
        const interval = setInterval(async () => {
            console.log('[Home] Auto-refreshing portfolio...');
            loadPortfolio(true); // Background refresh
        }, 60000);

        // Start transaction detection
        initializeTransactionDetection();

        // Cleanup on unmount
        return () => {
            clearInterval(interval);
            // Stop transaction detection on unmount
            try {
                const detectionService = TransactionDetectionService.getInstance();
                detectionService.stopMonitoring();
            } catch (error) {
                console.error('[Home] Error stopping transaction detection:', error);
            }
        };
    }, []);

    // Cleanup interval when component unmounts
    React.useEffect(() => {
        return () => {
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
        };
    }, [refreshInterval]);

    // Load history when switching to history tab
    React.useEffect(() => {
        if (activeTab === 'history') {
            loadTransactionHistory();
        }
    }, [activeTab]);

    // Check for tab parameter from navigation (e.g., from chat)
    React.useEffect(() => {
        if (searchParams.tab === 'history') {
            setActiveTab('history');
        }
    }, [searchParams.tab]);

    // Helper function to get specific token data
    const getTokenData = (symbol: string) => {
        const token = portfolioTokens.find(t => t.symbol.toUpperCase() === symbol.toUpperCase());
        const hasBalance = token && parseFloat(token.balance) > 0;
        
        return {
            balance: token ? `$${token.valueUSD}` : '$0.00',
            amount: token ? token.balance : '0',
            change: token ? token.change24h : 0,
            symbol: token ? token.symbol : symbol,
            hasBalance,
            displayAmount: token ? `${token.balance} ${token.symbol}` : `0.0000 ${symbol}`,
            showDeposit: !hasBalance
        };
    };

    // Helper functions for transaction history
    const getFilteredTransactions = () => {
        if (historyFilter === 'all') return transactions;
        return transactions.filter(tx => tx.type === historyFilter);
    };

    const formatTransactionDate = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
        
        if (diffInHours < 24) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffInHours < 48) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    };

    const getTransactionIcon = (type: string) => {
        switch (type) {
            case 'sent': return '📤';
            case 'received': return '📥';
            case 'swap': return '🔄';
            case 'contract_call': return '📜';
            default: return '📊';
        }
    };

    const handleTransactionPress = (transaction: Transaction) => {
        setSelectedTransaction(transaction);
        setIsTransactionDetailsModalVisible(true);
    };

    const showAddContactModal = () => {
        setInitialFormState({ // Set initial state for the form component to reset it
            contactType: 'address',
            nickname: '',
            contactValue: ''
        });
        setIsSavingContact(false); // Reset saving state here as well
        setIsAddContactModalVisible(true);
    };
    const hideAddContactModal = () => setIsAddContactModalVisible(false);

    // Renamed from handleSaveContact to avoid confusion if we pass a similarly named prop
    const processSaveContact = async (nicknameFromForm: string, valueFromForm: string, typeFromForm: ContactType) => {
        // Validations remain here as they use Alert which is part of Home's UI concern
        if (!nicknameFromForm.trim()) {
            Alert.alert('Validation Error', 'Nickname is required.');
            return;
        }
        if (!valueFromForm.trim()) {
            Alert.alert('Validation Error', `${typeFromForm === 'address' ? 'Address' : 'Email'} is required.`);
            return;
        }
        if (typeFromForm === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(valueFromForm)) {
                Alert.alert('Validation Error', 'Please enter a valid email address.');
                return;
            }
        }
        const userId = storage.getString('userId');
        if (!userId) {
            Alert.alert('Authentication Error', 'User ID not found. Please log in again.');
            return;
        }
        setIsSavingContact(true);
        try {
            let result;
            if (typeFromForm === 'address') {
                result = await addContactByAddress(userId, nicknameFromForm.trim(), valueFromForm.trim());
            } else {
                result = await addContactByEmail(userId, nicknameFromForm.trim(), valueFromForm.trim());
            }
            if (result.success) {
                Alert.alert('Success', result.message || 'Contact added successfully!');
                hideAddContactModal();
                loadContacts();
            } else {
                Alert.alert('Error', result.message || 'Failed to add contact.');
            }
        } catch (error: any) {
            console.error("[Home] Error saving contact:", error);
            Alert.alert('Request Error', error.message || 'An unexpected error occurred.');
        } finally {
            setIsSavingContact(false);
        }
    };

    const handleChatNavigation = () => {
        router.push('/(app)/chat');
    };

    const handleSendToken = (tokenSymbol: 'STX' | 'sBTC' | 'USDA') => {
        const tokenData = getTokenData(tokenSymbol);

        if (tokenData.showDeposit) {
            // If no balance, suggest deposit first
            router.push({
                pathname: '/(app)/chat',
                params: {
                    autoMessage: `I want to get ${tokenSymbol} to start sending money`
                }
            });
        } else {
            // If has balance, start send flow
            router.push({
                pathname: '/(app)/chat',
                params: {
                    autoMessage: `I want to send ${tokenSymbol}`
                }
            });
        }
    };

    const handleSendNavigation = () => {
        router.push('/(app)/send');
    };

    const handleReceiveNavigation = () => {
        router.push('/(app)/receive');
    };

    const handleHistoryNavigation = () => {
        setActiveTab('history');
    };

    const handleAssetsNavigation = () => {
        setActiveTab('assets');
    };

    const handleRefreshData = async () => {
        console.log('[Home] Manual refresh triggered...');
        await Promise.all([loadContacts(), loadPortfolio(), loadTransactionHistory()]);
    };

    // Wrap/Unwrap Modal Handlers - DISABLED: Not needed on Stacks
    /*
    const handleWrapPress = (tokenSymbol: 'AVAX' | 'WAVAX') => {
        const tokenData = getTokenData(tokenSymbol);
        setWrapTokenSymbol(tokenSymbol);
        setWrapTokenBalance(tokenData.amount || '0');
        setIsWrapModalVisible(true);
    };

    const handleWrapSuccess = () => {
        // Refresh portfolio after successful wrap/unwrap
        loadPortfolio();
        loadTransactionHistory();
    };
    */

    const handleSwapPress = (tokenSymbol: 'STX' | 'sBTC' | 'USDA') => {
        console.log(`[Home] Swap ${tokenSymbol} pressed`);
        // Navigate to chat with swap message - let AI determine target token
        const swapMessage = `I want to swap ${tokenSymbol}`;

        router.push({
            pathname: '/(app)/chat',
            params: {
                autoMessage: swapMessage
            }
        });
    };

    // Contact Modal Handlers
    const handleContactPress = (contact: Contact) => {
        setSelectedContact(contact);
        setIsContactDetailsModalVisible(true);
    };

    const handleEditContact = (contact: Contact) => {
        setContactToEdit(contact);
        setIsEditContactModalVisible(true);
    };

    const handleDeleteContact = async (contact: Contact) => {
        const userId = storage.getString('userId');
        if (!userId || !contact.id) {
            Alert.alert('Error', 'No se pudo eliminar el contacto. Información faltante.');
            return;
        }

        try {
            const result = await deleteContact(userId, contact.id);
            if (result.success) {
                Alert.alert('Éxito', result.message);
                await loadContacts(); // Recargar la lista
            } else {
                Alert.alert('Error', result.message);
            }
        } catch (error: any) {
            Alert.alert('Error', `No se pudo eliminar el contacto: ${error.message}`);
        }
    };

    const handleSendToContact = (contact: Contact) => {
        // Navegar a la pantalla de envío con el contacto preseleccionado
        router.push({
            pathname: '/(app)/send',
            params: {
                recipientType: contact.type,
                recipientValue: contact.value,
                recipientNickname: contact.nickname
            }
        });
    };

    const handleChatWithContact = (contact: Contact) => {
        // Navegar al chat con información del contacto para la IA
        const contactMessage = contact.type === 'address' 
            ? `I want to send money to ${contact.nickname} (address: ${contact.value})`
            : `I want to send money to ${contact.nickname} (email: ${contact.value})`;
        
        router.push({
            pathname: '/(app)/chat',
            params: {
                autoMessage: contactMessage,
                contactNickname: contact.nickname,
                contactType: contact.type,
                contactValue: contact.value
            }
        });
    };

    const handleUpdateContact = async (contactId: string, nickname: string, value: string) => {
        const userId = storage.getString('userId');
        if (!userId) {
            throw new Error('Usuario no autenticado');
        }

        setIsUpdatingContact(true);
        try {
            const result = await updateContact(userId, contactId, nickname, value);
            if (result.success) {
                Alert.alert('Éxito', result.message);
                await loadContacts(); // Recargar la lista
                setIsEditContactModalVisible(false);
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            throw error; // Re-throw para que EditContactModal lo maneje
        } finally {
            setIsUpdatingContact(false);
        }
    };



    // Handle Floating Menu Options
    const handleFloatingMenuOption = (option: string) => {
        setShowFloatingMenu(false);
        switch (option) {
            case 'swap':
                router.push('/swap');
                break;
            case 'config':
                router.push('/(app)/settings');
                break;
            default:
                return;
        }
    };

    return (
        <SafeAreaView style={[styles.home, styles.homeLayout]}>
            <StatusBar style="light" />
			<Video
				source={require('../../../assets/bg/header-bg.webm')}
				style={styles.backgroundVideo}
				isLooping
				shouldPlay
				isMuted
				resizeMode={ResizeMode.COVER}
			/>
            <View style={styles.content}>
                <View style={[styles.topComponents, styles.componentsSpaceBlock]}>
                    <View style={styles.helloMessage}>
                        <View style={styles.userAvatarPlaceholder}>
                            <Image style={[styles.imageIcon, styles.homeLayout]} resizeMode="cover" />
                        </View>
                        <View style={styles.text}>
                            <Text style={[styles.hello, styles.helloTypo]}>Hello,</Text>
                            <View style={styles.text}>
                                <Text style={[styles.hello, styles.helloTypo]}>{userName}</Text>
                                <Text style={[styles.hello, styles.helloTypo]}>!</Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.helloMessage}>
                        <View style={[styles.balanceBox, styles.sendBg]}>
                            <View style={styles.content1}>
                                <Text style={styles.totalBalance}>Total Balance</Text>
                                <View style={styles.balanceContainer}>
                                    {isLoadingBalances ? (
                                        <ActivityIndicator size="small" color="#0461F0" />
                                    ) : (
                                        <Text 
                                            style={[styles.balanceValue, styles.helloTypo]} 
                                            adjustsFontSizeToFit={true}
                                            numberOfLines={1}
                                            minimumFontScale={0.5}
                                        >
                                            {totalBalance}
                                        </Text>
                                    )}
                                    {balancesError && (
                                        <Text style={styles.errorText}>Error loading balance</Text>
                                    )}
                                </View>
                            </View>
                            <Movyalogovector style={styles.movyaLogoVectorIcon} width={121} height={113} />
                        </View>
                        <View style={styles.actionButtons}>
                            <TouchableOpacity onPress={handleSendNavigation} style={styles.actionButtonTouchable}>
                                <View style={[styles.send, styles.tabFlexBox]}>
                                    <Sendicon style={styles.sendIcon} width={20} height={20} />
                                    <Text style={[styles.send1, styles.send1Typo]}>Send</Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleReceiveNavigation} style={styles.actionButtonTouchable}>
                                <View style={[styles.send, styles.tabFlexBox]}>
                                    <Receiveicon width={20} height={20} />
                                    <Text style={[styles.send1, styles.send1Typo]}>Receive</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                      <View style={styles.contactsSectionIfNone}>
                        <Text style={[styles.addContacts, styles.send1Typo]}>Add Contacts</Text>
                        <View style={styles.contactsMockContainer}>
                            <TouchableOpacity onPress={showAddContactModal}>
                                <Addbutton style={styles.addButtonIcon} width={32} height={32} />
                            </TouchableOpacity>
                            {isLoadingContacts ? (
                                <ActivityIndicator size="small" color={Color.colorWhite} style={styles.contactsLoader} />
                            ) : contactsError ? (
                                <Text style={styles.contactsErrorText}>{contactsError}</Text>
                            ) : (
                                <ScrollView 
                                    horizontal={true} 
                                    showsHorizontalScrollIndicator={false}
                                    style={styles.contactListScrollView}
                                    contentContainerStyle={styles.contactListContainer}
                                >
                                    {contacts.length > 0 ? (
                                        <View style={styles.contactIconsRow}>
                                            {contacts.map((contact, index) => (
                                                <TouchableOpacity 
                                                    key={contact.id || `contact-${index}`} 
                                                    style={styles.contactItemCircle}
                                                    onPress={() => handleContactPress(contact)}
                                                >
                                                    <Text style={styles.contactInitialsText}>
                                                        {getInitials(contact.nickname, contact.value, contact.type)}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    ) : (
                                        null 
                                    )}
                                </ScrollView>
                            )}
                        </View>
                    </View>
                </View>
                <View style={[styles.bottonComponents, styles.sendBg]}>
                    <View style={styles.tabs}>
                        <TouchableOpacity onPress={handleAssetsNavigation} style={[activeTab === 'assets' ? styles.tabActive : styles.tabInactive, styles.tabFlexBox]}>
                            <Text style={[activeTab === 'assets' ? styles.labelText : styles.labelText1, styles.labelLayout]}>Assets</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleHistoryNavigation} style={[activeTab === 'history' ? styles.tabActive : styles.tabInactive, styles.tabFlexBox]}>
                            <Text style={[activeTab === 'history' ? styles.labelText : styles.labelText1, activeTab === 'history' ? styles.labelLayout : styles.labelTypo]}>History</Text>
                        </TouchableOpacity>
                    </View>
                    
                    {activeTab === 'assets' ? (
                        // Assets View
                        <ScrollView style={styles.listingScrollView} contentContainerStyle={styles.listingContentContainer}>
                            <View style={styles.listing}>
                                {/* STX Token Card */}
                                <View style={[styles.assetCardMain, styles.buttonFlexBox]}>
                                    <View style={styles.assetCardContent}>
                                        <View style={styles.assetMainRow}>
                                            <View style={styles.asset}>
                                                <TokenPlaceholder symbol="STX" size={48} />
                                                <View style={styles.assetId}>
                                                    <Text style={[styles.assetName, styles.text2Typo]}>Stacks</Text>
                                                    <Text style={[styles.assetLetters, styles.labelTypo]}>STX</Text>
                                                </View>
                                            </View>
                                            <View style={styles.rightItems}>
                                                {isLoadingBalances ? (
                                                    <ActivityIndicator size="small" color="#0461F0" />
                                                ) : (
                                                    <View style={styles.tokenBalanceInfo}>
                                                        <Text style={[styles.text2, styles.text2Typo]}>{getTokenData('STX').balance}</Text>
                                                        <Text style={[styles.tokenAmount, styles.labelTypo]}>
                                                            {getTokenData('STX').displayAmount}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                        <View style={styles.assetActionsRow}>
                                            <TouchableOpacity onPress={() => handleSendToken('STX')} style={[styles.button, styles.buttonFlexBox]}>
                                                <Text style={styles.deposit}>
                                                    {getTokenData('STX').showDeposit ? 'Deposit' : 'Send'}
                                                </Text>
                                                <Arrowright style={styles.arrowRightIcon} width={12} height={12} />
                                            </TouchableOpacity>
                                            {!getTokenData('STX').showDeposit && (
                                                <SwapButton
                                                    tokenSymbol="STX"
                                                    onPress={() => handleSwapPress('STX')}
                                                />
                                            )}
                                        </View>
                                    </View>
                                </View>

                                {/* sBTC Token Card */}
                                <View style={[styles.assetCardMain, styles.buttonFlexBox]}>
                                    <View style={styles.assetCardContent}>
                                        <View style={styles.assetMainRow}>
                                            <View style={styles.asset}>
                                                <TokenPlaceholder symbol="sBTC" size={48} />
                                                <View style={styles.assetId}>
                                                    <Text style={[styles.assetName, styles.text2Typo]}>Synthetic Bitcoin</Text>
                                                    <Text style={[styles.assetLetters, styles.labelTypo]}>sBTC</Text>
                                                </View>
                                            </View>
                                            <View style={styles.rightItems}>
                                                {isLoadingBalances ? (
                                                    <ActivityIndicator size="small" color="#0461F0" />
                                                ) : (
                                                    <View style={styles.tokenBalanceInfo}>
                                                        <Text style={[styles.text2, styles.text2Typo]}>{getTokenData('sBTC').balance}</Text>
                                                        <Text style={[styles.tokenAmount, styles.labelTypo]}>
                                                            {getTokenData('sBTC').displayAmount}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                        <View style={styles.assetActionsRow}>
                                            <TouchableOpacity onPress={() => handleSendToken('sBTC')} style={[styles.button, styles.buttonFlexBox]}>
                                                <Text style={styles.deposit}>
                                                    {getTokenData('sBTC').showDeposit ? 'Deposit' : 'Send'}
                                                </Text>
                                                <Arrowright style={styles.arrowRightIcon} width={12} height={12} />
                                            </TouchableOpacity>
                                            {!getTokenData('sBTC').showDeposit && (
                                                <SwapButton
                                                    tokenSymbol="sBTC"
                                                    onPress={() => handleSwapPress('sBTC')}
                                                />
                                            )}
                                        </View>
                                    </View>
                                </View>

                                {/* USDA Token Card */}
                                <View style={[styles.assetCardMain, styles.buttonFlexBox]}>
                                    <View style={styles.assetCardContent}>
                                        <View style={styles.assetMainRow}>
                                            <View style={styles.asset}>
                                                <TokenPlaceholder symbol="USDA" size={48} />
                                                <View style={styles.assetId}>
                                                    <Text style={[styles.assetName, styles.text2Typo]}>USD Anchor</Text>
                                                    <Text style={[styles.assetLetters, styles.labelTypo]}>USDA</Text>
                                                </View>
                                            </View>
                                            <View style={styles.rightItems}>
                                                {isLoadingBalances ? (
                                                    <ActivityIndicator size="small" color="#0461F0" />
                                                ) : (
                                                    <View style={styles.tokenBalanceInfo}>
                                                        <Text style={[styles.text2, styles.text2Typo]}>{getTokenData('USDA').balance}</Text>
                                                        <Text style={[styles.tokenAmount, styles.labelTypo]}>
                                                            {getTokenData('USDA').displayAmount}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                        <View style={styles.assetActionsRow}>
                                            <TouchableOpacity onPress={() => handleSendToken('USDA')} style={[styles.button, styles.buttonFlexBox]}>
                                                <Text style={styles.deposit}>
                                                    {getTokenData('USDA').showDeposit ? 'Deposit' : 'Send'}
                                                </Text>
                                                <Arrowright style={styles.arrowRightIcon} width={12} height={12} />
                                            </TouchableOpacity>
                                            {!getTokenData('USDA').showDeposit && (
                                                <SwapButton
                                                    tokenSymbol="USDA"
                                                    onPress={() => handleSwapPress('USDA')}
                                                />
                                            )}
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </ScrollView>
                    ) : (
                        // History View
                        <View style={styles.historyContainer}>
                            {/* Filter Buttons */}
                            <View style={styles.historyFilters}>
                                <TouchableOpacity 
                                    onPress={() => setHistoryFilter('all')}
                                    style={[styles.filterButton, historyFilter === 'all' && styles.filterButtonActive]}
                                >
                                    <Text style={[styles.filterButtonText, historyFilter === 'all' && styles.filterButtonTextActive]}>All</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    onPress={() => setHistoryFilter('sent')}
                                    style={[styles.filterButton, historyFilter === 'sent' && styles.filterButtonActive]}
                                >
                                    <Text style={[styles.filterButtonText, historyFilter === 'sent' && styles.filterButtonTextActive]}>Sent</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setHistoryFilter('received')}
                                    style={[styles.filterButton, historyFilter === 'received' && styles.filterButtonActive]}
                                >
                                    <Text style={[styles.filterButtonText, historyFilter === 'received' && styles.filterButtonTextActive]}>Received</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setHistoryFilter('swap')}
                                    style={[styles.filterButton, historyFilter === 'swap' && styles.filterButtonActive]}
                                >
                                    <Text style={[styles.filterButtonText, historyFilter === 'swap' && styles.filterButtonTextActive]}>Swaps</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Transaction List */}
                            <ScrollView style={styles.transactionList} contentContainerStyle={styles.transactionListContent}>
                                {isLoadingHistory ? (
                                    <View style={styles.loadingContainer}>
                                        <ActivityIndicator size="large" color="#0461F0" />
                                        <Text style={styles.loadingText}>Loading transactions...</Text>
                                    </View>
                                ) : getFilteredTransactions().length === 0 ? (
                                    <View style={styles.emptyContainer}>
                                        <Text style={styles.emptyIcon}>📊</Text>
                                        <Text style={styles.emptyTitle}>No transactions found</Text>
                                        <Text style={styles.emptySubtitle}>
                                            {historyFilter === 'all' 
                                                ? 'Your transaction history will appear here' 
                                                : `No ${historyFilter} transactions found`}
                                        </Text>
                                    </View>
                                ) : (
                                    getFilteredTransactions().map((transaction, index) => (
                                        <TouchableOpacity
                                            key={transaction.txid}
                                            style={styles.transactionCard}
                                            onPress={() => handleTransactionPress(transaction)}
                                        >
                                            <View style={styles.transactionIcon}>
                                                <Text style={styles.transactionIconText}>{getTransactionIcon(transaction.type)}</Text>
                                            </View>
                                            <View style={styles.transactionDetails}>
                                                <View style={styles.transactionHeader}>
                                                    <Text style={styles.transactionType}>
                                                        {transaction.type === 'sent' ? 'Sent' :
                                                         transaction.type === 'received' ? 'Received' :
                                                         transaction.type === 'swap' ? 'Swap' :
                                                         transaction.type === 'contract_call' ? 'Contract' : 'Transaction'} {transaction.type === 'swap' && transaction.swapInfo ? `${transaction.swapInfo.fromToken} → ${transaction.swapInfo.toToken}` : transaction.currency}
                                                    </Text>
                                                    <Text style={[styles.transactionAmount, transaction.type === 'sent' ? styles.sentAmount : transaction.type === 'swap' ? styles.swapAmount : styles.receivedAmount]}>
                                                        {transaction.type === 'sent' ? '-' : transaction.type === 'swap' ? '⇄' : '+'}{transaction.amount} {transaction.currency}
                                                    </Text>
                                                </View>
                                                <View style={styles.transactionMeta}>
                                                    <Text style={styles.transactionTarget}>
                                                        {transaction.type === 'sent'
                                                            ? `To: ${transaction.recipient ? transaction.recipient.substring(0, 10) + '...' : 'Unknown'}`
                                                            : transaction.type === 'swap'
                                                            ? `Via: ALEX DEX`
                                                            : `From: ${transaction.sender ? transaction.sender.substring(0, 10) + '...' : 'Unknown'}`}
                                                    </Text>
                                                    <Text style={styles.transactionDate}>
                                                        {formatTransactionDate(transaction.timestamp)}
                                                    </Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    ))
                                )}
                            </ScrollView>
                        </View>
                    )}
                    <View style={styles.inputContainer}>
                        <View style={styles.carouselContainer}>
                            <ScrollView 
                                horizontal={true} 
                                showsHorizontalScrollIndicator={false}
                                style={styles.suggestionsScrollView}
                                contentContainerStyle={styles.suggestionsContainer}
                            >
                                <View style={styles.suggestionsRow}> 
                                    <View style={styles.suggestion}>
                                        <Text style={[styles.labelText2, styles.labelTypo]}>Send Money to a Friend</Text>
                                    </View>
                                    <View style={styles.suggestion}>
                                        <Text style={[styles.labelText2, styles.labelTypo]}>Send Money to a Wallet</Text>
                                    </View>
                                    <View style={styles.suggestion}>
                                        <Text style={[styles.labelText2, styles.labelTypo]}>How to send AVA?</Text>
                                    </View>
                                    <View style={styles.suggestion}>
                                        <Text style={[styles.labelText2, styles.labelTypo]}>Who are you?</Text>
                                    </View>
                                </View>
                            </ScrollView>
                            <LinearGradient
                                colors={['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 0)']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.fade, styles.leftFade]}
                                pointerEvents="none" 
                            />
                            <LinearGradient
                                colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 1)']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.fade, styles.rightFade]}
                                pointerEvents="none" 
                            />
                        </View>
                        <View style={styles.inputFabContainer}>
                            <TouchableOpacity 
                                style={styles.dollarButton}
                                onPress={() => setShowFloatingMenu(!showFloatingMenu)}
                            >
                                <Text style={styles.dollarButtonText}>$</Text>
                            </TouchableOpacity>
                            
                            {/* Floating Menu */}
                            {showFloatingMenu && (
                                <View style={styles.floatingMenu}>
                                    <TouchableOpacity 
                                        style={styles.floatingMenuItem}
                                        onPress={() => handleFloatingMenuOption('swap')}
                                    >
                                        <MaterialIcons name="swap-horiz" size={20} color="#0461F0" />
                                        <Text style={styles.floatingMenuText}>Swap</Text>
                                    </TouchableOpacity>
                                    <View style={styles.floatingMenuDivider} />
                                    <TouchableOpacity 
                                        style={styles.floatingMenuItem}
                                        onPress={() => handleFloatingMenuOption('config')}
                                    >
                                        <MaterialIcons name="settings" size={20} color="#666" />
                                        <Text style={styles.floatingMenuText}>Settings</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                            <TouchableOpacity onPress={handleChatNavigation} style={styles.chatInputTouchable}>
                                <View style={[styles.chatInputButton, styles.suggestionBorder]}>
                                    <View style={styles.textContainer}>
                                        <Text style={[styles.askMovya, styles.text2Typo]}>Ask Movya</Text>
                                    </View>
                                    <Sendbutton width={48} height={48} />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
            
            {/* Floating Menu Overlay */}
            {showFloatingMenu && (
                <TouchableOpacity 
                    style={styles.floatingMenuOverlay}
                    activeOpacity={1}
                    onPress={() => setShowFloatingMenu(false)}
                />
            )}
            
            <Portal>
                <Modal 
                    visible={isAddContactModalVisible} 
                    onDismiss={hideAddContactModal} 
                    contentContainerStyle={styles.modalFormWrapper}
                >
                    <AddContactForm 
                        initialContactType={initialFormState.contactType}
                        initialNickname={initialFormState.nickname}
                        initialContactValue={initialFormState.contactValue}
                        onSave={processSaveContact} 
                        onDismiss={hideAddContactModal} 
                        isSaving={isSavingContact} 
                    />
                </Modal>
                
                <ContactDetailsModal
                    visible={isContactDetailsModalVisible}
                    contact={selectedContact}
                    onDismiss={() => setIsContactDetailsModalVisible(false)}
                    onEdit={handleEditContact}
                    onDelete={handleDeleteContact}
                    onSend={handleSendToContact}
                    onChat={handleChatWithContact}
                />
                
                <EditContactModal
                    visible={isEditContactModalVisible}
                    contact={contactToEdit}
                    onDismiss={() => setIsEditContactModalVisible(false)}
                    onSave={handleUpdateContact}
                    isSaving={isUpdatingContact}
                />
                
                <TransactionDetailsModal
                    visible={isTransactionDetailsModalVisible}
                    transaction={selectedTransaction}
                    onDismiss={() => setIsTransactionDetailsModalVisible(false)}
                />

                {/* Wrap/Unwrap modal disabled - not needed on Stacks */}
                {/* <WrapUnwrapModal
                    visible={isWrapModalVisible}
                    onClose={() => setIsWrapModalVisible(false)}
                    tokenSymbol={wrapTokenSymbol}
                    currentBalance={wrapTokenBalance}
                    onSuccess={handleWrapSuccess}
                /> */}
            </Portal>
        </SafeAreaView>);
};

const styles = StyleSheet.create({
    homeLayout: {
        width: "100%",
        flex: 1
    },
    componentsSpaceBlock: {
        paddingHorizontal: Padding.p_24,
        gap: Gap.gap_12
    },
    helloTypo: {
        textAlign: "left",
        fontFamily: FontFamily.geist
    },
    sendBg: {
        backgroundColor: Color.colorWhite,
        alignSelf: "stretch"
    },
    tabFlexBox: {
        padding: Padding.p_12,
        justifyContent: "center",
        alignItems: "center"
    },
    send1Typo: {
        textAlign: "center",
        lineHeight: 20,
        letterSpacing: -0.1,
        fontSize: FontSize.size_12,
        fontFamily: FontFamily.geist
    },
    buttonIconLayout: {},
    labelLayout: {
        lineHeight: 16,
        letterSpacing: 0
    },
    suggestionBorder: {
        borderWidth: 1,
        borderStyle: "solid",
        flex: 1
    },
    labelTypo: {
        color: Color.colorGray100,
        fontSize: 11,
        textAlign: "left",
        fontFamily: FontFamily.geist
    },
    buttonFlexBox: {
        backgroundColor: Color.colorRoyalblue200,
        flexDirection: "row",
        alignItems: "center"
    },
    text2Typo: {
        fontSize: FontSize.size_14,
        color: Color.colorGray100,
        textAlign: "left",
        fontFamily: FontFamily.geist
    },
    assetCardShadowBox: {
        borderRadius: Border.br_12,
        shadowOpacity: 1,
        elevation: 20,
        shadowRadius: 20,
        shadowOffset: {
            width: 0,
            height: 0
        },
        shadowColor: Color.colorGray300,
        gap: 0,
        justifyContent: "space-between",
        padding: Padding.p_12,
        alignSelf: "stretch"
    },
    suggestionFlexBox: {
        padding: Padding.p_8,
        justifyContent: "center",
        alignItems: "center"
    },
    textTypo: {
        fontSize: FontSize.size_12,
        fontWeight: "700",
        textAlign: "left",
        fontFamily: FontFamily.geist
    },
    imageIcon: {
        height: "100%",
        top: "0%",
        right: "0%",
        bottom: "0%",
        left: "0%",
        borderRadius: 400,
        maxWidth: "100%",
        maxHeight: "100%",
        position: "absolute",
        overflow: "hidden"
    },
    userAvatarPlaceholder: {
        borderRadius: 100,
        width: 32,
        height: 32,
        overflow: "hidden"
    },
    hello: {
        fontSize: FontSize.size_20,
        lineHeight: 32,
        color: Color.colorWhite
    },
    text: {
        gap: Gap.gap_4,
        flexDirection: "row",
        alignItems: "center"
    },
    helloMessage: {
        flexDirection: "row",
        gap: Gap.gap_12,
        alignSelf: "stretch",
        alignItems: "center"
    },
    totalBalance: {
        opacity: 0.7,
        color: Color.colorRoyalblue100,
        letterSpacing: -0.1,
        fontSize: FontSize.size_12,
        textAlign: "left",
        fontFamily: FontFamily.geist,
        alignSelf: "stretch"
    },
    balanceValue: {
        fontSize: 28,
        fontWeight: "700",
        color: Color.colorRoyalblue100,
        alignSelf: "stretch"
    },
    content1: {
        zIndex: 0,
        justifyContent: "center",
        flex: 1
    },
    movyaLogoVectorIcon: {
        top: 17,
        left: 169,
        zIndex: 1,
        position: "absolute"
    },
    balanceBox: {
        borderRadius: 32,
        paddingLeft: Padding.p_24,
        paddingTop: Padding.p_12,
        paddingBottom: Padding.p_12,
        flexDirection: "row",
        gap: Gap.gap_12,
        alignItems: "center",
        overflow: "hidden",
        flex: 1
    },
    sendIcon: {},
    send1: {
        fontWeight: "700",
        color: Color.colorRoyalblue100
    },
    send: {
        borderRadius: Border.br_24,
        backgroundColor: Color.colorWhite,
        alignSelf: "stretch",
        overflow: "hidden"
    },
    actionButtonTouchable: {
        alignSelf: "stretch",
        borderRadius: Border.br_24,
    },
    actionButtons: {
        width: 85,
        gap: Gap.gap_12
    },
    addContacts: {
        fontWeight: "600",
        color: Color.colorWhite
    },
    contactsSectionIfNone: {
        justifyContent: "center",
        gap: Gap.gap_12,
        alignSelf: "stretch",
        paddingVertical: Padding.p_12,
        marginTop: Gap.gap_16,
    },
    contactsMockContainer: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "stretch",
        gap: Gap.gap_12,
    },
    addButtonIcon: {
        borderRadius: Border.br_16,
    },
    contactListScrollView: {
        flex: 1,
    },
    contactListContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    contactIconsRow: {
        flexDirection: "row",
        gap: Gap.gap_12,
    },
    contactItemCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    topComponents: {
        paddingVertical: 0,
        gap: Gap.gap_12,
        alignSelf: "stretch",
    },
    labelText: {
        fontWeight: "700",
        fontSize: FontSize.size_12,
        textAlign: "left",
        fontFamily: FontFamily.geist,
        color: Color.colorWhite
    },
    tabActive: {
        backgroundColor: Color.colorRoyalblue100,
        borderRadius: 25,
        flex: 1
    },
    labelText1: {
        lineHeight: 16,
        letterSpacing: 0
    },
    tabInactive: {
        borderColor: Color.colorGray400,
        borderWidth: 1,
        borderStyle: "solid",
        borderRadius: Border.br_20,
        padding: Padding.p_12,
        justifyContent: "center",
        alignItems: "center",
        flex: 1
    },
    tabs: {
        gap: Gap.gap_16,
        flexDirection: "row",
    },
    assetName: {
        fontWeight: "700",
        alignSelf: "stretch"
    },
    assetLetters: {
        alignSelf: "stretch"
    },
    assetId: {
        justifyContent: "center"
    },
    asset: {
        flexDirection: "row",
        gap: Gap.gap_12,
        alignItems: "center",
        flex: 1
    },
    text2: {
        fontWeight: "700"
    },
    deposit: {
        lineHeight: 20,
        fontWeight: "700",
        color: Color.colorRoyalblue100,
        letterSpacing: -0.1,
        fontSize: FontSize.size_12,
        textAlign: "left",
        fontFamily: FontFamily.geist
    },
    arrowRightIcon: {},
    button: {
        paddingLeft: Padding.p_12,
        paddingRight: Padding.p_8,
        gap: 2,
        borderRadius: 25
    },
    rightItems: {
        alignItems: "flex-end",
        gap: Gap.gap_4
    },
    assetCardMain: {
        borderRadius: Border.br_12,
        shadowOpacity: 1,
        elevation: 20,
        shadowRadius: 20,
        shadowOffset: {
            width: 0,
            height: 0
        },
        shadowColor: Color.colorGray300,
        gap: 0,
        justifyContent: "space-between",
        padding: Padding.p_12,
        alignSelf: "stretch"
    },
    text4: {
        opacity: 0.5,
        fontWeight: "700",
        color: Color.colorRoyalblue100
    },
    button1: {
        height: 24,
        borderRadius: Border.br_20,
        flexDirection: "row"
    },
    assetCard: {
        flexDirection: "row",
        alignItems: "center"
    },
    listing: {
        gap: Gap.gap_12,
        alignSelf: "stretch",
        alignItems: "center",
    },
    labelText2: {
        lineHeight: 14,
        letterSpacing: 0,
        textAlign: 'center',
    },
    suggestion: {
        borderRadius: Border.br_16,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: Color.colorGray400,
        paddingVertical: Padding.p_8,
        paddingHorizontal: Padding.p_12,
        justifyContent: "center",
        alignItems: "center",
    },
    fabIcon: {
        borderRadius: Border.br_16
    },
    askMovya: {
        letterSpacing: 1,
        lineHeight: 24,
        flex: 1,
        color: Color.colorGray200,
    },
    textContainer: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1
    },
    chatInputButton: {
        borderRadius: 64,
        borderColor: Color.colorGray200,
        paddingLeft: 16,
        borderWidth: 1,
        borderStyle: "solid",
        height: 56,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        flex: 1,
        backgroundColor: Color.colorWhite,
    },
    chatInputTouchable: {
        flex: 1,
        borderRadius: 64,
    },
    inputFabContainer: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "stretch",
        gap: Gap.gap_12
    },
    inputContainer: {
        alignSelf: "stretch",
        gap: Gap.gap_12,
    },
    bottonComponents: {
        backgroundColor: Color.colorWhite,
        alignSelf: "stretch",
        flex: 1,
        flexShrink: 1,
        flexDirection: "column",
        justifyContent: "space-between",
        borderTopLeftRadius: Border.br_32,
        borderTopRightRadius: Border.br_32,
        paddingHorizontal: Padding.p_12,
        paddingTop: Padding.p_24,
        paddingBottom: Padding.p_8,
    },
    content: {
        flex: 1,
        width: "100%",
        flexDirection: "column",
    },
    home: {
        flex: 1,
        backgroundColor: Color.colorGray400,
    },
    backgroundVideo: {
        ...StyleSheet.absoluteFillObject,
        zIndex: -1,
    },
    listingScrollView: {
        maxHeight: 250,
        width: "100%",
        flexShrink: 1,
    },
    listingContentContainer: {
        alignItems: "center",
        paddingBottom: Gap.gap_12,
    },
    suggestionsScrollView: {
        width: "100%",
        maxHeight: 60,
    },
    suggestionsContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: Padding.p_12,
    },
    suggestionsRow: {
        flexDirection: "row",
        gap: Gap.gap_4,
    },
    carouselContainer: {
        position: 'relative',
        width: "100%",
    },
    fade: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 30, 
        height: '100%',
    },
    leftFade: {
        left: 0,
    },
    rightFade: {
        right: 0,
    },
    dollarButton: {
        width: 56,
        height: 56,
        borderRadius: Border.br_16,
        backgroundColor: Color.colorRoyalblue100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dollarButtonText: {
        color: Color.colorWhite,
        fontSize: FontSize.size_20,
        fontWeight: 'bold',
        fontFamily: FontFamily.geist,
    },
    modalFormWrapper: {
        marginHorizontal: Padding.p_12,
    },
    contactsLoader: {
        marginLeft: Gap.gap_12,
    },
    contactsErrorText: {
        color: Color.colorWhite,
        fontFamily: FontFamily.geist,
        fontSize: FontSize.size_12,
        marginLeft: Gap.gap_12,
        flexShrink: 1,
    },
    contactInitialsText: {
        color: Color.colorRoyalblue100,
        fontFamily: FontFamily.geist,
        fontSize: FontSize.size_12,
        fontWeight: 'bold',
    },
    balanceContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: Gap.gap_4,
    },
    errorText: {
        color: Color.colorWhite,
        fontFamily: FontFamily.geist,
        fontSize: FontSize.size_12,
        marginLeft: Gap.gap_4,
    },
    tokenBalanceInfo: {
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 2,
    },
    tokenAmount: {
        fontSize: FontSize.size_12,
        fontWeight: "500",
        color: Color.colorGray200,
    },
    // History Styles
    historyContainer: {
        flex: 1,
        paddingHorizontal: Padding.p_12,
    },
    historyFilters: {
        flexDirection: 'row',
        gap: Gap.gap_4,
        marginTop: Gap.gap_16,
        marginBottom: Gap.gap_12,
    },
    filterButton: {
        paddingVertical: Padding.p_8,
        paddingHorizontal: Padding.p_12,
        borderRadius: Border.br_20,
        borderWidth: 1,
        borderColor: Color.colorGray300,
        backgroundColor: Color.colorWhite,
    },
    filterButtonActive: {
        backgroundColor: Color.colorRoyalblue100,
        borderColor: Color.colorRoyalblue100,
    },
    filterButtonText: {
        fontSize: FontSize.size_14,
        fontFamily: FontFamily.geist,
        color: Color.colorGray200,
        fontWeight: '500',
    },
    filterButtonTextActive: {
        color: Color.colorWhite,
        fontWeight: '600',
    },
    transactionList: {
        flex: 1,
    },
    transactionListContent: {
        paddingBottom: Gap.gap_16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: Padding.p_24,
    },
    loadingText: {
        marginTop: Gap.gap_12,
        fontSize: FontSize.size_14,
        fontFamily: FontFamily.geist,
        color: Color.colorGray200,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: Padding.p_24,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: Gap.gap_12,
    },
    emptyTitle: {
        fontSize: FontSize.size_20,
        fontFamily: FontFamily.geist,
        fontWeight: '600',
        color: Color.colorGray100,
        marginBottom: Gap.gap_4,
    },
    emptySubtitle: {
        fontSize: FontSize.size_14,
        fontFamily: FontFamily.geist,
        color: Color.colorGray200,
        textAlign: 'center',
    },
    transactionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Padding.p_12,
        backgroundColor: Color.colorWhite,
        borderRadius: Border.br_12,
        marginBottom: Gap.gap_4,
        shadowColor: Color.colorGray300,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    transactionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Color.colorGray400,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Gap.gap_12,
    },
    transactionIconText: {
        fontSize: 16,
    },
    transactionDetails: {
        flex: 1,
    },
    transactionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    transactionType: {
        fontSize: FontSize.size_14,
        fontFamily: FontFamily.geist,
        fontWeight: '600',
        color: Color.colorGray100,
    },
    transactionAmount: {
        fontSize: FontSize.size_14,
        fontFamily: FontFamily.geist,
        fontWeight: '700',
    },
    sentAmount: {
        color: '#FF6B6B',
    },
    receivedAmount: {
        color: '#51CF66',
    },
    swapAmount: {
        color: '#FFB347', // Orange for swap transactions
    },
    transactionMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    transactionTarget: {
        fontSize: FontSize.size_12,
        fontFamily: FontFamily.geist,
        color: Color.colorGray200,
        flex: 1,
        marginRight: Gap.gap_4,
    },
    transactionDate: {
        fontSize: FontSize.size_12,
        fontFamily: FontFamily.geist,
        color: Color.colorGray200,
    },
    // New Asset Card Layout Styles
    assetCardContent: {
        flex: 1,
        gap: Gap.gap_4,
    },
    assetMainRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    assetActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: Gap.gap_4,
    },
    floatingMenu: {
        position: 'absolute',
        bottom: 70,
        left: 0,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
        paddingVertical: 8,
        minWidth: 120,
        zIndex: 1000,
    },
    floatingMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 10,
    },
    floatingMenuText: {
        fontSize: 16,
        fontFamily: FontFamily.geist,
        fontWeight: '500',
        color: '#333',
    },
    floatingMenuDivider: {
        height: 1,
        backgroundColor: '#E8E8E8',
        marginVertical: 4,
        marginHorizontal: 16,
    },
    floatingMenuOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent',
        zIndex: 999,
    },
});

export default Home;
