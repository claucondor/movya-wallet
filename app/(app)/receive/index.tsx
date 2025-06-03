import Clipboard from '@react-native-clipboard/clipboard';
import { ResizeMode, Video } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  Share,
  StyleSheet,
  View
} from 'react-native';
import {
  Appbar,
  ActivityIndicator as PaperActivityIndicator,
  Button as PaperButton,
  IconButton as PaperIconButton,
  Text as PaperText,
  TextInput as PaperTextInput,
  Portal,
  Snackbar,
  Surface,
  useTheme as usePaperTheme
} from 'react-native-paper';
import { SafeAreaView } from "react-native-safe-area-context";
import QRCode from 'react-native-qrcode-svg';
import { Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { storage } from '../../core/storage';
import { FontFamily, Color, Border, Gap, Padding, FontSize } from '../home/GlobalStyles';

const PRIVATE_KEY_STORAGE_KEY = 'userPrivateKey';

export default function ReceiveScreen() {
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarIsError, setSnackbarIsError] = useState(false);
  
  useEffect(() => {
    const loadAddress = () => {
      setIsLoading(true);
      setError(null);
      try {
        const pk = storage.getString(PRIVATE_KEY_STORAGE_KEY);
        if (!pk) {
          throw new Error('Private key not found in storage.');
        }
        const privateKeyHex = pk.startsWith('0x') ? pk as Hex : `0x${pk}` as Hex;
        const account = privateKeyToAccount(privateKeyHex);
        setAddress(account.address);
      } catch (err: any) {
        console.error("Failed to load address:", err);
        const msg = err.message || 'Failed to load wallet address.';
        setError(msg);
        setSnackbarMessage(msg);
        setSnackbarIsError(true);
        setSnackbarVisible(true);
      } finally {
        setIsLoading(false);
      }
    };
    loadAddress();
  }, []);

  const copyToClipboard = useCallback(async () => {
    if (address) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Clipboard.setString(address);
      setSnackbarMessage('Address copied to clipboard!');
      setSnackbarIsError(false);
      setSnackbarVisible(true);
    }
  }, [address]);

  const shareAddress = useCallback(async () => {
    if (address) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
        await Share.share({
          message: `My Movya wallet address: ${address}`,
        });
      } catch (shareError: any) {
        console.error("Share error:", shareError);
        setSnackbarMessage(shareError.message || 'Could not share address.');
        setSnackbarIsError(true);
        setSnackbarVisible(true);
      }
    }
  }, [address]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <Video
          source={require('../../../assets/bg/header-bg.webm')}
          style={styles.backgroundVideo}
          isLooping
          shouldPlay
          isMuted
          resizeMode={ResizeMode.COVER}
        />
        <View style={styles.loadingContainer}>
          <PaperActivityIndicator size="large" color={Color.colorWhite} />
          <PaperText variant="bodyLarge" style={styles.loadingText}>Loading your address...</PaperText>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !address) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <Video
          source={require('../../../assets/bg/header-bg.webm')}
          style={styles.backgroundVideo}
          isLooping
          shouldPlay
          isMuted
          resizeMode={ResizeMode.COVER}
        />
        <View style={styles.errorContainer}>
          <PaperIconButton icon="alert-circle-outline" size={48} iconColor={Color.colorWhite} />
          <PaperText variant="headlineSmall" style={styles.errorTitle}>
            Error Loading Address
          </PaperText>
          <PaperText variant="bodyMedium" style={styles.errorMessage}>{error}</PaperText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <Video
        source={require('../../../assets/bg/header-bg.webm')}
        style={styles.backgroundVideo}
        isLooping
        shouldPlay
        isMuted
        resizeMode={ResizeMode.COVER}
      />
      
      <Portal.Host>
        <View style={styles.content}>
          {/* Header Section with blue background */}
          <View style={styles.headerSection}>
            <Appbar.Header style={styles.appbarHeader}>
              <Appbar.BackAction onPress={() => router.back()} color={Color.colorWhite} />
              <Appbar.Content title="Receive Crypto" color={Color.colorWhite} titleStyle={styles.appbarTitle} />
              <View style={{ width: 48 }} />
            </Appbar.Header>

            {/* Simple subtitle in header */}
            <View style={styles.addressSection}>
              <PaperText variant="bodyMedium" style={styles.headerSubtitle}>
                Share your address to receive crypto
              </PaperText>
            </View>
          </View>

          {/* Main Content Section with white background */}
          <View style={styles.mainContent}>
            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formContainer}>
                {/* QR Code Section */}
                <View style={styles.qrSection}>
                  <View style={styles.qrWrapper}>
                    {address && (
                      <QRCode
                        value={address}
                        size={200}
                        backgroundColor={Color.colorWhite}
                        color="#000000"
                      />
                    )}
                  </View>
                  <PaperText variant="bodySmall" style={styles.qrDescription}>
                    Scan this QR code to get your wallet address
                  </PaperText>
                </View>

                {/* Address Input Section */}
                <View style={styles.addressInputSection}>
                  <PaperTextInput
                    mode="outlined"
                    label="Your Wallet Address"
                    value={address || ''}
                    editable={false}
                    style={styles.addressInput}
                    theme={{ 
                      colors: { 
                        primary: Color.colorRoyalblue100,
                        text: Color.colorGray100, 
                        placeholder: Color.colorGray200, 
                        outline: Color.colorGray400 
                      },
                      roundness: Border.br_16 
                    }}
                    right={<PaperTextInput.Icon icon="content-copy" onPress={copyToClipboard} color={Color.colorGray200}/>}
                  />
                </View>

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                  <PaperButton 
                    mode="outlined" 
                    icon="content-copy"
                    onPress={copyToClipboard}
                    style={styles.actionButtonOutlined}
                    labelStyle={styles.actionButtonLabelOutlined}
                  >
                    Copy
                  </PaperButton>
                  <PaperButton 
                    mode="contained" 
                    icon="share-variant"
                    onPress={shareAddress}
                    style={styles.actionButtonContained}
                    labelStyle={styles.actionButtonLabelContained}
                  >
                    Share
                  </PaperButton>
                </View>

                {/* Info Section */}
                <View style={styles.infoContainer}>
                  <PaperText variant="bodySmall" style={styles.infoText}>
                    💡 Share this address to receive AVAX and other tokens on the Avalanche network
                  </PaperText>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>

        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={Snackbar.DURATION_SHORT}
          style={snackbarIsError ? styles.snackbarError : styles.snackbarSuccess}
        >
          {snackbarMessage}
        </Snackbar>
      </Portal.Host>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.colorGray400,
  },
  backgroundVideo: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  content: {
    flex: 1,
    flexDirection: 'column',
  },
  headerSection: {
    paddingBottom: Padding.p_24,
  },
  appbarHeader: {
    backgroundColor: 'transparent',
    elevation: 0,
  },
  appbarTitle: {
    fontFamily: FontFamily.geist,
    fontSize: FontSize.size_20,
    fontWeight: 'bold',
  },
  addressSection: {
    paddingHorizontal: Padding.p_24,
    paddingTop: Padding.p_12,
    alignItems: 'center',
  },
  headerSubtitle: {
    fontFamily: FontFamily.geist,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontSize: FontSize.size_14,
  },
  mainContent: {
    flex: 1,
    backgroundColor: Color.colorWhite,
    borderTopLeftRadius: Border.br_32,
    borderTopRightRadius: Border.br_32,
    paddingTop: Padding.p_24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Padding.p_24,
    paddingBottom: Padding.p_24,
  },
  formContainer: {
    gap: Gap.gap_16,
  },
  qrSection: {
    alignItems: 'center',
    gap: Gap.gap_12,
  },
  qrWrapper: {
    backgroundColor: Color.colorWhite,
    padding: Padding.p_24,
    borderRadius: Border.br_16,
    shadowColor: Color.colorGray300,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  qrDescription: {
    fontFamily: FontFamily.geist,
    color: Color.colorGray200,
    textAlign: 'center',
  },
  addressInputSection: {
    gap: Gap.gap_4,
  },
  addressInput: {
    backgroundColor: Color.colorWhite,
    fontFamily: FontFamily.geist,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Gap.gap_12,
    marginTop: Gap.gap_12,
  },
  actionButtonOutlined: {
    flex: 1,
    borderColor: Color.colorRoyalblue100,
    borderRadius: Border.br_32,
    borderWidth: 1,
  },
  actionButtonLabelOutlined: {
    fontFamily: FontFamily.geist,
    color: Color.colorRoyalblue100,
    fontWeight: 'bold',
    fontSize: FontSize.size_14,
  },
  actionButtonContained: {
    flex: 1,
    backgroundColor: Color.colorRoyalblue100,
    borderRadius: Border.br_32,
    paddingVertical: Padding.p_4,
  },
  actionButtonLabelContained: {
    fontFamily: FontFamily.geist,
    color: Color.colorWhite,
    fontWeight: 'bold',
    fontSize: FontSize.size_14,
  },
  infoContainer: {
    paddingHorizontal: Padding.p_12,
    marginTop: Gap.gap_4,
  },
  infoText: {
    textAlign: 'center',
    fontFamily: FontFamily.geist,
    color: Color.colorGray200,
    lineHeight: 20,
  },
  // Loading and Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Padding.p_24,
  },
  loadingText: {
    marginTop: Gap.gap_16,
    fontFamily: FontFamily.geist,
    color: Color.colorWhite,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Padding.p_24,
  },
     errorTitle: {
     color: Color.colorWhite,
     marginTop: Gap.gap_16,
     marginBottom: Gap.gap_4,
     textAlign: 'center',
     fontFamily: FontFamily.geist,
     fontWeight: 'bold',
   },
  errorMessage: {
    textAlign: 'center',
    fontFamily: FontFamily.geist,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  // Snackbar
  snackbarError: {
    backgroundColor: '#B00020',
  },
  snackbarSuccess: {
    backgroundColor: '#4CAF50',
  },
}); 