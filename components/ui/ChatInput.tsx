import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/ThemeContext';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface ChatInputProps {
  onSendMessage?: (message: string) => void;
  isLoading?: boolean;
}

export default function ChatInput({ onSendMessage, isLoading = false }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -3,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [floatAnim]);

  const handleSend = () => {
    if (message.trim() && onSendMessage) {
      onSendMessage(message);
      setMessage('');
    }
  };
  
  const navigateToChatHistory = () => {
    router.push('/(app)/chat-history' as any);
  };

  return (
    <ThemedView
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#1A1F38' : '#FFFFFF',
          borderTopColor: isDark ? '#252D4A' : '#E8EAF6'
        }
      ]}
    >
      <View style={styles.inputContainer}>
        <TouchableOpacity onPress={navigateToChatHistory}>
          <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
            <Image
              source={require('@/assets/logo/logo@HD.png')}
              style={styles.logo}
            />
          </Animated.View>
        </TouchableOpacity>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: isDark ? '#252D4A' : '#E8EAF6',
              color: isDark ? 'white' : '#0A0E17',
              height: 40, // Altura reducida
              paddingVertical: 8, // Padding vertical reducido
            }
          ]}
          placeholder="Type a message..."
          placeholderTextColor={isDark ? '#9BA1A6' : '#6C7A9C'}
          value={message}
          onChangeText={setMessage}
          onSubmitEditing={handleSend}
          editable={!isLoading}
        />
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ThemedText>Loading...</ThemedText>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.sendButton}
            onPress={handleSend}
            disabled={!message.trim()}
          >
            <MaterialIcons 
              name="send" 
              size={24} 
              color={isDark ? 'white' : '#0A0E17'} 
            />
          </TouchableOpacity>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 16,
    borderTopWidth: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 14, // Tamaño de fuente reducido
    marginLeft: 8, // Espacio entre logo e input
  },
  logo: {
    width: 32,
    height: 32,
    marginRight: 8,
  },
  sendButton: {
    padding: 8,
  },
  loadingContainer: {
    padding: 8,
  },
});