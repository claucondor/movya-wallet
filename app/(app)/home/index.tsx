import * as React from "react";
import { Image, StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
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
import Usdcvector from "../../../assets/usdclogo.svg"
import Arrowright from "../../../assets/arrowright.svg"
import Avavector from "../../../assets/avalogo.svg"
import Fab from "../../../assets/fab.svg"
import Sendbutton from "../../../assets/sendbutton.svg"
import { Padding, Gap, FontFamily, Color, FontSize, Border } from "./GlobalStyles";
import { useRouter } from "expo-router";
import { Portal, Modal, PaperProvider, Button as PaperButton, TextInput as PaperTextInput, IconButton } from 'react-native-paper';
import { addContactByAddress, addContactByEmail, getContacts, updateContact, deleteContact, Contact } from "../../internal/contactService";
import { storage } from "../../core/storage";
import AddContactForm from './AddContactForm';
import ContactDetailsModal from './ContactDetailsModal';
import EditContactModal from './EditContactModal';
import PortfolioService, { PortfolioToken } from "../../core/services/portfolioService";

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

const Home = () => {
    const router = useRouter();
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

    const loadPortfolio = async () => {
        setIsLoadingBalances(true);
        setBalancesError(null);
        try {
            console.log('[Home] Loading portfolio...');
            const portfolio = await PortfolioService.getPortfolio(43114); // Avalanche mainnet
            
            setPortfolioTokens(portfolio.tokens);
            setTotalBalance(`$${portfolio.totalValueUSD}`);
            
            console.log(`[Home] Portfolio loaded: ${portfolio.tokens.length} tokens, total: $${portfolio.totalValueUSD}`);
        } catch (error: any) {
            console.error('[Home] Error loading portfolio:', error);
            setBalancesError(error.message || 'Failed to load portfolio data.');
            setPortfolioTokens([]);
            setTotalBalance('$0.00');
        } finally {
            setIsLoadingBalances(false);
        }
    };

    React.useEffect(() => {
        loadContacts();
        loadPortfolio();
    }, []); // Load contacts and portfolio on mount

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

    const handleSendNavigation = () => {
        router.push('/(app)/send');
    };

    const handleReceiveNavigation = () => {
        router.push('/(app)/receive');
    };

    const handleRefreshData = async () => {
        console.log('[Home] Refreshing data...');
        await Promise.all([loadContacts(), loadPortfolio()]);
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
                                <Text style={[styles.hello, styles.helloTypo]}>UserName</Text>
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
                        <View style={[styles.tabActive, styles.tabFlexBox]}>
                            <Text style={[styles.labelText, styles.labelLayout]}>Assets</Text>
                        </View>
                        <View style={[styles.tabInactive, styles.suggestionBorder]}>
                            <Text style={[styles.labelText1, styles.labelTypo]}>History</Text>
                        </View>
                    </View>
                    <ScrollView style={styles.listingScrollView} contentContainerStyle={styles.listingContentContainer}>
                        <View style={styles.listing}>
                            <View style={[styles.assetCardMain, styles.buttonFlexBox]}>
                                <View style={styles.asset}>
                                    <Usdcvector style={styles.buttonIconLayout} width={48} height={48} />
                                    <View style={styles.assetId}>
                                        <Text style={[styles.assetName, styles.text2Typo]}>USD Coin</Text>
                                        <Text style={[styles.assetLetters, styles.labelTypo]}>USDC</Text>
                                    </View>
                                </View>
                                <View style={styles.rightItems}>
                                    {isLoadingBalances ? (
                                        <ActivityIndicator size="small" color="#0461F0" />
                                    ) : (
                                        <View style={styles.tokenBalanceInfo}>
                                            <Text style={[styles.text2, styles.text2Typo]}>{getTokenData('USDC').balance}</Text>
                                            <Text style={[styles.tokenAmount, styles.labelTypo]}>
                                                {getTokenData('USDC').displayAmount}
                                            </Text>
                                        </View>
                                    )}
                                    <View style={[styles.button, styles.buttonFlexBox]}>
                                        <Text style={styles.deposit}>
                                            {getTokenData('USDC').showDeposit ? 'Deposit' : 'Send'}
                                        </Text>
                                        <Arrowright style={styles.arrowRightIcon} width={12} height={12} />
                                    </View>
                                </View>
                            </View>
                            <View style={[styles.assetCardMain, styles.buttonFlexBox]}>
                                <View style={styles.asset}>
                                    <Avavector width={48} height={48} />
                                    <View style={styles.assetId}>
                                        <Text style={[styles.assetName, styles.text2Typo]}>AVAX</Text>
                                        <Text style={[styles.assetLetters, styles.labelTypo]}>AVA</Text>
                                    </View>
                                </View>
                                <View style={styles.rightItems}>
                                    {isLoadingBalances ? (
                                        <ActivityIndicator size="small" color="#0461F0" />
                                    ) : (
                                        <View style={styles.tokenBalanceInfo}>
                                            <Text style={[styles.text2, styles.text2Typo]}>{getTokenData('AVAX').balance}</Text>
                                            <Text style={[styles.tokenAmount, styles.labelTypo]}>
                                                {getTokenData('AVAX').displayAmount}
                                            </Text>
                                        </View>
                                    )}
                                    <View style={[styles.button, styles.buttonFlexBox]}>
                                        <Text style={styles.deposit}>
                                            {getTokenData('AVAX').showDeposit ? 'Deposit' : 'Send'}
                                        </Text>
                                        <Arrowright style={styles.arrowRightIcon} width={12} height={12} />
                                    </View>
                                </View>
                            </View>
                        </View>
                    </ScrollView>
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
                            <View style={styles.dollarButton}>
                                <Text style={styles.dollarButtonText}>$</Text>
                            </View>
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
        alignItems: "center"
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
});

export default Home;
