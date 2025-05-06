import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { storage } from '../core/storage';
import { ChatMessage } from '../types/agent';

// Key for storing chat history in storage
const CHAT_HISTORY_KEY = 'chatHistory';
const MAX_CHATS = 3;

// Example prompts for the user
const EXAMPLE_PROMPTS = [
  "What's my current balance?",
  "How do I send AVAX to another wallet?",
  "Help me understand transaction fees",
];

// Type for our chat history summary
interface ChatSummary {
  id: string;
  lastMessageTimestamp: number;
  lastMessage: string;
  snippetText: string;
}

// Type for conversation storage
interface Conversation {
  id: string;
  timestamp: number;
  messages: ChatMessage[];
}

export default function ChatHistoryScreen() {
    const { colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';
    const [chatSummaries, setChatSummaries] = useState<ChatSummary[]>([]);
    
    useEffect(() => {
        loadChatSummaries();
    }, []);

    const loadChatSummaries = () => {
        try {
            const storedHistory = storage.getString(CHAT_HISTORY_KEY);
            if (storedHistory) {
                const parsedHistory = JSON.parse(storedHistory);
                
                // Check if we have the new format with conversations object
                if (parsedHistory && parsedHistory.conversations) {
                    // Get conversations as an array
                    const conversationsArray = Object.values(parsedHistory.conversations) as Conversation[];
                    
                    // Sort by most recent
                    conversationsArray.sort((a, b) => b.timestamp - a.timestamp);
                    
                    // Create summaries from the conversations
                    const summaries: ChatSummary[] = conversationsArray.map(conversation => {
                        const messages = conversation.messages;
                        const lastMessage = messages[messages.length - 1];
                        
                        // Get a snippet of the conversation (first 2 messages or so)
                        const snippetMessages = messages.slice(0, Math.min(2, messages.length));
                        const snippetText = snippetMessages.map(m => 
                            `${m.sender === 'user' ? 'You: ' : 'Assistant: '}${m.text.substring(0, 40)}${m.text.length > 40 ? '...' : ''}`
                        ).join('\n');
                        
                        return {
                            id: conversation.id,
                            lastMessageTimestamp: lastMessage.timestamp,
                            lastMessage: lastMessage.text,
                            snippetText
                        };
                    });
                    
                    setChatSummaries(summaries.slice(0, MAX_CHATS));
                    console.log(`[ChatHistoryScreen] Loaded ${summaries.length} conversations`);
                } else {
                    // Handle old format (if needed) or just show empty state
                    console.log('[ChatHistoryScreen] No conversations found in new format');
                    setChatSummaries([]);
                }
            } else {
                console.log('[ChatHistoryScreen] No chat history found');
                setChatSummaries([]);
            }
        } catch (error) {
            console.error('[ChatHistoryScreen] Failed to load chat summaries:', error);
            setChatSummaries([]);
        }
    };

    const startNewChat = (initialMessage?: string) => {
        // Navigate to chat with or without an initial message
        router.push({
            pathname: '/(app)/chat',
            params: initialMessage ? { initialMessage, from: 'history' } : { from: 'history' }
        });
    };

    const renderExamplePrompt = ({ item }: { item: string }) => (
        <TouchableOpacity
            style={[styles.examplePrompt, { backgroundColor: isDark ? 'rgba(37, 45, 74, 0.7)' : 'rgba(232, 234, 246, 0.7)' }]}
            onPress={() => startNewChat(item)}
        >
            <Ionicons name="chatbubble-outline" size={20} color={isDark ? '#3A5AFF' : '#3A5AFF'} style={styles.promptIcon} />
            <ThemedText style={styles.promptText}>{item}</ThemedText>
        </TouchableOpacity>
    );

    const renderChatSummary = ({ item }: { item: ChatSummary }) => {
        // Format the date in a user-friendly way
        const date = new Date(item.lastMessageTimestamp);
        const now = new Date();
        let dateText;
        
        if (date.toDateString() === now.toDateString()) {
            // Today - show time
            dateText = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
            // Within last week - show day of week
            dateText = date.toLocaleDateString([], { weekday: 'short' });
        } else {
            // Older - show date
            dateText = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
        
        return (
            <TouchableOpacity
                style={[styles.chatSummary, { backgroundColor: isDark ? 'rgba(37, 45, 74, 0.7)' : 'rgba(232, 234, 246, 0.7)' }]}
                onPress={() => router.push({
                    pathname: '/(app)/chat',
                    params: { 
                        conversationId: item.id,
                        from: 'history'
                    }
                })}
            >
                <View style={styles.chatInfo}>
                    <View style={styles.chatHeader}>
                        <ThemedText type="defaultSemiBold">Movya Assistant</ThemedText>
                        <ThemedText style={styles.dateText}>{dateText}</ThemedText>
                    </View>
                    <ThemedText numberOfLines={2} style={styles.snippetText}>
                        {item.snippetText}
                    </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={20} color={isDark ? '#9BA1A6' : '#6C7A9C'} />
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Background Video */}
            <View style={styles.videoContainer}>
                <Video
                    source={require('../../assets/bg/header-bg.mp4')}
                    style={StyleSheet.absoluteFill}
                    resizeMode={ResizeMode.COVER}
                    isLooping
                    shouldPlay
                    isMuted
                />
                <LinearGradient
                    colors={['rgba(0,24,69,0.2)', 'rgba(0,24,69,0.4)']}
                    style={StyleSheet.absoluteFill}
                />
            </View>

            <SafeAreaView style={styles.safeArea}>
                {/* Header with back button */}
                <View style={[styles.header, { backgroundColor: 'transparent' }]}>
                    <TouchableOpacity 
                        style={styles.backButton}
                        onPress={() => {
                            // Try to go back to the wallet screen
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                // Fallback to navigating to wallet screen directly
                                router.replace('/(app)/wallet');
                            }
                        }}
                    >
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <ThemedText type="defaultSemiBold" style={[styles.headerTitle, { color: '#FFFFFF' }]}>Chat History</ThemedText>
                    <View style={styles.headerRight} />
                </View>
                
                <ScrollView 
                    style={styles.content}
                    contentContainerStyle={styles.scrollViewContent}
                >
                    {chatSummaries.length > 0 ? (
                        <>
                            <ThemedText type="defaultSemiBold" style={[styles.sectionTitle, { color: '#FFFFFF' }]}>Recent Conversations</ThemedText>
                            {chatSummaries.map(chat => (
                                <View key={chat.id}>
                                    {renderChatSummary({ item: chat })}
                                </View>
                            ))}
                        </>
                    ) : (
                        <View style={styles.noChatsContainer}>
                            <ThemedText style={[styles.noChatsText, { color: '#FFFFFF' }]}>No recent conversations</ThemedText>
                        </View>
                    )}
                    
                    <ThemedText type="defaultSemiBold" style={[styles.sectionTitle, { color: '#FFFFFF' }]}>Try asking</ThemedText>
                    {EXAMPLE_PROMPTS.map((prompt, index) => (
                        <View key={`prompt-${index}`}>
                            {renderExamplePrompt({ item: prompt })}
                        </View>
                    ))}
                    
                    <TouchableOpacity
                        style={[styles.newChatButton, { backgroundColor: '#3A5AFF' }]}
                        onPress={() => startNewChat()}
                    >
                        <Ionicons name="add" size={20} color="#FFFFFF" style={styles.newChatIcon} />
                        <ThemedText style={styles.newChatText} lightColor="#FFFFFF" darkColor="#FFFFFF">New Chat</ThemedText>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    videoContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        overflow: 'hidden',
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 17,
    },
    headerRight: {
        width: 40, // For balance with the back button
    },
    content: {
        flex: 1,
        padding: 16,
    },
    scrollViewContent: {
        paddingBottom: 40,
    },
    sectionTitle: {
        marginTop: 20,
        marginBottom: 12,
        fontSize: 16,
    },
    chatSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    chatInfo: {
        flex: 1,
    },
    chatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    dateText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
    },
    snippetText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
    },
    noChatsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    noChatsText: {
        opacity: 0.5,
    },
    examplePrompt: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    promptIcon: {
        marginRight: 12,
    },
    promptText: {
        flex: 1,
        color: '#FFFFFF',
    },
    newChatButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        marginTop: 20,
        marginBottom: 20,
    },
    newChatIcon: {
        marginRight: 8,
    },
    newChatText: {
        fontWeight: '600',
        color: '#FFFFFF',
    },
}); 