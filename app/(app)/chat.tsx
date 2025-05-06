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
    View
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
            if (storedHistory) {
                const parsedHistory = JSON.parse(storedHistory) || {};
                console.log('[ChatScreen] Loaded chat history');
                
                // Extract conversations as an array and sort by timestamp (newest first)
                const conversationsArray = Object.values(parsedHistory.conversations || {}) as Array<{
                    id: string;
                    timestamp: number;
                    messages: ChatMessage[];
                }>;
                
                conversationsArray.sort((a, b) => b.timestamp - a.timestamp);
                
                // If we have a specific conversation ID, load that one
                if (conversationIdParam) {
                    const targetConversation = conversationsArray.find(c => c.id === conversationIdParam);
                    if (targetConversation) {
                        setMessages(targetConversation.messages);
                        setCurrentConversationId(targetConversation.id);
                        console.log(`[ChatScreen] Loaded specific conversation: ${targetConversation.id}`);
                    } else {
                        // Conversation not found, start a new one
                        console.log(`[ChatScreen] Conversation ${conversationIdParam} not found, starting new`);
                        setCurrentConversationId(`conversation-${Date.now()}`);
                    }
                } 
                // If we have an initial message, start a new conversation
                else if (initialMessage) {
                    setCurrentConversationId(`conversation-${Date.now()}`);
                }
                // Otherwise, load the most recent conversation if available
                else if (conversationsArray.length > 0) {
                    setMessages(conversationsArray[0].messages);
                    setCurrentConversationId(conversationsArray[0].id);
                    console.log(`[ChatScreen] Loaded most recent conversation: ${conversationsArray[0].id}`);
                } else {
                    // No conversations yet, start a new one
                    setCurrentConversationId(`conversation-${Date.now()}`);
                }
            } else {
                // No stored history at all, start a new conversation
                setCurrentConversationId(`conversation-${Date.now()}`);
                console.log('[ChatScreen] No chat history found, starting new conversation');
            }
        } catch (error) {
            console.error('[ChatScreen] Failed to load chat history:', error);
            // Ensure we have a conversation ID even if loading failed
            setCurrentConversationId(`conversation-${Date.now()}`);
        }
    }, [conversationIdParam, initialMessage]);

    const saveChatHistory = useCallback((updatedMessages: ChatMessage[]) => {
        try {
            // Get the current history store or initialize a new one
            const historyStore = storage.getString(CHAT_HISTORY_KEY);
            let chatHistory = historyStore ? JSON.parse(historyStore) : { conversations: {} };
            
            // Ensure the conversations object exists
            if (!chatHistory.conversations) {
                chatHistory.conversations = {};
            }
            
            // Update the current conversation
            chatHistory.conversations[currentConversationId] = {
                id: currentConversationId,
                timestamp: Date.now(),
                messages: updatedMessages
            };
            
            // Limit to MAX_CHATS conversations (keeping the most recent ones)
            const conversationIds = Object.keys(chatHistory.conversations);
            if (conversationIds.length > MAX_CHATS) {
                // Sort by timestamp (newest first)
                conversationIds.sort((a, b) => 
                    chatHistory.conversations[b].timestamp - chatHistory.conversations[a].timestamp
                );
                
                // Keep only the MAX_CHATS most recent conversations
                const conversationsToKeep: Record<string, any> = {};
                conversationIds.slice(0, MAX_CHATS).forEach(id => {
                    conversationsToKeep[id] = chatHistory.conversations[id];
                });
                
                chatHistory.conversations = conversationsToKeep;
            }
            
            // Save updated history to storage
            storage.set(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
            console.log(`[ChatScreen] Saved conversation ${currentConversationId} with ${updatedMessages.length} messages`);
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
        addMessage(`🤖 Procesando: ${actionDetails.type}...`, 'agent');
        console.log('[ChatScreen] Handling action:', actionDetails);

        try {
            // Usar nuestro nuevo manejador modular de acciones del wallet
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
                    // Si falla, usar el mensaje de respuesta predeterminado
                    addMessage(result.responseMessage, 'agent');
                }
            } else {
                // Si no hay datos para reportar o la acción falló, usar el mensaje predeterminado
                addMessage(result.responseMessage, 'agent');
            }
            
        } catch (error: any) {
            console.error('[ChatScreen] Action handling error:', error);
            // Mostrar un mensaje de error amigable para el usuario
            addMessage(`Lo siento, algo salió mal: ${error.message || 'Error desconocido'}`, 'agent');
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
            backgroundColor: isDark ? '#0A0E17' : '#F5F7FA' 
        },
        headerStyle: { 
            ...styles.header, 
            backgroundColor: isDark ? '#1A1F38' : '#FFFFFF' 
        },
        inputContainerStyle: { 
            ...styles.inputContainer, 
            backgroundColor: isDark ? '#1A1F38' : '#FFFFFF',
            borderTopColor: isDark ? '#252D4A' : '#E8EAF6',
        },
        textInputStyle: {
            ...styles.input,
            backgroundColor: isDark ? '#252D4A' : '#E8EAF6',
            color: isDark ? '#FFFFFF' : '#0A0E17'
        },
        headerIconColor: isDark ? '#FFFFFF' : '#3A5AFF',
        sendIconColor: isDark ? '#FFFFFF' : '#3A5AFF',
        placeholderColor: isDark ? '#9BA1A6' : '#6C7A9C',
        userBubbleColor: isDark ? '#3A5AFF' : '#D1E4FF',
        agentBubbleColor: isDark ? '#252D4A' : '#E8EAF6',
        clearButtonBg: isDark ? '#252D4A' : '#E8EAF6',
    }), [isDark]);

    // --- Render Logic ---
    const renderItem = useCallback(({ item }: { item: ChatMessage }) => (
        <View
            style={[
                styles.messageBubble,
                item.sender === 'user' ? styles.userBubble : styles.agentBubble,
                { 
                    backgroundColor: item.sender === 'user' 
                        ? 'rgba(58, 90, 255, 0.8)' 
                        : 'rgba(255, 255, 255, 0.15)' 
                }
            ]}
        >
            <ThemedText 
                lightColor="#FFFFFF" 
                darkColor="#FFFFFF"
                style={styles.messageText}
            >
                {item.text}
            </ThemedText>
        </View>
    ), []);

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
                        <View style={[styles.clearButtonInner, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}>
                            <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                            <ThemedText style={[styles.clearButtonText, { color: '#FFFFFF' }]}>Clear</ThemedText>
                        </View>
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
                    <View style={[memoizedStyles.inputContainerStyle, { backgroundColor: 'rgba(0, 0, 0, 0.4)' }]}>
                        <TextInput
                            style={[memoizedStyles.textInputStyle, { 
                                backgroundColor: 'rgba(255, 255, 255, 0.15)', 
                                color: '#FFFFFF',
                                borderColor: 'rgba(255, 255, 255, 0.3)',
                                borderWidth: 1
                            }]}
                            value={inputMessage}
                            onChangeText={setInputMessage}
                            placeholder="Type your message..."
                            placeholderTextColor="rgba(255,255,255,0.5)"
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
                                backgroundColor: isLoading ? 'rgba(255, 255, 255, 0.2)' : 'rgba(58, 90, 255, 0.8)',
                            }]}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Ionicons name="send" size={20} color="#FFFFFF" />
                            )}
                        </TouchableOpacity>
                    </View>
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
        padding: 16,
        borderBottomWidth: 0,
    },
    backButton: {
        padding: 10,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 18,
        fontWeight: '600',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 5,
    },
    clearButton: {
        paddingHorizontal: 4,
    },
    clearButtonInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    clearButtonText: {
        fontSize: 14,
        marginLeft: 4,
        fontWeight: '500',
    },
    messageList: {
        flex: 1,
        paddingHorizontal: 16,
    },
    messageListContent: {
        paddingVertical: 16,
        paddingBottom: 24,
    },
    messageBubble: {
        padding: 12,
        borderRadius: 20,
        marginBottom: 12,
        maxWidth: '80%',
        alignSelf: 'flex-start', // Default to agent alignment
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    messageText: {
        fontSize: 15, 
        lineHeight: 22,
    },
    userBubble: {
        alignSelf: 'flex-end',
        borderBottomRightRadius: 4,
    },
    agentBubble: {
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 12,
        borderTopWidth: 0,
        paddingHorizontal: 16,
    },
    input: {
        flex: 1,
        height: 48,
        borderRadius: 24,
        paddingHorizontal: 16,
        marginRight: 12,
        fontSize: 16,
    },
    sendButton: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 12,
        borderRadius: 24,
        width: 48,
        height: 48,
        marginLeft: 8,
    },
}); 