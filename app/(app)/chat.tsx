import { ThemedText } from '@/components/ThemedText'; // Use your themed text component
import { useTheme } from '@/hooks/ThemeContext'; // Assuming you have a theme hook
import { Ionicons } from '@expo/vector-icons'; // For send icon
import { ResizeMode, Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sendMessageToAgent } from '../core/agentApi';
import { storage } from '../core/storage';
import { handleWalletAction, reportActionResultToAgent } from '../core/walletActionHandler';
import { AIResponse, AgentServiceResponse, ChatMessage } from '../types/agent';

const CHAT_HISTORY_KEY = 'chatHistory';
const MAX_CHATS = 3;
const MAX_MESSAGES_PER_CONVERSATION = 50;

export default function ChatScreen() {
    const searchParams = useLocalSearchParams();
    const initialMessage = searchParams.initialMessage as string | undefined;
    const conversationIdParam = searchParams.conversationId as string | undefined;
    const fromScreen = searchParams.from as string | undefined;
    
    const { colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';
    const flatListRef = useRef<FlatList>(null);
    
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [conversationState, setConversationState] = useState<AIResponse | null>(null);
    const [initialMessageSent, setInitialMessageSent] = useState(false);
    const [currentConversationId, setCurrentConversationId] = useState<string>('');

    // --- Chat History Persistence ---
    const loadChatHistory = useCallback(() => {
        try {
            const storedHistory = storage.getString(CHAT_HISTORY_KEY);
            console.log('[ChatScreen] Attempting to load chat history. Raw stored string:', storedHistory ? `Found (length: ${storedHistory.length})` : 'Not found');
            
            let parsedHistory: any = null;
            if (storedHistory) {
                try {
                    parsedHistory = JSON.parse(storedHistory);
                    console.log('[ChatScreen] Parsed stored history:', parsedHistory);
                } catch (e) {
                    console.error('[ChatScreen] Failed to parse stored history JSON:', e);
                    // Fall through, will be treated as no valid history
                }
            }
            
            // Check if parsedHistory has the correct structure
            if (parsedHistory && typeof parsedHistory === 'object' && !Array.isArray(parsedHistory) && parsedHistory.conversations && typeof parsedHistory.conversations === 'object') {
                const conversationsMap = parsedHistory.conversations as Record<string, { id: string; timestamp: number; messages: ChatMessage[] }>;
                const conversationsArray = Object.values(conversationsMap);
                
                console.log(`[ChatScreen] Found ${conversationsArray.length} conversations in correct format.`);
                
                conversationsArray.sort((a, b) => b.timestamp - a.timestamp); // Newest first
                
                if (conversationIdParam) {
                    const targetConversation = conversationsArray.find(c => c.id === conversationIdParam);
                    if (targetConversation) {
                        setMessages(targetConversation.messages);
                        setCurrentConversationId(targetConversation.id);
                        console.log(`[ChatScreen] Loaded specific conversation from history: ${targetConversation.id} with ${targetConversation.messages.length} messages.`);
                    } else {
                        console.log(`[ChatScreen] Conversation ID ${conversationIdParam} provided but not found. Starting new.`);
                        setCurrentConversationId(`conversation-${Date.now()}`);
                        setMessages([]); // Start with empty messages for a new conversation
                    }
                } else if (initialMessage) {
                    const newConversationId = `conversation-${Date.now()}`;
                    setCurrentConversationId(newConversationId);
                    setMessages([]);
                    console.log(`[ChatScreen] Initial message provided. Starting new conversation: ${newConversationId}`);
                } else if (conversationsArray.length > 0) {
                    const mostRecentConversation = conversationsArray[0];
                    setMessages(mostRecentConversation.messages);
                    setCurrentConversationId(mostRecentConversation.id);
                    console.log(`[ChatScreen] Loaded most recent conversation from history: ${mostRecentConversation.id} with ${mostRecentConversation.messages.length} messages.`);
                } else {
                    const newConversationId = `conversation-${Date.now()}`;
                    setCurrentConversationId(newConversationId);
                    setMessages([]);
                    console.log(`[ChatScreen] No conversations in history. Starting new: ${newConversationId}`);
                }
            } else {
                // Stored history is missing, malformed (e.g. an array), or doesn't have 'conversations'
                if (parsedHistory) {
                     console.warn('[ChatScreen] Chat history is malformed or in old format. Will start new conversation logic. Content:', parsedHistory);
                } else if (storedHistory) {
                    console.warn('[ChatScreen] Chat history string was present but could not be parsed or was null/undefined after parse. Starting new conversation logic.');
                } else {
                    console.log('[ChatScreen] No chat history found in storage. Starting new conversation.');
                }

                const newConversationId = `conversation-${Date.now()}`;
                setCurrentConversationId(newConversationId);
                setMessages([]); // Ensure messages are empty for a new conversation
                // If an initial message is provided, it will be handled by its specific useEffect
                if (initialMessage && !conversationIdParam) { // Only log if not trying to load a specific non-existent one
                     console.log(`[ChatScreen] New conversation for initial message: ${newConversationId}`);
                }
            }
        } catch (error) {
            console.error('[ChatScreen] Critical error in loadChatHistory:', error);
            const newConversationId = `conversation-${Date.now()}`;
            setCurrentConversationId(newConversationId);
            setMessages([]);
            console.log(`[ChatScreen] Due to error in loading history, started new conversation: ${newConversationId}`);
        }
    }, [conversationIdParam, initialMessage]);

    const saveChatHistory = useCallback((updatedMessages: ChatMessage[]) => {
        try {
            const historyStore = storage.getString(CHAT_HISTORY_KEY);
            let parsedStore: any = null;
            if (historyStore) {
                try {
                    parsedStore = JSON.parse(historyStore);
                } catch (e) {
                    console.error('[ChatScreen] Failed to parse existing chat history for saving, will overwrite with new structure.', e);
                    // Malformed JSON, treat as if no history, parsedStore remains null
                }
            }

            // Initialize chatHistory correctly, ensuring it's an object with a 'conversations' property.
            let chatHistory: { conversations: Record<string, { id: string; timestamp: number; messages: ChatMessage[] }> };
            if (parsedStore && typeof parsedStore === 'object' && !Array.isArray(parsedStore) && parsedStore.conversations && typeof parsedStore.conversations === 'object') {
                chatHistory = parsedStore;
                 console.log('[ChatScreen] Successfully loaded existing history structure for saving.');
            } else {
                if (parsedStore) {
                    console.warn('[ChatScreen] Existing chat history is malformed or in old format during save. Initializing new valid history structure. Malformed data:', parsedStore);
                } else if (historyStore) {
                     console.warn('[ChatScreen] Chat history string was present but could not be parsed for saving. Initializing new valid history structure.');
                } else {
                    console.log('[ChatScreen] No existing chat history. Initializing new valid history structure for saving.');
                }
                chatHistory = { conversations: {} };
            }
            
            const limitedMessages = updatedMessages.slice(-MAX_MESSAGES_PER_CONVERSATION);
            
            chatHistory.conversations[currentConversationId] = {
                id: currentConversationId,
                timestamp: Date.now(),
                messages: limitedMessages
            };
            
            console.log('[ChatScreen] Preparing to save chat history:', {
                conversationId: currentConversationId,
                messageCount: limitedMessages.length,
                totalConversationsBeforeTrim: Object.keys(chatHistory.conversations).length
            });
            
            const conversationEntries = Object.entries(chatHistory.conversations);
            if (conversationEntries.length > MAX_CHATS) {
                conversationEntries.sort(([, convoA], [, convoB]) => 
                    convoB.timestamp - convoA.timestamp
                );
                
                const newConversations: Record<string, { id: string; timestamp: number; messages: ChatMessage[] }> = {};
                conversationEntries.slice(0, MAX_CHATS).forEach(([id, convo]) => {
                    newConversations[id] = convo;
                });
                
                chatHistory.conversations = newConversations;
                console.log(`[ChatScreen] Limited conversations to ${MAX_CHATS}. Kept IDs:`, Object.keys(newConversations));
            }
            
            storage.set(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
            console.log(`[ChatScreen] Successfully saved conversation ${currentConversationId} with ${limitedMessages.length} messages. Total conversations now: ${Object.keys(chatHistory.conversations).length}.`);

        } catch (error) {
            console.error('[ChatScreen] Failed to save chat history:', error);
        }
    }, [currentConversationId]);

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
        console.log('[ChatScreen] Handling action:', actionDetails);

        try {
            // Usar nuestro manejador modular de acciones del wallet
            const result = await handleWalletAction(
                actionDetails.type,
                {
                    recipientAddress: actionDetails.recipientAddress || null,
                    recipientEmail: actionDetails.recipientEmail || null,
                    amount: actionDetails.amount || null,
                    currency: actionDetails.currency || null
                }
            );
            
            // Verificar si la acción tiene datos para reportar al agente
            if (result.data && result.success) {
                try {
                    // Reportar el resultado al agente para obtener una respuesta natural
                    const aiResponseMessage = await reportActionResultToAgent(result.data);
                    // Añadir la respuesta generada por la IA al chat
                    addMessage(aiResponseMessage, 'agent');
                } catch (reportError: any) {
                    console.error('[ChatScreen] Error al reportar resultado al agente:', reportError);
                    // Si falla, usar el mensaje de respuesta del resultado de la acción
                    addMessage(result.responseMessage, 'agent');
                }
            } else {
                // Si no hay datos para reportar o la acción falló, usamos el mensaje del resultado
                addMessage(result.responseMessage, 'agent');
            }
            
        } catch (error: any) {
            console.error('[ChatScreen] Action handling error:', error);
            // Mensaje de error genérico sin hardcodear información específica
            addMessage(`Error al procesar la acción solicitada. Por favor, inténtalo más tarde.`, 'agent');
        } finally {
            setIsLoading(false);
        }
    };

    // --- API Call Logic ---
    const callAgentApi = useCallback(async (messageToSend: string, stateToUse: AIResponse | null) => {
        // No mostrar al usuario que estamos reintentando
        let attempts = 0;
        const MAX_ATTEMPTS = 2;
        let lastError: any = null;
        
        while (attempts < MAX_ATTEMPTS) {
            attempts++;
            try {
                console.log(`[ChatScreen] Intento ${attempts}/${MAX_ATTEMPTS} de enviar mensaje`);
                const response = await sendMessageToAgent(messageToSend, stateToUse);
                
                // Éxito: añadir mensaje de respuesta y salir del bucle
                addMessage(response.responseMessage, 'agent');
                setConversationState(response.newState);

                // Manejar acciones devueltas por el agente
                if (response.actionDetails && response.actionDetails.type) {
                    await handleAgentAction(response.actionDetails);
                }
                
                // Si llegamos aquí, la llamada fue exitosa
                return;
                
            } catch (error: any) {
                console.error(`[ChatScreen] Error en intento ${attempts}:`, error);
                lastError = error;
                
                // Esperar un breve momento antes de reintentar (solo si hay más intentos)
                if (attempts < MAX_ATTEMPTS) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }
        
        // Si llegamos aquí, todos los intentos fallaron - solo mostrar UN mensaje de error
        console.error('[ChatScreen] Todos los intentos fallaron:', lastError);
        addMessage(`Error: ${lastError?.message || 'No se pudo conectar al agente.'}`, 'agent');
    }, [handleAgentAction, addMessage]);

    // --- Welcome Message ---
    const showWelcomeMessage = useCallback(() => {
        if (messages.length === 0 && !initialMessage) {
            addMessage("👋 Welcome to Movya Assistant! I can help you with your wallet transactions, balance checks, and more. How can I assist you today?", 'agent');
        }
    }, [messages.length, initialMessage, addMessage]);

    // --- Effects ---
    // Effect to load chat history when the component mounts
    useEffect(() => {
        loadChatHistory();
    }, [loadChatHistory]);
    
    // Effect to handle initial message if provided
    useEffect(() => {
        if (initialMessage && !initialMessageSent && !isLoading && messages.length === 0) {
            console.log('[ChatScreen] Processing initial message:', initialMessage);
            
            // Mark that we've processed the initial message
            setInitialMessageSent(true);
            
            // Send the initial message
            addMessage(initialMessage, 'user');
            
            // Set loading to prevent duplicate sends
            setIsLoading(true);
            
            // Call the API
            callAgentApi(initialMessage, null)
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [initialMessage, initialMessageSent, isLoading, messages.length, addMessage, callAgentApi]);
    
    // Show welcome message after loading history (if needed)
    useEffect(() => {
        if (!initialMessage && messages.length === 0) {
            showWelcomeMessage();
        }
    }, [showWelcomeMessage, messages.length, initialMessage]);

    // --- Send Handler ---
    const handleSend = useCallback(() => {
        if (inputMessage.trim() && !isLoading) {
            const messageToSend = inputMessage.trim();
            
            // Solo añadir el mensaje del usuario una vez, antes de cualquier intento
            addMessage(messageToSend, 'user');
            setInputMessage('');
            
            // Bloquear envíos adicionales mientras se procesa
            setIsLoading(true);
            
            // Llamar a la API y manejar los reintentos internamente
            callAgentApi(messageToSend, conversationState)
                .finally(() => {
                    // Desbloquear después de completar (éxito o error)
                    setIsLoading(false);
                });
        }
    }, [inputMessage, isLoading, addMessage, callAgentApi, conversationState]);

    // Memoizar estilos que dependen del tema para evitar recálculos innecesarios
    const memoizedStyles = useMemo(() => ({
        safeAreaStyle: { 
            ...styles.safeArea, 
        },
        headerStyle: { 
            ...styles.header, 
        },
        inputContainerStyle: { 
            ...styles.inputContainer,
            // backgroundColor se aplicará con LinearGradient directamente en el JSX
            borderTopColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)',
        },
        textInputStyle: { 
            ...styles.input,
        },
    }), [isDark]);

    // --- Render Logic ---
    const renderItem = useCallback(({ item, index }: { item: ChatMessage, index: number }) => {
        // Animation for each message item
        // const itemFadeAnim = useRef(new Animated.Value(0)).current;
        // const itemSlideAnim = useRef(new Animated.Value(10)).current; // Start 10px down

        // useEffect(() => {
        //     Animated.parallel([
        //         Animated.timing(itemFadeAnim, {
        //             toValue: 1,
        //             duration: 300,
        //             delay: index < 5 ? index * 50 : 0, // Stagger initial messages slightly, then instant for new ones if list is long
        //             useNativeDriver: true,
        //         }),
        //         Animated.timing(itemSlideAnim, {
        //             toValue: 0,
        //             duration: 300,
        //             delay: index < 5 ? index * 50 : 0,
        //             useNativeDriver: true,
        //         })
        //     ]).start();
        // }, [itemFadeAnim, itemSlideAnim, index]);

        return (
            // <Animated.View 
            //     style={{
            //         opacity: itemFadeAnim, 
            //         transform: [{ translateY: itemSlideAnim }]
            //     }}
            // >
                <View
                    style={[
                        styles.messageBubble,
                        item.sender === 'user' ? styles.userBubble : styles.agentBubble,
                        {
                            backgroundColor: item.sender === 'user'
                                ? (isDark ? 'rgba(0, 87, 255, 0.95)' : 'rgba(0, 98, 255, 1)') 
                                : (isDark ? 'rgba(44, 48, 58, 0.92)' : 'rgba(252, 253, 255, 0.98)'),
                            borderColor: item.sender === 'user'
                                ? (isDark ? 'rgba(0, 69, 204, 0.9)' : 'rgba(0, 80, 208, 1)')
                                : (isDark ? 'rgba(68, 73, 87, 0.85)' : 'rgba(218, 223, 230, 0.95)'),
                            borderWidth: 1,
                            // flexDirection: item.sender === 'agent' ? 'row' : 'column', // Reverted
                            // alignItems: item.sender === 'agent' ? 'flex-start' : 'stretch', // Reverted
                        }
                    ]}
                >
                    {/* {item.sender === 'agent' && ( // Reverted
                        <Ionicons 
                            name="sparkles-outline" 
                            size={18} 
                            color={isDark ? '#A0B0D0' : '#506080'} 
                            style={styles.agentIcon} 
                        />
                    )} */}
                    <ThemedText
                        style={[
                            styles.messageText,
                            {
                                color: item.sender === 'user'
                                    ? '#FFFFFF' 
                                    : (isDark ? '#E8ECF5' : '#1C2026'),
                                // flexShrink: item.sender === 'agent' ? 1 : 0, // Reverted
                            }
                        ]}
                    >
                        {item.text}
                    </ThemedText>
                </View>
            // </Animated.View>
        );
    }, [isDark]);

    // Confirm before clearing chat history
    const confirmClearHistory = useCallback(() => {
        Alert.alert(
            "Clear Chat History",
            "Are you sure you want to clear all messages?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Clear",
                    style: "destructive",
                    onPress: () => {
                        // Clear messages in state
                        setMessages([]);
                        
                        // Remove stored chat history
                        try {
                            storage.delete(CHAT_HISTORY_KEY);
                            console.log('[ChatScreen] Chat history cleared');
                            
                            // Reset conversation ID
                            setCurrentConversationId(`conversation-${Date.now()}`);
                            
                            // Show welcome message after clearing
                            showWelcomeMessage();
                        } catch (error) {
                            console.error('[ChatScreen] Failed to clear chat history:', error);
                        }
                    }
                }
            ]
        );
    }, [showWelcomeMessage]);

    // Function to handle back navigation intelligently
    const handleBackNavigation = useCallback(() => {
        // If we came from chat history (conversationId present or explicitly set from=history), go back to history
        if (conversationIdParam || fromScreen === 'history') {
            router.push('/(app)/chat-history');
        } 
        // If we came from wallet with an initial message, go back to wallet
        else if (initialMessage || fromScreen === 'wallet') {
            router.push('/(app)/wallet');
        }
        // Default fallback - try router.back() first, then explicit navigation if needed
        else {
            if (router.canGoBack()) {
                router.back();
            } else {
                // Fallback to wallet as the main app screen
                router.push('/(app)/wallet');
            }
        }
    }, [conversationIdParam, initialMessage, fromScreen]);

    return (
        <View style={styles.container}>
            {/* Background Video */}
            <View style={styles.videoContainer}>
                <Video
                    source={require('../../assets/bg/start-screen-bg.mp4')}
                    style={StyleSheet.absoluteFill}
                    resizeMode={ResizeMode.COVER}
                    isLooping
                    shouldPlay
                    isMuted
                />
                <LinearGradient
                    colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.4)']}
                    style={StyleSheet.absoluteFill}
                />
            </View>

            <SafeAreaView style={memoizedStyles.safeAreaStyle} edges={['bottom']}>
                {/* Header with back button */}
                <View style={[memoizedStyles.headerStyle, { backgroundColor: 'transparent' }]}>
                    <TouchableOpacity 
                        style={styles.backButton}
                        onPress={handleBackNavigation}
                    >
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <ThemedText type="defaultSemiBold" style={[styles.headerTitle, { color: '#FFFFFF' }]}>Movya Assistant</ThemedText>
                    
                    <TouchableOpacity 
                        style={styles.clearButton}
                        onPress={confirmClearHistory}
                    >
                        <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
                
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.container}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                    enabled={Platform.OS === 'ios'}
                >
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id}
                        style={styles.messageList}
                        contentContainerStyle={styles.messageListContent}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
                        removeClippedSubviews={false}
                        keyboardShouldPersistTaps="handled"
                        initialNumToRender={10}
                        maxToRenderPerBatch={10}
                        windowSize={10}
                    />
                    <LinearGradient
                        colors={isDark 
                            ? ['rgba(12, 18, 30, 0.85)', 'rgba(20, 28, 45, 0.75)'] 
                            : ['rgba(250, 252, 255, 0.9)', 'rgba(240, 243, 248, 0.8)']}
                        style={memoizedStyles.inputContainerStyle} // Aplica padding y borderTopColor del StyleSheet
                    >
                        <TextInput
                            style={[styles.input, { 
                                backgroundColor: isDark ? '#181C25' : '#FFFFFF', 
                                color: isDark ? '#E8ECF5' : '#0A1A3A',
                                borderColor: isDark ? 'rgba(80, 90, 110, 0.7)' : 'rgba(190, 195, 205, 1)',
                            }]}
                            value={inputMessage}
                            onChangeText={setInputMessage}
                            placeholder="Type your message..."
                            placeholderTextColor={isDark ? 'rgba(200,210,230,0.5)' : 'rgba(10,26,58,0.5)'}
                            editable={!isLoading}
                            keyboardType="default"
                            returnKeyType="send"
                            onSubmitEditing={handleSend}
                            blurOnSubmit={false}
                        />
                        <TouchableOpacity 
                            onPress={handleSend} 
                            disabled={isLoading} 
                            style={[styles.sendButton, {
                                backgroundColor: isLoading 
                                    ? (isDark ? 'rgba(80, 90, 110, 0.7)' : '#CAD5FF')
                                    : (isDark ? '#0062FF' : '#0057FF'), 
                                shadowColor: isDark ? '#002A66' : '#003C99',
                                shadowOffset: { width: 0, height: 3 }, 
                                shadowOpacity: 0.35,
                                shadowRadius: 4,
                            }]}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color={isDark ? '#FFFFFF' : '#003C99'} />
                            ) : (
                                <Ionicons name="send" size={20} color="#FFFFFF" />
                            )}
                        </TouchableOpacity>
                    </LinearGradient>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16, 
        paddingVertical: 12,
        paddingTop: Platform.OS === 'ios' ? 12 : (Platform.OS === 'android' ? 20 : 12), // Adjusted paddingTop for Android status bar
        borderBottomWidth: 0, // Removing border as background video provides separation
    },
    backButton: {
        padding: 12,
        borderRadius: 28, // Consistent with chat-history
        backgroundColor: 'rgba(0, 0, 0, 0.4)', // Consistent with chat-history
        marginRight: 10,
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 22, 
        fontWeight: '700', 
        color: '#FFFFFF', // Ensure color for visibility on video
        textShadowColor: 'rgba(0, 0, 0, 0.7)', // Consistent with chat-history
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 5,
    },
    clearButton: {
        padding: 12, // Consistent touch target
        borderRadius: 28, // Consistent with chat-history
        backgroundColor: 'rgba(0,0,0,0.4)', // Consistent with chat-history
        marginLeft: 10, // Spacing
    },
    messageList: {
        flex: 1,
        paddingHorizontal: 12, // Slightly reduced for wider bubbles
    },
    messageListContent: {
        paddingVertical: 20, // Increased padding for better spacing
        paddingBottom: 24, // Ensure space above input
    },
    messageBubble: {
        paddingVertical: 12,
        paddingHorizontal: 18, 
        borderRadius: 22, 
        marginBottom: 14, 
        maxWidth: '85%', 
        elevation: 6, // Sombra más notable
        shadowColor: '#000000', 
        shadowOffset: { width: 0, height: 4 }, // Sombra más larga
        shadowOpacity: 0.3, // Sombra más oscura
        shadowRadius: 6, // Sombra más difusa
        // borderWidth y borderColor se aplican dinámicamente en renderItem
    },
    messageText: {
        fontSize: 16.5, // Ligeramente más grande
        lineHeight: 24, // Mejor interlineado
    },
    userBubble: {
        alignSelf: 'flex-end',
        borderBottomRightRadius: 8, // Ajuste de radio
        borderTopRightRadius: 22,
        borderBottomLeftRadius: 22,
        borderTopLeftRadius: 22,
    },
    agentBubble: {
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 8, 
        borderTopLeftRadius: 22,
        borderBottomRightRadius: 22,
        borderTopRightRadius: 22,
    },
    // agentIcon: { // Reverted - Style for the agent's icon in the bubble
    //     marginRight: 8,
    //     marginTop: 2, // Fine-tune vertical alignment with text
    // },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center', 
        paddingVertical: 12, // Aumentado para más espacio
        paddingHorizontal: 14,
        borderTopWidth: 1, // Añadir una línea superior sutil
        // backgroundColor se establece en memoizedStyles
    },
    input: {
        flex: 1,
        height: 50, // Altura estándar, ligeramente reducida de la anterior
        borderRadius: 25, // Redondeo completo
        paddingHorizontal: 18, 
        marginRight: 10, 
        fontSize: 16.5,
        borderWidth: 1, // Asegurar que el borde se muestre si se define color
        // backgroundColor, color, borderColor se establecen en JSX
    },
    sendButton: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 50, // Botón circular estándar
        height: 50, 
        borderRadius: 25, 
        elevation: 4, // Sombra para el botón
    },
}); 