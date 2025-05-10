import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

export default function DepositScreenPlaceholder() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#121212' : '#F5F5F5',
    },
    backButtonContainer: {
      position: 'absolute',
      top: 50,
      left: 15,
      zIndex: 10,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 5,
    },
    backButtonText: {
      marginLeft: 6,
      fontSize: 17,
    },
    contentContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    title: {
      marginBottom: 16,
      textAlign: 'center',
    },
    placeholderText: {
      textAlign: 'center',
      marginBottom: 8,
      color: isDark ? '#A0A0A0' : '#757575',
    },
    iconContainer: {
      marginBottom: 20,
    }
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButtonContainer} onPress={() => router.replace('/(app)/wallet')}>
        <Ionicons name="chevron-back-outline" size={28} color={isDark ? '#FFFFFF' : '#000000'} />
        <ThemedText type="defaultSemiBold" style={styles.backButtonText}>Back</ThemedText>
      </TouchableOpacity>
      <View style={styles.contentContainer}>
        <View style={styles.iconContainer}>
        </View>
        <ThemedText type="title" style={styles.title}>
          Deposit Funds
        </ThemedText>
        <ThemedText type="default" style={styles.placeholderText}>
          This feature is currently under development.
        </ThemedText>
        <ThemedText type="default" style={styles.placeholderText}>
          You will soon be able to deposit funds into your wallet using various fiat methods.
        </ThemedText>
        <ThemedText type="default" style={styles.placeholderText}>
          Stay tuned for updates!
        </ThemedText>
      </View>
    </View>
  );
}
