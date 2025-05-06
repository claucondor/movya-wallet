import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/ThemeContext';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
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
                
                if (parsedHistory && parsedHistory.conversations) {
                    const conversationsArray = Object.values(parsedHistory.conversations) as Conversation[];
                    
                    conversationsArray.sort((a, b) => b.timestamp - a.timestamp);
                    
                    const summaries: ChatSummary[] = conversationsArray.map(conversation => {
                        const messages = conversation.messages;
                        const lastMessage = messages[messages.length - 1];
                        
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
                } else {
                    setChatSummaries([]);
                }
            } else {
                setChatSummaries([]);
            }
        } catch (error) {
            console.error('[ChatHistoryScreen] Failed to load chat summaries:', error);
            setChatSummaries([]);
        }
    };

    const deleteConversation = (conversationId: string) => {
        try {
            const storedHistory = storage.getString(CHAT_HISTORY_KEY);
            if (storedHistory) {
                const parsedHistory = JSON.parse(storedHistory);
                
                if (parsedHistory.conversations) {
                    // Remove the specific conversation
                    delete parsedHistory.conversations[conversationId];
                    
                    // Save the updated history
                    storage.set(CHAT_HISTORY_KEY, JSON.stringify(parsedHistory));
                    
                    // Reload chat summaries
                    loadChatSummaries();
                }
            }
        } catch (error) {
            console.error('[ChatHistoryScreen] Failed to delete conversation:', error);
            Alert.alert('Error', 'Could not delete the conversation');
        }
    };

    const confirmDeleteConversation = (conversationId: string) => {
        Alert.alert(
            'Delete Conversation',
            'Are you sure you want to delete this conversation?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteConversation(conversationId),
                },
            ]
        );
    };

    const startNewChat = (initialMessage?: string) => {
        router.push({
            pathname: '/(app)/chat',
            params: initialMessage ? { initialMessage, from: 'history' } : { from: 'history' }
        });
    };

    const renderExamplePrompt = ({ item }: { item: string }) => (
        <TouchableOpacity
            style={[
                styles.examplePrompt, 
                { 
                    backgroundColor: isDark 
                        ? 'rgba(58, 90, 255, 0.2)' 
                        : 'rgba(58, 90, 255, 0.1)' 
                }
            ]}
            onPress={() => startNewChat(item)}
        >
            <MaterialIcons 
                name="psychology-alt" 
                size={24} 
                color={isDark ? '#3A5AFF' : '#3A5AFF'} 
                style={styles.promptIcon} 
            />
            <ThemedText style={styles.promptText}>{item}</ThemedText>
        </TouchableOpacity>
    );

    const renderChatSummary = ({ item }: { item: ChatSummary }) => {
        const date = new Date(item.lastMessageTimestamp);
        const now = new Date();
        let dateText;
        
        if (date.toDateString() === now.toDateString()) {
            dateText = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
            dateText = date.toLocaleDateString([], { weekday: 'short' });
        } else {
            dateText = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
        
        return (
            <View style={styles.chatSummaryContainer}>
                <TouchableOpacity
                    style={[
                        styles.chatSummary, 
                        { 
                            backgroundColor: isDark 
                                ? 'rgba(58, 90, 255, 0.2)' 
                                : 'rgba(58, 90, 255, 0.1)' 
                        }
                    ]}
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
                            <ThemedText type="defaultSemiBold" style={styles.assistantName}>Movya Assistant</ThemedText>
                            <ThemedText style={styles.dateText}>{dateText}</ThemedText>
                        </View>
                        <ThemedText numberOfLines={2} style={styles.snippetText}>
                            {item.snippetText}
                        </ThemedText>
                    </View>
                    <View style={styles.chatActions}>
                        <TouchableOpacity 
                            style={styles.deleteButton}
                            onPress={() => confirmDeleteConversation(item.id)}
                        >
                            <MaterialIcons 
                                name="delete-sweep" 
                                size={24} 
                                color={isDark ? '#FF4D4D' : '#FF4D4D'} 
                            />
                        </TouchableOpacity>
                        <Ionicons 
                            name="chevron-forward" 
                            size={20} 
                            color={isDark ? '#9BA1A6' : '#6C7A9C'} 
                        />
                    </View>
                </TouchableOpacity>
            </View>
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
                            // Explicitly navigate to wallet screen
                            router.replace('/(app)/wallet');
                        }}
                    >
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <ThemedText type="defaultSemiBold" style={[styles.headerTitle, { color: '#FFFFFF' }]}>Chat History</ThemedText>
                    <View style={styles.headerRight} />
                </View>
                
                <View style={styles.content}>
                    {chatSummaries.length > 0 ? (
                        <>
                            <ThemedText 
                                type="defaultSemiBold" 
                                style={[
                                    styles.sectionTitle, 
                                    { 
                                        color: '#FFFFFF', 
                                        backgroundColor: 'rgba(58, 90, 255, 0.2)',
                                        paddingHorizontal: 12,
                                        paddingVertical: 8,
                                        borderRadius: 8,
                                        alignSelf: 'flex-start'
                                    }
                                ]}
                            >
                                Recent Conversations
                            </ThemedText>
                            {chatSummaries.map(chat => (
                                <View key={chat.id}>
                                    {renderChatSummary({ item: chat })}
                                </View>
                            ))}
                        </>
                    ) : (
                        <View style={styles.noChatsContainer}>
                            <MaterialIcons 
                                name="chat-bubble-outline" 
                                size={64} 
                                color="rgba(255,255,255,0.3)" 
                                style={styles.noChatsIcon}
                            />
                            <ThemedText style={[styles.noChatsText, { color: '#FFFFFF' }]}>
                                No recent conversations
                            </ThemedText>
                        </View>
                    )}
                    
                    <ThemedText 
                        type="defaultSemiBold" 
                        style={[
                            styles.sectionTitle, 
                            { 
                                color: '#FFFFFF', 
                                backgroundColor: 'rgba(58, 90, 255, 0.2)',
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 8,
                                alignSelf: 'flex-start',
                                marginTop: 20
                            }
                        ]}
                    >
                        Try asking
                    </ThemedText>
                    {EXAMPLE_PROMPTS.map((prompt, index) => (
                        <View key={`prompt-${index}`}>
                            {renderExamplePrompt({ item: prompt })}
                        </View>
                    ))}
                    
                    <TouchableOpacity
                        style={[
                            styles.newChatButton, 
                            { 
                                backgroundColor: 'rgba(58, 90, 255, 0.8)', 
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }
                        ]}
                        onPress={() => startNewChat()}
                    >
                        <MaterialIcons 
                            name="add-comment" 
                            size={24} 
                            color="#FFFFFF" 
                            style={styles.newChatIcon} 
                        />
                        <ThemedText 
                            style={[
                                styles.newChatText, 
                                { color: '#FFFFFF', marginLeft: 8 }
                            ]}
                        >
                            New Conversation
                        </ThemedText>
                    </TouchableOpacity>
                </View>
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
        width: 40,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    sectionTitle: {
        marginBottom: 12,
        fontSize: 16,
    },
    chatSummaryContainer: {
        marginBottom: 12,
    },
    chatSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
    },
    chatInfo: {
        flex: 1,
        marginRight: 12,
    },
    chatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    assistantName: {
        color: '#FFFFFF',
    },
    dateText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
    },
    snippetText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
    },
    chatActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    deleteButton: {
        marginRight: 12,
    },
    noChatsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    noChatsIcon: {
        marginBottom: 16,
    },
    noChatsText: {
        opacity: 0.5,
        fontSize: 16,
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