import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/ThemeContext';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import {
    Alert,
    StyleSheet,
    TouchableOpacity,
    View,
    Animated,
    Dimensions,
    Easing,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { storage } from '../core/storage';
import { ChatMessage } from '../types/agent';

// Key for storing chat history in storage
const CHAT_HISTORY_KEY = 'chatHistory';
const MAX_CHATS = 10; // Increased from 3 to 10 to show more history

// Example prompts for the user
const EXAMPLE_PROMPTS = [
  "What's my current balance?",
  "How do I send AVAX to another wallet?",
  "Help me understand transaction fees",
  "What is the current AVAX price?",
  "How can I swap tokens?"
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
    const [isLoading, setIsLoading] = useState(true);
    
    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    
    useEffect(() => {
        console.log('[ChatHistoryScreen] Component mounted, loading chat summaries');
        loadChatSummaries();
        
        // Start animations after a brief delay
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
                easing: Easing.out(Easing.quad),
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
                easing: Easing.out(Easing.quad),
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
                easing: Easing.out(Easing.quad),
            })
        ]).start();
    }, []);

    const loadChatSummaries = () => {
        setIsLoading(true);
        try {
            const storedHistory = storage.getString(CHAT_HISTORY_KEY);
            console.log('[ChatHistoryScreen] Stored Chat History:', storedHistory ? 'Found data' : 'No data');
            
            if (storedHistory) {
                const parsedHistory = JSON.parse(storedHistory);
                
                if (parsedHistory && parsedHistory.conversations) {
                    const conversationsArray = Object.values(parsedHistory.conversations) as Conversation[];
                    
                    // Log detailed info about conversations found
                    console.log('[ChatHistoryScreen] Parsed conversations:', {
                        count: conversationsArray.length,
                        ids: conversationsArray.map(c => c.id),
                        timestamps: conversationsArray.map(c => new Date(c.timestamp).toISOString())
                    });
                    
                    conversationsArray.sort((a, b) => b.timestamp - a.timestamp);
                    
                    const summaries: ChatSummary[] = conversationsArray.map(conversation => {
                        const messages = conversation.messages;
                        const lastMessage = messages[messages.length - 1];
                        
                        // Get last user and last assistant message for better context
                        const lastUserMessage = [...messages].reverse().find(m => m.sender === 'user');
                        const lastAgentMessage = [...messages].reverse().find(m => m.sender === 'agent');
                        
                        const snippetText = [
                            lastUserMessage ? `You: ${lastUserMessage.text.substring(0, 40)}${lastUserMessage.text.length > 40 ? '...' : ''}` : '',
                            lastAgentMessage ? `Assistant: ${lastAgentMessage.text.substring(0, 40)}${lastAgentMessage.text.length > 40 ? '...' : ''}` : ''
                        ].filter(Boolean).join('\n');
                        
                        return {
                            id: conversation.id,
                            lastMessageTimestamp: lastMessage.timestamp,
                            lastMessage: lastMessage.text,
                            snippetText
                        };
                    });
                    
                    setChatSummaries(summaries.slice(0, MAX_CHATS));
                    console.log(`[ChatHistoryScreen] Loaded ${summaries.length} chat summaries`);
                } else {
                    console.log('[ChatHistoryScreen] No conversations found in parsed history');
                    setChatSummaries([]);
                }
            } else {
                console.log('[ChatHistoryScreen] No chat history found in storage');
                setChatSummaries([]);
            }
        } catch (error) {
            console.error('[ChatHistoryScreen] Failed to load chat summaries:', error);
            setChatSummaries([]);
        } finally {
            setIsLoading(false);
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

    const clearAllHistory = () => {
        Alert.alert(
            'Clear All History',
            'Are you sure you want to delete all conversations? This cannot be undone.',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: () => {
                        try {
                            storage.delete(CHAT_HISTORY_KEY);
                            setChatSummaries([]);
                            console.log('[ChatHistoryScreen] All chat history cleared');
                        } catch (error) {
                            console.error('[ChatHistoryScreen] Failed to clear history:', error);
                            Alert.alert('Error', 'Could not clear chat history');
                        }
                    },
                },
            ]
        );
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

    const renderExamplePrompt = ({ item, index }: { item: string, index: number }) => {
        // Calculate staggered animation delay
        const staggerDelay = index * 100;
        
        return (
            <Animated.View
                style={{
                    opacity: fadeAnim,
                    transform: [{ translateY: Animated.add(slideAnim, new Animated.Value(staggerDelay)) }],
                }}
            >
                <TouchableOpacity
                    style={[
                        styles.examplePrompt, 
                        { 
                            backgroundColor: isDark 
                                ? 'rgba(58, 90, 255, 0.2)' 
                                : 'rgba(58, 90, 255, 0.1)',
                            borderLeftWidth: 3,
                            borderLeftColor: 'rgba(58, 90, 255, 0.8)',
                        }
                    ]}
                    onPress={() => startNewChat(item)}
                >
                    <FontAwesome5 
                        name="robot" 
                        size={18} 
                        color={'rgba(58, 90, 255, 0.9)'} 
                        style={styles.promptIcon} 
                    />
                    <ThemedText style={styles.promptText}>{item}</ThemedText>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const renderChatSummary = ({ item, index }: { item: ChatSummary, index: number }) => {
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
        
        // Calculate staggered animation delay for chat items
        const staggerDelay = index * 80;
        
        return (
            <Animated.View 
                style={{
                    opacity: fadeAnim,
                    transform: [
                        { translateY: Animated.add(slideAnim, new Animated.Value(staggerDelay)) },
                        { scale: scaleAnim }
                    ],
                }}
            >
                <View style={styles.chatSummaryContainer}>
                    <TouchableOpacity
                        style={[
                            styles.chatSummary, 
                            { 
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                borderLeftWidth: 3,
                                borderLeftColor: 'rgba(58, 90, 255, 0.8)',
                            }
                        ]}
                        onPress={() => router.push({
                            pathname: '/(app)/chat',
                            params: { 
                                conversationId: item.id,
                                from: 'history'
                            }
                        })}
                        activeOpacity={0.7}
                    >
                        <View style={styles.chatAvatarContainer}>
                            <View style={styles.chatAvatar}>
                                <MaterialIcons name="assistant" size={20} color="#FFF" />
                            </View>
                        </View>
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
                                    size={22} 
                                    color="rgba(255, 77, 77, 0.8)" 
                                />
                            </TouchableOpacity>
                            <Ionicons 
                                name="chevron-forward" 
                                size={20} 
                                color="rgba(255, 255, 255, 0.6)" 
                            />
                        </View>
                    </TouchableOpacity>
                </View>
            </Animated.View>
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
                    colors={['rgba(0,24,69,0.4)', 'rgba(0,24,69,0.6)']}
                    style={StyleSheet.absoluteFill}
                />
            </View>

            <SafeAreaView style={styles.safeArea}>
                {/* Header with back button */}
                <Animated.View 
                    style={[
                        styles.header, 
                        { 
                            backgroundColor: 'transparent',
                            opacity: fadeAnim,
                            transform: [{ translateY: Animated.multiply(slideAnim, new Animated.Value(0.5)) }]
                        }
                    ]}
                >
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
                    
                    <TouchableOpacity 
                        style={styles.clearAllButton}
                        onPress={clearAllHistory}
                    >
                        <MaterialIcons name="cleaning-services" size={22} color="rgba(255, 77, 77, 0.8)" />
                    </TouchableOpacity>
                </Animated.View>
                
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {chatSummaries.length > 0 ? (
                        <>
                            <Animated.View
                                style={{
                                    opacity: fadeAnim,
                                    transform: [{ translateY: slideAnim }],
                                }}
                            >
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
                                            marginBottom: 16
                                        }
                                    ]}
                                >
                                    Recent Conversations
                                </ThemedText>
                            </Animated.View>
                            
                            {chatSummaries.map((chat, index) => (
                                <View key={chat.id}>
                                    {renderChatSummary({ item: chat, index })}
                                </View>
                            ))}
                        </>
                    ) : (
                        <Animated.View 
                            style={[
                                styles.noChatsContainer,
                                {
                                    opacity: fadeAnim,
                                    transform: [{ scale: scaleAnim }]
                                }
                            ]}
                        >
                            <MaterialIcons 
                                name="chat-bubble-outline" 
                                size={64} 
                                color="rgba(255,255,255,0.3)" 
                                style={styles.noChatsIcon}
                            />
                            <ThemedText style={[styles.noChatsText, { color: '#FFFFFF' }]}>
                                No recent conversations
                            </ThemedText>
                            <ThemedText style={[styles.noChatsSubText, { color: 'rgba(255,255,255,0.6)' }]}>
                                Start a new chat or try one of the suggestions below
                            </ThemedText>
                        </Animated.View>
                    )}
                    
                    <Animated.View
                        style={{
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                            marginTop: 24
                        }}
                    >
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
                                }
                            ]}
                        >
                            Try asking
                        </ThemedText>
                    </Animated.View>
                    
                    {EXAMPLE_PROMPTS.map((prompt, index) => (
                        <View key={`prompt-${index}`}>
                            {renderExamplePrompt({ item: prompt, index })}
                        </View>
                    ))}
                    
                    <Animated.View
                        style={{
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                            marginBottom: 20
                        }}
                    >
                        <TouchableOpacity
                            style={[
                                styles.newChatButton, 
                                { 
                                    backgroundColor: 'rgba(58, 90, 255, 0.8)', 
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    shadowColor: 'rgba(58, 90, 255, 0.5)',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.5,
                                    shadowRadius: 8,
                                    elevation: 6,
                                }
                            ]}
                            onPress={() => startNewChat()}
                            activeOpacity={0.8}
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
                                    { color: '#FFFFFF', marginLeft: 8, fontWeight: '600' }
                                ]}
                            >
                                New Conversation
                            </ThemedText>
                        </TouchableOpacity>
                    </Animated.View>
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
        paddingTop: 8,
        paddingBottom: 12,
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 18,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    clearAllButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    sectionTitle: {
        marginBottom: 12,
        fontSize: 16,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    chatSummaryContainer: {
        marginBottom: 12,
    },
    chatSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    chatAvatarContainer: {
        marginRight: 12,
    },
    chatAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(58, 90, 255, 0.8)',
        alignItems: 'center',
        justifyContent: 'center',
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
        lineHeight: 20,
    },
    chatActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    deleteButton: {
        marginRight: 12,
        padding: 6,
    },
    noChatsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        marginTop: 20,
        marginBottom: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: 16,
    },
    noChatsIcon: {
        marginBottom: 16,
    },
    noChatsText: {
        opacity: 0.7,
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    noChatsSubText: {
        opacity: 0.7,
        fontSize: 14,
        textAlign: 'center',
    },
    examplePrompt: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
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
        fontSize: 16,
    },
}); 