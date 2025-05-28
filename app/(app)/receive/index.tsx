import Clipboard from '@react-native-clipboard/clipboard';
import { ResizeMode, Video } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Platform,
  StatusBar as ReactNativeStatusBar,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View
} from 'react-native';
import {
  Card,
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
      <Surface style={[styles.container, styles.center, {backgroundColor: Color.colorGray400}]}>
        <PaperActivityIndicator size="large" color={Color.colorRoyalblue100} />
        <PaperText variant="bodyLarge" style={{marginTop: 16, fontFamily: FontFamily.geist, color: Color.colorGray100}}>Loading your address...</PaperText>
      </Surface>
    );
  }

  if (error && !address) {
    return (
      <Surface style={[styles.container, styles.center, {backgroundColor: Color.colorGray400}]}>
        <PaperIconButton icon="alert-circle-outline" size={48} iconColor={Color.colorRoyalblue100} />
        <PaperText variant="headlineSmall" style={{color: Color.colorRoyalblue100, marginTop: 16, marginBottom: 8, textAlign: 'center', fontFamily: FontFamily.geist}}>
          Error Loading Address
        </PaperText>
        <PaperText variant="bodyMedium" style={{textAlign: 'center', paddingHorizontal: 20, fontFamily: FontFamily.geist, color: Color.colorGray200}}>{error}</PaperText>
      </Surface>
    );
  }

  return (
    <Portal.Host>
      <View style={styles.container}>
        <StatusBar style="light" translucent={true} backgroundColor="transparent"/>
        
        <Video
          source={require('@/assets/bg/start-screen-bg.mp4')}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          isLooping
          shouldPlay
          isMuted
        />

        <LinearGradient
          colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.05)']}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.safeTopArea} />
        
        <View style={styles.topBar}>
          <View style={styles.backButtonContainer}>
            <PaperIconButton
              icon="arrow-left"
              size={24}
              onPress={() => router.back()}
              iconColor={Color.colorWhite}
              style={styles.backButton}
            />
          </View>
        </View>
        
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>Receive Crypto</Text>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.qrWrapper}>
            <View style={styles.qrBackground}>
              {address && (
                <QRCode
                  value={address}
                  size={220}
                  backgroundColor={Color.colorWhite}
                  color="#000000"
                />
              )}
            </View>
          </View>

          <Card style={styles.addressCard}>
            <Card.Content>
              <PaperText variant="titleMedium" style={styles.addressLabel}>
                Your Wallet Address
              </PaperText>
              <PaperTextInput
                mode="outlined"
                value={address ? `${address.slice(0, 10)}...${address.slice(-8)}` : ''}
                editable={false}
                style={styles.addressTextContainer}
                contentStyle={styles.addressTextInputContent}
                theme={{ 
                  colors: { 
                    primary: Color.colorRoyalblue100,
                    text: Color.colorWhite, 
                    placeholder: 'rgba(255,255,255,0.7)', 
                    outline: 'rgba(255,255,255,0.3)' 
                  },
                  roundness: Border.br_16 
                }}
                right={<PaperTextInput.Icon icon="content-copy" onPress={copyToClipboard} color={Color.colorWhite}/>}
              />
            </Card.Content>
          </Card>

          <View style={styles.buttonContainer}>
            <PaperButton 
              mode="outlined" 
              icon="content-copy"
              onPress={copyToClipboard}
              style={styles.actionButtonOutlined}
              labelStyle={styles.actionButtonLabelOutlined}
              rippleColor={Color.colorRoyalblue200}
              compact={true}
            >
              Copy Address
            </PaperButton>
            <PaperButton 
              mode="contained" 
              icon="share-variant"
              onPress={shareAddress}
              style={styles.actionButtonContained}
              labelStyle={styles.actionButtonLabelContained}
              rippleColor={Color.colorWhite}
              compact={true}
            >
              Share Address
            </PaperButton>
          </View>
        </ScrollView>

        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={Snackbar.DURATION_SHORT}
          style={snackbarIsError ? styles.snackbarError : styles.snackbarSuccess}
          action={{
            label: 'OK',
            onPress: () => setSnackbarVisible(false),
          }}
        >
          <PaperText style={{color: Color.colorWhite, fontFamily: FontFamily.geist}}>
            {snackbarMessage}
          </PaperText>
        </Snackbar>
      </View>
    </Portal.Host>
  );
}

const styles = StyleSheet.create({
  snackbarError: {
    backgroundColor: '#B00020',
  },
  snackbarSuccess: {
    backgroundColor: '#4CAF50',
  },
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Padding.p_24,
  },
  safeTopArea: {
    height: Platform.OS === 'ios' ? 50 : ReactNativeStatusBar.currentHeight || 0,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Padding.p_12,
    paddingTop: Padding.p_12,
  },
  backButtonContainer: {
  },
  backButton: {
  },
  titleContainer: {
    alignItems: 'center',
    paddingHorizontal: Padding.p_24,
    paddingBottom: Padding.p_12,
  },
  titleText: {
    fontFamily: FontFamily.geist,
    fontSize: FontSize.size_20,
    fontWeight: 'bold',
    color: Color.colorWhite,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: Padding.p_12,
    paddingTop: Padding.p_12,
    paddingBottom: Padding.p_24,
    gap: Gap.gap_16,
  },
  qrWrapper: {
    alignItems: 'center',
    padding: Padding.p_12,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: Border.br_24,
    marginHorizontal: Padding.p_12,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
  },
  qrBackground: {
    padding: Padding.p_12,
  },
  addressCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: Border.br_12,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    elevation: 0, 
    marginHorizontal: Padding.p_12,
  },
  addressLabel: {
    fontFamily: FontFamily.geist,
    color: Color.colorWhite,
    marginBottom: Gap.gap_4,
    fontWeight: 'bold',
    fontSize: FontSize.size_14,
  },
  addressTextContainer: {
    backgroundColor: 'transparent',
    fontFamily: FontFamily.geist,
  },
  addressTextInputContent: {
    fontFamily: FontFamily.geist,
    color: Color.colorWhite,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Gap.gap_12,
    paddingHorizontal: Padding.p_12,
    gap: Gap.gap_12,
  },
  actionButtonOutlined: {
    flex: 1,
    borderColor: Color.colorWhite,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: Border.br_32,
    borderWidth: 1.5,
  },
  actionButtonLabelOutlined: {
    fontFamily: FontFamily.geist,
    color: Color.colorWhite,
    fontWeight: 'bold',
    fontSize: FontSize.size_12,
  },
  actionButtonContained: {
    flex: 1,
    backgroundColor: Color.colorRoyalblue100,
    borderRadius: Border.br_32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  actionButtonLabelContained: {
    fontFamily: FontFamily.geist,
    color: Color.colorWhite,
    fontWeight: 'bold',
    fontSize: FontSize.size_12,
  },
}); 