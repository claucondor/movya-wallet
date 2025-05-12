import Clipboard from '@react-native-clipboard/clipboard';
import { ResizeMode, Video } from 'expo-av';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Share,
    StyleSheet,
    View
} from 'react-native';
import {
    Appbar,
    Card,
    ActivityIndicator as PaperActivityIndicator,
    Button as PaperButton,
    IconButton as PaperIconButton,
    Text as PaperText,
    TextInput as PaperTextInput,
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
        setError(err.message || 'Failed to load wallet address.');
        Alert.alert('Error', err.message || 'Could not load your wallet address.');
      } finally {
        setIsLoading(false);
      }
    };

    loadAddress();
  }, []);

  const copyToClipboard = useCallback(async () => {
    if (address) {
      Clipboard.setString(address);
      Alert.alert('Copied!', 'Your address has been copied to the clipboard.');
    }
  }, [address]);

  const shareAddress = useCallback(async () => {
    if (address) {
      try {
        await Share.share({
          message: `My Movya wallet address: ${address}`,
        });
      } catch (error: any) {
        Alert.alert('Error', 'Could not share address');
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

  if (error) {
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
    <Surface style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Receive AVAX" titleStyle={{fontWeight: 'bold'}}/>
      </Appbar.Header>
      
      <View style={styles.videoContainer}>
        <Video
          source={require('@/assets/bg/header-bg.mp4')}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          isLooping
          shouldPlay
          isMuted
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
      </View>

      <View style={styles.scrollContent}>
        <Card style={styles.qrCard}>
          <Card.Content style={styles.qrContainer}>
            {address && (
              <QRCode
                value={address}
                size={200}
                backgroundColor={colors.surfaceVariant}
                color={isDark ? colors.onSurface : colors.onSurfaceVariant }
              />
            )}
          </Card.Content>
        </Card>

        <Card style={styles.addressCard}>
          <Card.Content>
            <PaperText variant="titleMedium" style={styles.addressLabel}>
              Your Wallet Address
            </PaperText>
            <PaperTextInput
              mode="outlined"
              value={address || ''}
              editable={false}
              style={styles.addressTextContainer}
              contentStyle={styles.addressTextInputContent}
              right={<PaperTextInput.Icon icon="content-copy" onPress={copyToClipboard} />}
            />
          </Card.Content>
        </Card>

        <View style={styles.buttonContainer}>
          <PaperButton 
            mode="outlined" 
            icon="content-copy"
            onPress={copyToClipboard}
            style={styles.actionButton}
            labelStyle={styles.buttonLabel}
          >
            Copy Address
          </PaperButton>
          <PaperButton 
            mode="contained" 
            icon="share-variant"
            onPress={shareAddress}
            style={styles.actionButton}
            labelStyle={styles.buttonLabel}
          >
            Share Address
          </PaperButton>
        </View>
      </View>
    </Surface>
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
  videoContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0, 
    height: '35%',
    overflow: 'hidden',
  },
  scrollContent: {
    padding: 16,
    paddingTop: '25%',
  },
  qrCard: {
    marginBottom: 24,
  },
  qrContainer: {
    alignItems: 'center',
    padding: 20,
  },
  addressCard: {
    marginBottom: 24,
  },
  addressLabel: {
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  addressTextContainer: {
  },
  addressTextInputContent: {
    paddingVertical: 12,
    fontFamily: 'monospace',
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  buttonLabel: {
    fontSize: 14,
  },
}); 