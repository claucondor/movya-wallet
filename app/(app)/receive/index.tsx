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

const PRIVATE_KEY_STORAGE_KEY = 'userPrivateKey';

export default function ReceiveScreen() {
  const paperTheme = usePaperTheme();
  const { colors, dark: isDark } = paperTheme;

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
      <Surface style={[styles.container, styles.center]}>
        <PaperActivityIndicator size="large" color={colors.primary} />
        <PaperText variant="bodyLarge" style={{marginTop: 16}}>Loading your address...</PaperText>
      </Surface>
    );
  }

  if (error && !address) {
    return (
      <Surface style={[styles.container, styles.center]}>
        <PaperIconButton icon="alert-circle-outline" size={48} iconColor={colors.error} />
        <PaperText variant="headlineSmall" style={{color: colors.error, marginTop: 16, marginBottom: 8, textAlign: 'center'}}>
          Error Loading Address
        </PaperText>
        <PaperText variant="bodyMedium" style={{textAlign: 'center', paddingHorizontal: 20}}>{error}</PaperText>
      </Surface>
    );
  }

  return (
    <Portal.Host>
      <View style={styles.container}>
        <StatusBar style="dark" translucent={true} backgroundColor="transparent"/>
        
        <Video
          source={require('@/assets/bg/start-screen-bg.mp4')}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          isLooping
          shouldPlay
          isMuted
        />

        <LinearGradient
          colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.1)']}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.safeTopArea} />
        
        <View style={styles.topBar}>
          <View style={styles.backButtonContainer}>
            <PaperIconButton
              icon="arrow-left"
              size={24}
              onPress={() => router.back()}
              iconColor="#333333"
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
                  backgroundColor="#FFFFFF"
                  color="#000000"
                />
              )}
            </View>
          </View>

          <Card style={[styles.addressCard, {backgroundColor: 'rgba(255,255,255,0.92)'}]}>
            <Card.Content>
              <PaperText variant="titleMedium" style={[styles.addressLabel, {color: colors.onSurface}]}>
                Your Wallet Address
              </PaperText>
              <PaperTextInput
                mode="outlined"
                value={address ? `${address.slice(0, 10)}...${address.slice(-8)}` : ''}
                editable={false}
                style={styles.addressTextContainer}
                contentStyle={styles.addressTextInputContent}
                outlineStyle={{borderColor: colors.outline}}
                right={<PaperTextInput.Icon icon="content-copy" onPress={copyToClipboard} color={colors.primary}/>}
              />
            </Card.Content>
          </Card>

          <View style={styles.buttonContainer}>
            <PaperButton 
              mode="outlined" 
              icon="content-copy"
              onPress={copyToClipboard}
              style={[styles.actionButton, {borderColor: colors.primary, backgroundColor: 'rgba(255,255,255,0.92)'}] }
              labelStyle={[styles.buttonLabel, {color: colors.primary}]}
              rippleColor={colors.primaryContainer}
              compact={true}
            >
              Copy Address
            </PaperButton>
            <PaperButton 
              mode="contained" 
              icon="share-variant"
              onPress={shareAddress}
              style={[styles.actionButton, {backgroundColor: colors.primary}] }
              labelStyle={[styles.buttonLabel, {color: colors.onPrimary}]}
              rippleColor={colors.onPrimaryContainer}
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
          style={snackbarIsError ? { backgroundColor: colors.errorContainer } : { backgroundColor: colors.primaryContainer }}
          action={{
            label: 'OK',
            textColor: snackbarIsError ? colors.onErrorContainer : colors.onPrimaryContainer,
            onPress: () => setSnackbarVisible(false),
          }}
        >
          <PaperText style={{color: snackbarIsError ? colors.onErrorContainer : colors.onPrimaryContainer}}>
            {snackbarMessage}
          </PaperText>
        </Snackbar>
      </View>
    </Portal.Host>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  safeTopArea: {
    height: Platform.OS === 'ios' ? 50 : ReactNativeStatusBar.currentHeight || 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
  },
  backButtonContainer: {
    width: 60,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    margin: 0,
  },
  titleContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  titleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    lineHeight: 32,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 10,
    paddingBottom: 30,
    alignItems: 'center',
  },
  qrWrapper: {
    marginBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrBackground: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  addressCard: { 
    marginBottom: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    width: '100%',
    borderRadius: 12,
  },
  addressLabel: { marginBottom: 10, textAlign: 'center', fontWeight: 'bold' },
  addressTextContainer: { backgroundColor: 'transparent' },
  addressTextInputContent: { paddingVertical: 10, fontFamily: 'monospace', fontSize: 13 },
  buttonContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    marginTop: 24,
    width: '100%',
  },
  actionButton: { 
    flex: 1, 
    marginHorizontal: 6, 
    borderWidth: 1.5,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    borderRadius: 30,
    paddingVertical: 5,
  },
  buttonLabel: { fontSize: 14, fontWeight: 'bold' },
}); 