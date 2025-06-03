import * as React from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
    Share,
    Clipboard,
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from "expo-router";
import { storage } from "../core/storage";
import UserLookupService from "../core/services/userLookupService";
import { getWalletAddress } from "../internal/walletService";

const Settings = () => {
    const router = useRouter();
    const [videoLoaded, setVideoLoaded] = React.useState(false);
    const [userName, setUserName] = React.useState<string>('User');
    const [userEmail, setUserEmail] = React.useState<string>('');
    const [userId, setUserId] = React.useState<string>('');
    const [walletAddress, setWalletAddress] = React.useState<string>('');

    // --- Extract First Name Only ---
    const getFirstName = React.useCallback((fullName: string): string => {
        if (!fullName || fullName.trim() === '') {
            return 'User';
        }
        const nameParts = fullName.trim().split(' ');
        return nameParts[0] || 'User';
    }, []);

    // --- Load User Data ---
    const loadUserData = React.useCallback(async () => {
        try {
            const storedUserId = storage.getString('userId');
            
            setUserId(storedUserId || '');
            
            // Get wallet address using walletService
            const address = await getWalletAddress();
            setWalletAddress(address || '');
            
            if (storedUserId) {
                // Try to get user profile from backend
                const userLookupService = UserLookupService.getInstance();
                const userProfile = await userLookupService.getUserProfile(storedUserId);
                
                if (userProfile && userProfile.name) {
                    const firstName = getFirstName(userProfile.name);
                    setUserName(firstName);
                    setUserEmail(userProfile.email || '');
                } else {
                    // Fallback to storage
                    const storedName = storage.getString('userName');
                    const firstName = getFirstName(storedName || '');
                    setUserName(firstName);
                    setUserEmail(storage.getString('userEmail') || '');
                }
            }
        } catch (error) {
            console.error('[Settings] Error loading user data:', error);
            // Fallback to storage
            const storedName = storage.getString('userName');
            const firstName = getFirstName(storedName || '');
            setUserName(firstName);
            setUserEmail(storage.getString('userEmail') || '');
            
            // Still try to get wallet address
            try {
                const address = await getWalletAddress();
                setWalletAddress(address || '');
            } catch (walletError) {
                console.error('[Settings] Error loading wallet address:', walletError);
            }
        }
    }, [getFirstName]);

    // --- Handle Export Private Key ---
    const handleExportPrivateKey = React.useCallback(() => {
        Alert.alert(
            'Export Private Key',
            'Your private key gives complete access to your wallet. Never share it with anyone. How would you like to export it?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Copy to Clipboard', 
                    onPress: () => {
                        const privateKey = storage.getString('userPrivateKey');
                        if (privateKey) {
                            Clipboard.setString(privateKey);
                            Alert.alert('Success', 'Private key copied to clipboard');
                        } else {
                            Alert.alert('Error', 'No private key found');
                        }
                    }
                },
                { 
                    text: 'Share', 
                    style: 'destructive',
                    onPress: () => {
                        const privateKey = storage.getString('userPrivateKey');
                        if (privateKey) {
                            Share.share({
                                message: privateKey,
                                title: 'Wallet Private Key'
                            });
                        } else {
                            Alert.alert('Error', 'No private key found');
                        }
                    }
                }
            ]
        );
    }, []);

    // --- Handle Copy Address ---
    const handleCopyAddress = React.useCallback(() => {
        if (walletAddress) {
            Clipboard.setString(walletAddress);
            Alert.alert('Success', 'Wallet address copied to clipboard');
        }
    }, [walletAddress]);

    // --- Handle Share Address ---
    const handleShareAddress = React.useCallback(() => {
        if (walletAddress) {
            Share.share({
                message: walletAddress,
                title: 'My Wallet Address'
            });
        }
    }, [walletAddress]);

    // --- Handle About ---
    const handleAbout = React.useCallback(() => {
        Alert.alert(
            'About Movya',
            'Movya Wallet v1.0.0\n\nA modern crypto wallet powered by AI assistance for seamless transactions on Avalanche network.',
            [{ text: 'OK' }]
        );
    }, []);

    // --- Handle Support ---
    const handleSupport = React.useCallback(() => {
        Alert.alert(
            'Support',
            'Need help? Contact our support team or visit our documentation.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Contact Support', onPress: () => console.log('Contact support') },
                { text: 'Documentation', onPress: () => console.log('Open docs') }
            ]
        );
    }, []);

    React.useEffect(() => {
        loadUserData();
    }, [loadUserData]);

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <StatusBar style="light" />
            
            {/* Background Gradient Fallback */}
            {!videoLoaded && (
                <LinearGradient
                    colors={['#0461F0', '#0477F0', '#0461F0']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.backgroundGradient}
                />
            )}
            
            {/* Background Video */}
            <Video
                source={require('../../assets/bg/header-bg.webm')}
                style={[styles.backgroundVideo, { opacity: videoLoaded ? 1 : 0 }]}
                isLooping
                shouldPlay={true}
                isMuted
                resizeMode={ResizeMode.COVER}
                onLoad={() => setVideoLoaded(true)}
                onError={() => setVideoLoaded(false)}
                onReadyForDisplay={() => setVideoLoaded(true)}
            />
            
            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <MaterialIcons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>Settings</Text>
                        <Text style={styles.headerSubtitle}>Account & Preferences</Text>
                    </View>
                    <View style={styles.headerRight} />
                </View>

                {/* Content */}
                <View style={styles.contentContainer}>
                    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                        
                        {/* User Profile Section */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Profile</Text>
                            </View>
                            
                            <View style={styles.profileCard}>
                                <View style={styles.profileHeader}>
                                    <View style={styles.avatarContainer}>
                                        <LinearGradient
                                            colors={['#0461F0', '#9CCAFF']}
                                            style={styles.avatar}
                                        >
                                            <Text style={styles.avatarText}>
                                                {userName.charAt(0).toUpperCase()}
                                            </Text>
                                        </LinearGradient>
                                    </View>
                                    <View style={styles.profileInfo}>
                                        <View style={styles.nameContainer}>
                                            <MaskedView
                                                style={styles.maskedView}
                                                maskElement={
                                                    <Text style={styles.profileName}>{userName}</Text>
                                                }>
                                                <LinearGradient
                                                    colors={['#0461F0', '#9CCAFF']}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 0 }}
                                                    style={styles.nameGradient}
                                                >
                                                    <Text style={[styles.profileName, { opacity: 0 }]}>{userName}</Text>
                                                </LinearGradient>
                                            </MaskedView>
                                        </View>
                                        {userEmail ? (
                                            <Text style={styles.profileEmail}>{userEmail}</Text>
                                        ) : null}
                                    </View>
                                </View>
                                
                                {/* Wallet Address */}
                                <View style={styles.addressContainer}>
                                    <Text style={styles.addressLabel}>Wallet Address</Text>
                                    <View style={styles.addressRow}>
                                        <Text style={styles.addressText} numberOfLines={1}>
                                            {walletAddress ? `${walletAddress.substring(0, 10)}...${walletAddress.substring(walletAddress.length - 8)}` : 'No address found'}
                                        </Text>
                                        <View style={styles.addressActions}>
                                            <TouchableOpacity onPress={handleCopyAddress} style={styles.addressAction}>
                                                <MaterialIcons name="content-copy" size={18} color="#0461F0" />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={handleShareAddress} style={styles.addressAction}>
                                                <MaterialIcons name="share" size={18} color="#0461F0" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Security Section */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Security</Text>
                            </View>
                            
                            <View style={styles.card}>
                                <TouchableOpacity onPress={handleExportPrivateKey} style={styles.settingItem}>
                                    <View style={styles.settingLeft}>
                                        <View style={[styles.settingIcon, { backgroundColor: '#FF6B6B' }]}>
                                            <MaterialIcons name="key" size={20} color="#FFF" />
                                        </View>
                                        <View style={styles.settingContent}>
                                            <Text style={styles.settingTitle}>Export Private Key</Text>
                                            <Text style={styles.settingDescription}>Back up your wallet's private key</Text>
                                        </View>
                                    </View>
                                    <MaterialIcons name="chevron-right" size={24} color="#666" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* General Section */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>General</Text>
                            </View>
                            
                            <View style={styles.card}>
                                <TouchableOpacity onPress={handleAbout} style={styles.settingItem}>
                                    <View style={styles.settingLeft}>
                                        <View style={[styles.settingIcon, { backgroundColor: '#51CF66' }]}>
                                            <MaterialIcons name="info" size={20} color="#FFF" />
                                        </View>
                                        <View style={styles.settingContent}>
                                            <Text style={styles.settingTitle}>About Movya</Text>
                                            <Text style={styles.settingDescription}>App version and information</Text>
                                        </View>
                                    </View>
                                    <MaterialIcons name="chevron-right" size={24} color="#666" />
                                </TouchableOpacity>
                                
                                <View style={styles.divider} />
                                
                                <TouchableOpacity onPress={handleSupport} style={styles.settingItem}>
                                    <View style={styles.settingLeft}>
                                        <View style={[styles.settingIcon, { backgroundColor: '#4DABF7' }]}>
                                            <MaterialIcons name="help" size={20} color="#FFF" />
                                        </View>
                                        <View style={styles.settingContent}>
                                            <Text style={styles.settingTitle}>Support</Text>
                                            <Text style={styles.settingDescription}>Get help and documentation</Text>
                                        </View>
                                    </View>
                                    <MaterialIcons name="chevron-right" size={24} color="#666" />
                                </TouchableOpacity>
                            </View>
                        </View>

                    </ScrollView>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    backgroundVideo: {
        ...StyleSheet.absoluteFillObject,
        zIndex: -1,
    },
    backgroundGradient: {
        ...StyleSheet.absoluteFillObject,
        zIndex: -2,
    },
    content: {
        flex: 1,
        width: "100%",
    },
    header: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        padding: 8,
        width: 48,
        alignItems: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 24,
        lineHeight: 30,
        fontWeight: '700',
        fontFamily: 'Geist',
        textAlign: 'center',
        color: '#fff',
        marginBottom: 2,
    },
    headerSubtitle: {
        color: '#e7e0ec',
        fontFamily: 'Geist',
        fontWeight: '500',
        lineHeight: 16,
        letterSpacing: 1,
        fontSize: 12,
        textAlign: 'center',
    },
    headerRight: {
        width: 48,
    },
    contentContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        flex: 1,
        paddingTop: 24,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 32,
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        fontFamily: 'Geist',
        color: '#333',
        marginBottom: 4,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    profileCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatarContainer: {
        marginRight: 16,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        fontFamily: 'Geist',
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 24,
        fontWeight: '700',
        fontFamily: 'Geist',
        marginBottom: 4,
    },
    profileEmail: {
        fontSize: 16,
        fontFamily: 'Geist',
        color: '#666',
        fontWeight: '500',
    },
    addressContainer: {
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        paddingTop: 16,
    },
    addressLabel: {
        fontSize: 14,
        fontWeight: '600',
        fontFamily: 'Geist',
        color: '#666',
        marginBottom: 8,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    addressText: {
        fontSize: 16,
        fontFamily: 'Geist',
        color: '#333',
        fontWeight: '500',
        flex: 1,
        marginRight: 12,
    },
    addressActions: {
        flexDirection: 'row',
        gap: 8,
    },
    addressAction: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#F8F9FA',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    settingIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    settingContent: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'Geist',
        color: '#333',
        marginBottom: 2,
    },
    settingDescription: {
        fontSize: 14,
        fontFamily: 'Geist',
        color: '#666',
        lineHeight: 18,
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginHorizontal: 16,
    },
    nameContainer: {
        marginBottom: 4,
    },
    maskedView: {
        height: 28,
        alignSelf: 'flex-start',
    },
    nameGradient: {
        flex: 1,
        height: '100%',
    },
});

export default Settings; 