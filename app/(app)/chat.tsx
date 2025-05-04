import { ThemedText } from '@/components/ThemedText'; // Use your themed text component
import { useTheme } from '@/hooks/ThemeContext'; // Assuming you have a theme hook
import { Ionicons } from '@expo/vector-icons'; // For send icon
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sendMessageToAgent } from '../core/agentApi';
import { storage } from '../core/storage';
import { handleWalletAction } from '../core/walletActionHandler';
import { AIResponse, AgentServiceResponse, ChatMessage } from '../types/agent';

const CHAT_HISTORY_KEY = 'chatHistory';

export default function ChatScreen() {
    const { initialMessage } = useLocalSearchParams<{ initialMessage?: string }>();
    const { colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';
    const flatListRef = useRef<FlatList>(null);
    
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [conversationState, setConversationState] = useState<AIResponse | null>(null);

    // --- Chat History Persistence ---
    const loadChatHistory = useCallback(() => {
        try {
            const storedHistory = storage.getString(CHAT_HISTORY_KEY);
            if (storedHistory) {
                const parsedHistory: ChatMessage[] = JSON.parse(storedHistory);
                // Sort messages by timestamp just in case they are stored out of order
                parsedHistory.sort((a, b) => a.timestamp - b.timestamp);
                setMessages(parsedHistory);
                console.log('[ChatScreen] Loaded chat history');
            } else {
                console.log('[ChatScreen] No chat history found.');
            }
        } catch (error) {
            console.error('[ChatScreen] Failed to load chat history:', error);
        }
    }, []);

    const saveChatHistory = useCallback((currentMessages: ChatMessage[]) => {
        try {
            // Store only a reasonable number of messages if history gets too large
            const historyToSave = currentMessages.slice(-50); // Keep last 50 messages
            storage.set(CHAT_HISTORY_KEY, JSON.stringify(historyToSave));
        } catch (error) {
            console.error('[ChatScreen] Failed to save chat history:', error);
        }
    }, []);

    // --- Message Handling ---
    const addMessage = useCallback((text: string, sender: 'user' | 'agent', actionDetails?: AgentServiceResponse['actionDetails']) => {
        const newMessage: ChatMessage = {
            id: `${sender}-${Date.now()}`,
            text,
            sender,
            timestamp: Date.now(),
            actionRequired: actionDetails
        };
        setMessages(prevMessages => {
            const updatedMessages = [...prevMessages, newMessage];
            saveChatHistory(updatedMessages);
            return updatedMessages;
        });
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }, [saveChatHistory]);

    // --- Action Handling ---
    const handleAgentAction = async (actionDetails: AgentServiceResponse['actionDetails']) => {
        if (!actionDetails || !actionDetails.type) return;

        setIsLoading(true);
        addMessage(`🤖 Processing: ${actionDetails.type}...`, 'agent');
        console.log('[ChatScreen] Handling action:', actionDetails);

        try {
            // Use our new modular wallet action handler
            const result = await handleWalletAction(
                actionDetails.type,
                {
                    recipientAddress: actionDetails.recipientAddress || null,
                    recipientEmail: actionDetails.recipientEmail || null,
                    amount: actionDetails.amount || null,
                    currency: actionDetails.currency || null
                }
            );
            
            // Add the response message to the chat
            addMessage(result.responseMessage, 'agent');
            
        } catch (error: any) {
            console.error('[ChatScreen] Action handling error:', error);
            // Show a user-friendly error message
            addMessage(`Sorry, something went wrong: ${error.message || 'Unknown error'}`, 'agent');
        } finally {
            setIsLoading(false);
        }
    };

    // --- API Call Logic ---
    const callAgentApi = useCallback(async (messageToSend: string, stateToUse: AIResponse | null) => {
        setIsLoading(true);
        try {
            const response = await sendMessageToAgent(messageToSend, stateToUse);
            addMessage(response.responseMessage, 'agent');
            setConversationState(response.newState);

            // Handle actions returned by the agent
            if (response.actionDetails && response.actionDetails.type) {
                await handleAgentAction(response.actionDetails);
            } 

        } catch (error: any) {
            console.error('[ChatScreen] Error calling agent API:', error);
            addMessage(`Error: ${error.message || 'Could not connect to agent.'}`, 'agent');
            // Decide how to handle conversation state on error (e.g., reset?)
            // setConversationState(null);
        } finally {
            setIsLoading(false);
        }
    }, [handleAgentAction]); // Include handleAgentAction if it depends on state/props that change

    // --- Welcome Message ---
    const showWelcomeMessage = useCallback(() => {
        if (messages.length === 0 && !initialMessage) {
            addMessage("👋 Welcome to Movya Assistant! I can help you with your wallet transactions, balance checks, and more. How can I assist you today?", 'agent');
        }
    }, [messages.length, initialMessage, addMessage]);

    // --- Effects ---
    useEffect(() => {
        loadChatHistory();
        
        // Handle initial message if provided
        if (initialMessage) {
            addMessage(initialMessage, 'user');
            callAgentApi(initialMessage, null); // Start conversation with initial message
        }
    }, [initialMessage, loadChatHistory, callAgentApi]); // Dependencies for effect
    
    // Show welcome message after loading history (if needed)
    useEffect(() => {
        showWelcomeMessage();
    }, [showWelcomeMessage]);

    // --- Send Handler ---
    const handleSend = () => {
        if (inputMessage.trim() && !isLoading) {
            const messageToSend = inputMessage.trim();
            addMessage(messageToSend, 'user');
            setInputMessage('');
            callAgentApi(messageToSend, conversationState);
        }
    };

    // --- Render Logic ---
    const renderItem = ({ item }: { item: ChatMessage }) => (
        <View
            style={[
                styles.messageBubble,
                item.sender === 'user' ? styles.userBubble : styles.agentBubble,
                item.sender === 'user'
                    ? { backgroundColor: isDark ? '#3A5AFF' : '#D1E4FF' }
                    : { backgroundColor: isDark ? '#252D4A' : '#E8EAF6' },
            ]}
        >
            <ThemedText lightColor="#0A0E17" darkColor="#FFFFFF">{item.text}</ThemedText>
        </View>
    );

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#0A0E17' : '#F5F7FA' }]} edges={['bottom']}>
            {/* Header with back button */}
            <View style={[styles.header, { backgroundColor: isDark ? '#1A1F38' : '#FFFFFF' }]}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color={isDark ? '#FFFFFF' : '#3A5AFF'} />
                </TouchableOpacity>
                <ThemedText type="defaultSemiBold" style={styles.headerTitle}>Movya Assistant</ThemedText>
                <View style={styles.headerRight} />
            </View>
            
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    style={styles.messageList}
                    contentContainerStyle={{ paddingVertical: 10 }}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                />
                <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1A1F38' : '#FFFFFF' }]}>
                    <TextInput
                        style={[
                            styles.input,
                            { 
                                backgroundColor: isDark ? '#252D4A' : '#E8EAF6',
                                color: isDark ? '#FFFFFF' : '#0A0E17'
                            }
                        ]}
                        value={inputMessage}
                        onChangeText={setInputMessage}
                        placeholder="Type your message..."
                        placeholderTextColor={isDark ? '#9BA1A6' : '#6C7A9C'}
                        editable={!isLoading}
                    />
                    <TouchableOpacity onPress={handleSend} disabled={isLoading} style={styles.sendButton}>
                        {isLoading ? (
                            <ActivityIndicator size="small" color={isDark ? '#FFFFFF' : '#3A5AFF'} />
                        ) : (
                            <Ionicons name="send" size={24} color={isDark ? '#FFFFFF' : '#3A5AFF'} />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 18,
    },
    headerRight: {
        width: 40, // Balance the header
    },
    messageList: {
        flex: 1,
        paddingHorizontal: 10,
    },
    messageBubble: {
        padding: 12,
        borderRadius: 18,
        marginBottom: 8,
        maxWidth: '80%',
        alignSelf: 'flex-start', // Default to agent alignment
    },
    userBubble: {
        alignSelf: 'flex-end',
        // Colors set dynamically
    },
    agentBubble: {
        alignSelf: 'flex-start',
         // Colors set dynamically
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: '#ccc', // Adjust color for theme
    },
    input: {
        flex: 1,
        height: 40,
        borderRadius: 20,
        paddingHorizontal: 15,
        marginRight: 10,
        // Background and text color set dynamically
    },
    sendButton: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8,
    },
}); 