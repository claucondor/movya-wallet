import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/ThemeContext';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

export function ThemeToggleButton() {
  const { colorScheme, toggleColorScheme } = useTheme();

  return (
    <TouchableOpacity 
      style={styles.button}
      onPress={toggleColorScheme}
    >
      <ThemedText type="defaultSemiBold">
        {colorScheme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
      </ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(58, 90, 255, 0.1)',
    marginTop: 10,
  }
});