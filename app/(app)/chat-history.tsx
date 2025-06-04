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
    ScrollView,
    Platform
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
            console.log('[ChatHistoryScreen] Stored Chat History raw string:', storedHistory ? `Found data (length: ${storedHistory.length})` : 'No data');
            
            if (storedHistory) {
                let parsedHistory;
                try {
                    parsedHistory = JSON.parse(storedHistory);
                    console.log('[ChatHistoryScreen] Raw parsed history from storage:', parsedHistory);
                } catch (e) {
                    console.error('[ChatHistoryScreen] Failed to parse storedHistory JSON:', e);
                    console.log('[ChatHistoryScreen] Content of storedHistory that failed to parse:', storedHistory);
                    setChatSummaries([]);
                    setIsLoading(false);
                    return;
                }
                
                const conversationsMap = parsedHistory?.conversations;

                if (conversationsMap && typeof conversationsMap === 'object' && !Array.isArray(conversationsMap)) {
                    const conversationsArray = Object.values(conversationsMap) as any[]; // Use any[] initially for robust filtering
                    
                    console.log('[ChatHistoryScreen] Extracted conversations from "conversations" property. Initial count:', conversationsArray.length);

                    // Filter out potentially malformed conversations before sorting and mapping
                    const validConversations = conversationsArray.filter(
                        (c): c is Conversation => 
                            c && 
                            typeof c.id === 'string' && 
                            typeof c.timestamp === 'number' && 
                            Array.isArray(c.messages) &&
                            c.messages.every((m: any) => typeof m === 'object' && m !== null && 'sender' in m && 'text' in m && 'timestamp' in m)
                    );

                    if (validConversations.length !== conversationsArray.length) {
                        console.warn(`[ChatHistoryScreen] Filtered out ${conversationsArray.length - validConversations.length} malformed or incomplete conversation objects.`);
                        if (conversationsArray.length > 0 && validConversations.length === 0) {
                            console.log('[ChatHistoryScreen] All conversation objects were malformed. First malformed object:', conversationsArray[0]);
                        }
                    }
                    
                    if (validConversations.length === 0) {
                        console.log('[ChatHistoryScreen] No valid conversations found after filtering.');
                        setChatSummaries([]);
                        setIsLoading(false);
                        return;
                    }

                    validConversations.sort((a, b) => b.timestamp - a.timestamp);
                    
                    const summaries: ChatSummary[] = validConversations.map(conversation => {
                        const messages = conversation.messages;
                        const lastMessageEntry = messages.length > 0 ? messages[messages.length - 1] : null;
                        
                        const lastUserMessage = [...messages].reverse().find(m => m.sender === 'user');
                        const lastAgentMessage = [...messages].reverse().find(m => m.sender === 'agent');
                        
                        const snippetText = [
                            lastUserMessage ? `You: ${String(lastUserMessage.text || '').substring(0, 60)}${String(lastUserMessage.text || '').length > 60 ? '...' : ''}` : '',
                            lastAgentMessage ? `Assistant: ${String(lastAgentMessage.text || '').substring(0, 60)}${String(lastAgentMessage.text || '').length > 60 ? '...' : ''}` : ''
                        ].filter(Boolean).join('\n');
                        
                        return {
                            id: conversation.id,
                            lastMessageTimestamp: conversation.timestamp,
                            snippetText
                        };
                    });
                    
                    setChatSummaries(summaries.slice(0, MAX_CHATS));
                    console.log(`[ChatHistoryScreen] Loaded ${summaries.length} chat summaries from "conversations" property.`);
                } else {
                    console.log(
                        '[ChatHistoryScreen] The "conversations" property is missing, not a valid object, or is an array in the parsed history.',
                        'This screen expects data stored under CHAT_HISTORY_KEY to be a JSON string of an object like: { "conversations": { "id1": {id:"id1", ...}, "id2": {id:"id2", ...} } }.'
                    );
                    if (parsedHistory) {
                         console.log('[ChatHistoryScreen] Actual structure of parsed history:', JSON.stringify(parsedHistory, null, 2));
                    } else {
                        console.log('[ChatHistoryScreen] parsedHistory was undefined or null, check parsing step.');
                    }
                    setChatSummaries([]);
                }
            } else {
                console.log('[ChatHistoryScreen] No chat history found in storage for key:', CHAT_HISTORY_KEY);
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
                            console.log('[ChatHistoryScreen] All chat history cleared for key:', CHAT_HISTORY_KEY);
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
                            styles.examplePromptCard,
                            { 
                                backgroundColor: isDark 
                                    ? 'rgba(4, 97, 240, 0.15)' 
                                    : 'rgba(4, 97, 240, 0.08)',
                            }
                        ]}
                    onPress={() => startNewChat(item)}
                    activeOpacity={0.7}
                >
                    <FontAwesome5 
                        name="lightbulb"
                        size={20}
                        color={isDark ? 'rgba(156, 202, 255, 1)' : 'rgba(4, 97, 240, 1)'} 
                        style={styles.promptIcon} 
                    />
                    <ThemedText style={[styles.promptText, {color: isDark ? '#D0E1FF' : '#1A2E59'}]}>{item}</ThemedText>
                    <Ionicons name="chevron-forward" size={20} color={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(4, 97, 240, 0.8)'} />
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
        const staggerDelay = index * 100;
        
        return (
            <Animated.View 
                style={{
                    opacity: fadeAnim,
                    transform: [
                        { translateY: Animated.add(slideAnim, new Animated.Value(staggerDelay)) },
                    ],
                }}
            >
                <View style={styles.chatSummaryCardContainer}>
                    <TouchableOpacity
                        style={[
                            styles.chatSummaryCard,
                            { 
                                backgroundColor: isDark ? 'rgba(30, 40, 65, 0.85)' : 'rgba(255, 255, 255, 0.9)',
                                shadowColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(100,100,150,0.3)',
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
                            <LinearGradient
                                colors={isDark ? ['#0461F0', '#9CCAFF'] : ['#0461F0', '#0477F0']}
                                style={styles.chatAvatar}
                            >
                                <MaterialIcons name="chat-bubble" size={26} color="#FFFFFF" />
                            </LinearGradient>
                        </View>
                        <View style={styles.chatInfo}>
                            <View style={styles.chatHeader}>
                                <ThemedText type="defaultSemiBold" style={[styles.assistantName, {color: isDark ? '#F0F0F0' : '#0A1A3A'}]}>Movya Assistant</ThemedText>
                                <ThemedText style={[styles.dateText, {color: isDark ? '#A0B0D0' : '#506080'}]}>{dateText}</ThemedText>
                            </View>
                            <ThemedText numberOfLines={2} style={[styles.snippetText, {color: isDark ? '#C8D4E8' : '#334266'}]}>
                                {item.snippetText}
                            </ThemedText>
                        </View>
                        <View style={styles.chatActions}>
                            <TouchableOpacity 
                                style={styles.deleteButton}
                                onPress={() => confirmDeleteConversation(item.id)}
                            >
                                <MaterialIcons 
                                    name="delete-forever"
                                    size={22}
                                    color={isDark ? "rgba(255, 120, 120, 0.8)" : "rgba(220, 50, 50, 0.9)"}
                                />
                            </TouchableOpacity>
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
                    source={require('../../assets/bg/header-bg.webm')}
                    style={StyleSheet.absoluteFill}
                    resizeMode={ResizeMode.COVER}
                    isLooping
                    shouldPlay
                    isMuted
                />
                <LinearGradient
                    colors={['rgba(4,97,240,0.3)', 'rgba(4,119,240,0.4)']}
                    style={StyleSheet.absoluteFill}
                />
            </View>

            <SafeAreaView style={styles.safeArea}>
                {/* Header with back button */}
                <Animated.View 
                    style={[
                        styles.header, 
                        { 
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
                        <MaterialIcons name="delete-sweep" size={26} color="rgba(255, 255, 255, 0.9)" />
                    </TouchableOpacity>
                </Animated.View>
                
                <ScrollView 
                    style={styles.content} 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.contentContainer}
                >
                    {chatSummaries.length > 0 ? (
                        <>
                            <Animated.View
                                style={{
                                    opacity: fadeAnim,
                                    transform: [{ translateY: slideAnim }],
                                    marginBottom: 16,
                                }}
                            >
                                <ThemedText 
                                    type="title"
                                    style={[
                                        styles.sectionTitle, 
                                        { 
                                            color: isDark ? '#E8E8E8' : '#FFFFFF',
                                            paddingHorizontal: 4,
                                            paddingVertical: 0,
                                            alignSelf: 'flex-start',
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
                            <LinearGradient
                                colors={isDark ? ['rgba(4, 97, 240, 0.25)', 'rgba(156, 202, 255, 0.15)'] : ['rgba(255,255,255,0.15)', 'rgba(230,240,255,0.25)']}
                                style={styles.noChatsIconOuterRing}
                            >
                                <LinearGradient
                                    colors={isDark ? ['rgba(4, 97, 240, 0.4)', 'rgba(156, 202, 255, 0.3)'] : ['rgba(4,97,240,0.3)', 'rgba(4,119,240,0.4)']}
                                    style={styles.noChatsIconContainer}
                                >
                                    <MaterialIcons 
                                        name="forum" 
                                        size={64}
                                        color={isDark ? "rgba(156, 202, 255, 0.95)" : "rgba(4, 97, 240, 0.9)"}
                                    />
                                </LinearGradient>
                            </LinearGradient>
                            <ThemedText style={[styles.noChatsText, { color: isDark ? '#D8D8D8' : '#F0F0F0' }]}>
                                No Conversations Yet
                            </ThemedText>
                            <ThemedText style={[styles.noChatsSubText, { color: isDark ? 'rgba(220,220,220,0.65)' : 'rgba(240,240,255,0.75)' }]}>
                                Your chat history will appear here once you start a conversation.
                            </ThemedText>
                        </Animated.View>
                    )}
                    
                    <Animated.View
                        style={{
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                            marginTop: chatSummaries.length > 0 ? 36 : 24,
                            marginBottom: 18,
                        }}
                    >
                        <ThemedText 
                            type="title"
                            style={[
                                styles.sectionTitle, 
                                { 
                                    color: isDark ? '#E8E8E8' : '#FFFFFF',
                                    paddingHorizontal: 4,
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
                                    backgroundColor: isDark ? 'rgba(4, 97, 240, 1)' : 'rgba(4, 97, 240, 1)', 
                                    shadowColor: 'rgba(4, 97, 240, 0.7)',
                                    shadowOffset: { width: 0, height: 8 },
                                    shadowOpacity: 0.45,
                                    shadowRadius: 12,
                                    elevation: 10,
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
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: Platform.OS === 'android' ? 20 : 12,
    },
    backButton: {
        padding: 12,
        borderRadius: 28,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        marginRight: 10,
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 22,
        fontWeight: '700',
        color: '#FFFFFF',
        textShadowColor: 'rgba(0, 0, 0, 0.7)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 5,
    },
    clearAllButton: {
        padding: 12,
        borderRadius: 28,
        backgroundColor: 'rgba(0,0,0,0.4)',
        marginLeft: 10,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: 12,
        paddingVertical: 24,
    },
    sectionTitle: {
        marginBottom: 18,
        fontSize: 24,
        fontWeight: '700',
    },
    chatSummaryCardContainer: {
        marginBottom: 18,
        borderRadius: 20,
    },
    chatSummaryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        borderRadius: 20,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
        elevation: 8,
        borderWidth: Platform.OS === 'android' ? 0 : 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    chatAvatarContainer: {
        marginRight: 18,
    },
    chatAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chatInfo: {
        flex: 1,
        marginRight: 10,
    },
    chatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    assistantName: {
        fontSize: 17,
        fontWeight: '700',
    },
    dateText: {
        fontSize: 13,
        fontWeight: '500',
    },
    snippetText: {
        fontSize: 14.5,
        lineHeight: 21,
        marginTop: 4,
    },
    chatActions: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteButton: {
        padding: 10,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    noChatsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 30,
        marginTop: 40,
        marginBottom: 40,
        borderRadius: 24,
    },
    noChatsIconOuterRing: {
        width: 130,
        height: 130,
        borderRadius: 65,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 28,
    },
    noChatsIconContainer: {
        width: 110,
        height: 110,
        borderRadius: 55,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noChatsText: {
        fontSize: 22,
        fontWeight: '600',
        marginBottom: 14,
        textAlign: 'center',
    },
    noChatsSubText: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 23,
        paddingHorizontal: 10,
    },
    examplePromptCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 25,
        marginBottom: 14,
        borderWidth: 1.5,
    },
    promptIcon: {
        marginRight: 16,
    },
    promptText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
    },
    newChatButton: {
        paddingVertical: 20,
        paddingHorizontal: 24,
        borderRadius: 35,
        marginTop: 30,
        marginBottom: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    newChatIcon: {
        marginRight: 12,
    },
    newChatText: {
        fontWeight: '700',
        fontSize: 18,
    },
}); 