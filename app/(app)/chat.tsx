import * as React from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	ScrollView,
	Platform,
	KeyboardAvoidingView,
	FlatList,
	ActivityIndicator,
	Keyboard,
	Modal,
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { StatusBar } from 'expo-status-bar';
import ArrowIcon from '../../assets/arrow.svg';
import { sendMessageToAgent, reportActionResult } from "../core/agentApi";
import { storage } from "../core/storage";
import { AIResponse, AgentServiceResponse, ChatMessage, ActionResultInput } from "../types/agent";
import { useRouter } from "expo-router";

// --- Chat History Constants ---
const CHAT_HISTORY_KEY = 'chatHistory';
const MAX_CHATS = 5; // Keep a few recent chats
const MAX_MESSAGES_PER_CONVERSATION = 50;

const Chat = () => {
	const router = useRouter();
	const flatListRef = React.useRef<FlatList>(null);
	
	// Add keyboard visibility state
	const [keyboardVisible, setKeyboardVisible] = React.useState(false);
	const [showChatHistory, setShowChatHistory] = React.useState(false);
	const [chatHistory, setChatHistory] = React.useState<{ conversations: Record<string, { id: string; timestamp: number; messages: ChatMessage[] }> }>({ conversations: {} });
	const [dynamicSuggestions, setDynamicSuggestions] = React.useState<string[]>([]);

	// --- State Management ---
	const [messages, setMessages] = React.useState<ChatMessage[]>([]);
	const [inputMessage, setInputMessage] = React.useState('');
	const [isLoading, setIsLoading] = React.useState(false);
	const [conversationState, setConversationState] = React.useState<AIResponse | null>(null);
	const [currentConversationId, setCurrentConversationId] = React.useState<string>('');

	// --- Default Suggestions ---
	const defaultSuggestions = [
		"Send Money to a Friend",
		"Send Money to a Wallet", 
		"How to send AVA?",
		"Who are you?"
	];

	// --- Extract Unique Messages from History ---
	const extractUniqueMessages = React.useCallback((conversations: Record<string, { id: string; timestamp: number; messages: ChatMessage[] }>) => {
		const userMessages = new Set<string>();
		
		Object.values(conversations).forEach(conversation => {
			const firstUserMessage = conversation.messages.find(msg => msg.sender === 'user');
			if (firstUserMessage && firstUserMessage.text.length > 10 && firstUserMessage.text.length < 60) {
				userMessages.add(firstUserMessage.text);
			}
		});

		// Convert to array and take only first 4 unique messages
		return Array.from(userMessages).slice(0, 4);
	}, []);

	// --- Get Combined Suggestions ---
	const getCombinedSuggestions = React.useCallback(() => {
		const historyMessages = extractUniqueMessages(chatHistory.conversations);
		const combined = [...historyMessages];
		
		// Fill remaining slots with default suggestions that aren't already included
		defaultSuggestions.forEach(defaultMsg => {
			if (combined.length < 4 && !combined.some(msg => 
				msg.toLowerCase().includes(defaultMsg.toLowerCase()) || 
				defaultMsg.toLowerCase().includes(msg.toLowerCase())
			)) {
				combined.push(defaultMsg);
			}
		});
		
		return combined.slice(0, 4);
	}, [chatHistory, extractUniqueMessages]);

	// --- Load Chat History ---
	const loadChatHistory = React.useCallback(() => {
		try {
			const historyStore = storage.getString(CHAT_HISTORY_KEY);
			if (historyStore) {
				const parsedStore = JSON.parse(historyStore);
				if (parsedStore && typeof parsedStore === 'object' && parsedStore.conversations) {
					setChatHistory(parsedStore);
					// Update dynamic suggestions when history is loaded
					const suggestions = extractUniqueMessages(parsedStore.conversations);
					setDynamicSuggestions(suggestions);
				}
			}
		} catch (error) {
			console.error('[ChatScreen] Failed to load chat history:', error);
		}
	}, [extractUniqueMessages]);

	// --- Load Previous Chat ---
	const loadPreviousChat = React.useCallback((conversationId: string) => {
		const conversation = chatHistory.conversations[conversationId];
		if (conversation) {
			setMessages(conversation.messages);
			setCurrentConversationId(conversationId);
			setConversationState(null); // Reset conversation state for previous chats
			setShowChatHistory(false);
		}
	}, [chatHistory]);

	// --- Start New Chat ---
	const startNewChat = React.useCallback(() => {
		const newConversationId = `conversation-${Date.now()}`;
		setCurrentConversationId(newConversationId);
		setMessages([]);
		setConversationState(null);
		setShowChatHistory(false);
	}, []);

	// --- Format Date ---
	const formatChatDate = React.useCallback((timestamp: number) => {
		const date = new Date(timestamp);
		const now = new Date();
		const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
		
		if (diffInHours < 24) {
			return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		} else if (diffInHours < 48) {
			return 'Yesterday';
		} else {
			return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
		}
	}, []);

	// --- Get Chat Preview ---
	const getChatPreview = React.useCallback((messages: ChatMessage[]) => {
		const lastUserMessage = messages.filter(m => m.sender === 'user').pop();
		return lastUserMessage ? lastUserMessage.text.substring(0, 60) + (lastUserMessage.text.length > 60 ? '...' : '') : 'New chat';
	}, []);

	// --- Chat History Persistence (Save Only) ---
	const saveChatHistory = React.useCallback((updatedMessages: ChatMessage[]) => {
		if (!currentConversationId) {
			console.warn('[ChatScreen] No currentConversationId, cannot save history.');
			return;
		}
		try {
			const historyStore = storage.getString(CHAT_HISTORY_KEY);
			let parsedStore: any = null;
			if (historyStore) {
				try {
					parsedStore = JSON.parse(historyStore);
				} catch (e) {
					console.error('[ChatScreen] Failed to parse existing chat history for saving:', e);
				}
			}

			let chatHistory: { conversations: Record<string, { id: string; timestamp: number; messages: ChatMessage[] }> };
			if (parsedStore && typeof parsedStore === 'object' && !Array.isArray(parsedStore) && parsedStore.conversations && typeof parsedStore.conversations === 'object') {
				chatHistory = parsedStore;
			} else {
				chatHistory = { conversations: {} };
			}

			const limitedMessages = updatedMessages.slice(-MAX_MESSAGES_PER_CONVERSATION);
			chatHistory.conversations[currentConversationId] = {
				id: currentConversationId,
				timestamp: Date.now(),
				messages: limitedMessages
			};

			const conversationEntries = Object.entries(chatHistory.conversations);
			if (conversationEntries.length > MAX_CHATS) {
				conversationEntries.sort(([, convoA], [, convoB]) => convoB.timestamp - convoA.timestamp);
				const newConversations: Record<string, { id: string; timestamp: number; messages: ChatMessage[] }> = {};
				conversationEntries.slice(0, MAX_CHATS).forEach(([id, convo]) => {
					newConversations[id] = convo;
				});
				chatHistory.conversations = newConversations;
			}
			storage.set(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
		} catch (error) {
			console.error('[ChatScreen] Failed to save chat history:', error);
		}
	}, [currentConversationId]);

	// --- Message Handling ---
	const addMessage = React.useCallback((text: string, sender: 'user' | 'agent', actionDetails?: AgentServiceResponse['actionDetails']) => {
		const newMessage: ChatMessage = {
			id: `${sender}-${Date.now()}-${Math.random()}`, // Ensure unique ID
			text,
			sender,
			timestamp: Date.now(),
			actionRequired: actionDetails
		};
		setMessages(prevMessages => {
			const updatedMessages = [...prevMessages, newMessage];
			saveChatHistory(updatedMessages); // Save history after updating state
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
			const result: ActionResultInput = {
				actionType: actionDetails.type,
				status: 'success', // Placeholder
				data: {
					errorMessage: `Action ${actionDetails.type} processed. (Placeholder response)`
				},
			};
			
			const agentResponse = await reportActionResult(result);
			addMessage(agentResponse.responseMessage, 'agent');

		} catch (error: any) {
			console.error('[ChatScreen] Action handling error:', error);
			addMessage(`Error processing action: ${error.message || 'Unknown error'}`, 'agent');
		} finally {
			setIsLoading(false);
		}
	};

	// --- API Call Logic ---
	const callAgentApi = React.useCallback(async (messageToSend: string, stateToUse: AIResponse | null) => {
		setIsLoading(true);
		try {
			const response = await sendMessageToAgent(messageToSend, stateToUse);
			addMessage(response.responseMessage, 'agent', response.actionDetails);
			setConversationState(response.newState);

			// Simplified action handling: if actionDetails are present, process them.
			// The check for confirmationRequired has been removed to fix linter error.
			// If explicit confirmation flow is needed, types and this logic must be updated.
			if (response.actionDetails && response.actionDetails.type) {
				await handleAgentAction(response.actionDetails);
			}
		} catch (error: any) {
			console.error('[ChatScreen] Error calling agent API:', error);
			addMessage(`Error: ${error.message || 'Could not connect to the agent.'}`, 'agent');
		} finally {
			setIsLoading(false);
		}
	}, [addMessage, handleAgentAction]);

	// --- Send Handler ---
	const handleSend = React.useCallback(() => {
		if (inputMessage.trim() && !isLoading) {
			const messageToSend = inputMessage.trim();
			addMessage(messageToSend, 'user');
			setInputMessage(''); // Clear input after adding user message
			callAgentApi(messageToSend, conversationState);
		}
	}, [inputMessage, isLoading, addMessage, callAgentApi, conversationState]);

	// --- Effects ---
	React.useEffect(() => {
		// ALWAYS start a fresh chat session on mount
		const newConversationId = `conversation-${Date.now()}`;
		setCurrentConversationId(newConversationId);
		setMessages([]); // Start with empty messages
		setConversationState(null); // Reset any prior conversation state
		console.log(`[ChatScreen] Starting new, fresh conversation: ${newConversationId}`);
		
		// Load chat history on mount
		loadChatHistory();
	}, []); 

	React.useEffect(() => {
		// Show welcome message if messages are empty (which they will be on fresh load)
		// if (messages.length === 0 && currentConversationId) { 
		// 	addMessage("Hello! I'm Movya. How can I assist you today?", 'agent'); // Updated Welcome Message
		// }
	}, [currentConversationId, addMessage, loadChatHistory]); 

	// Add keyboard listeners
	React.useEffect(() => {
		const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
			setKeyboardVisible(true);
		});
		const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
			setKeyboardVisible(false);
		});

		return () => {
			showSubscription.remove();
			hideSubscription.remove();
		};
	}, []);

	// --- Render Logic ---
	const renderItem = ({ item }: { item: ChatMessage }) => {
		if (item.sender === 'agent') {
			return (
				<View style={styles.agentBubbleContainer}>
					<View style={styles.agentBubble}>
						<View style={styles.agentMessageContent}>
							<View style={styles.agentIconContainer}>
								<LinearGradient
									colors={['#0461F0', '#0477F0']}
									style={styles.agentIconBackground}
								>
									<MaterialIcons name="smart-toy" size={18} color="#FFFFFF" style={styles.agentIcon} />
								</LinearGradient>
							</View>
							<View style={styles.agentMessageTextContainer}>
								<Text style={styles.agentMessageText}>{item.text}</Text>
							</View>
						</View>
						<View style={styles.agentActionsContainer}>
							<TouchableOpacity style={styles.actionButton} onPress={() => console.log('Copy pressed for message:', item.id)}>
								<MaterialIcons name="content-copy" size={15} color="#555" />
							</TouchableOpacity>
							<TouchableOpacity style={styles.actionButton} onPress={() => console.log('Like pressed for message:', item.id)}>
								<MaterialIcons name="thumb-up-off-alt" size={15} color="#555" />
							</TouchableOpacity>
							<TouchableOpacity style={styles.actionButton} onPress={() => console.log('Dislike pressed for message:', item.id)}>
								<MaterialIcons name="thumb-down-off-alt" size={15} color="#555" />
							</TouchableOpacity>
						</View>
					</View>
				</View>
			);
		} else {
			// User message with improved design using LinearGradient
			return (
				<View style={styles.userBubbleContainer}>
					<LinearGradient
						colors={['#0495FF', '#0461F0']}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 0 }}
						style={styles.userBubble}
					>
						<Text style={styles.userMessageText}>{item.text}</Text>
					</LinearGradient>
				</View>
			);
		}
	};

	// --- User Name (Placeholder) ---
	const userName = "User"; // Replace with actual user name logic later

	return (
		<SafeAreaView style={styles.chat} edges={['top', 'left', 'right']}>
			<StatusBar style="light" />
			<Video
				source={require('../../assets/bg/header-bg.webm')}
				style={styles.backgroundVideo}
				isLooping
				shouldPlay
				isMuted
				resizeMode={ResizeMode.COVER}
			/>
			<KeyboardAvoidingView 
				behavior={Platform.OS === "ios" ? "padding" : undefined}
				style={styles.keyboardAvoidingContainer}
				keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
			>
				<View style={styles.content}>
					<View style={[styles.appBar, styles.appBarFlexBox]}>
						<TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
							<MaterialIcons name="arrow-back" size={24} color="#FFF" />
						</TouchableOpacity>
						<View style={[styles.textContent, styles.contentFlexBox]}>
							<Text style={styles.headline} numberOfLines={1}>$0.01</Text>
							<Text style={styles.supportingText} numberOfLines={1}>Total Balance</Text>
						</View>
						<View style={[styles.leadingIconParent, styles.parentFlexBox]}>
							<TouchableOpacity style={styles.headerIconButton} onPress={() => {
								loadChatHistory();
								setShowChatHistory(true);
							}}>
								<MaterialIcons name="chat-bubble-outline" size={24} color="#FFF" />
							</TouchableOpacity>
						</View>
					</View>

					{/* Main content area: either initial prompt or message list */}
					<View style={[styles.textCenteredParent]}>
						{messages.length === 0 ? (
							<View style={[styles.textCentered, styles.textCenteredFlexBox]}>
								<View style={styles.header}>
									<Text style={[styles.hello, styles.helloTypo]}>Hello, </Text>
									<MaskedView
										style={{ height: styles.helloTypo.lineHeight }}
										maskElement={
											<Text style={styles.helloTypo}>{userName}</Text>
										}>
										<LinearGradient
											colors={['#0461F0', '#9CCAFF']}
											start={{ x: 0, y: 0 }}
											end={{ x: 1, y: 0 }}
											style={{ flex: 1 }}
										>
											<Text style={[styles.helloTypo, { opacity: 0 }]}>{userName}</Text>
										</LinearGradient>
									</MaskedView>
								</View>
								<View style={[styles.swipe, styles.swipeFlexBox]}>
									<Text style={[styles.swipe1, styles.timeTypo]}>Swipe to change view</Text>
									<ArrowIcon width={24} height={24} style={styles.swipeChild} />
								</View>
							</View>
						) : (
							<FlatList
								ref={flatListRef}
								data={messages}
								renderItem={renderItem}
								keyExtractor={(item) => item.id}
								style={styles.messagesListContainer}
								contentContainerStyle={styles.messagesListContentContainer}
							/>
						)}

						{/* Suggestions and Input - always at the bottom of textCenteredParent */}
						<View style={[styles.bottomContainer]}>
							<View style={styles.suggestionsCarouselOuterContainer}>
								<ScrollView
									horizontal
									showsHorizontalScrollIndicator={false}
									style={styles.chatSuggestionsScrollView}
									contentContainerStyle={styles.chatSuggestionsContainer}
								>
									<View style={styles.chatSuggestionsRow}>
										{getCombinedSuggestions().map((suggestion, index) => (
											<TouchableOpacity key={index} style={styles.suggestionCard} onPress={() => { setInputMessage(suggestion); callAgentApi(suggestion, conversationState); }}>
												<Text style={[styles.labelText, styles.labelTypo]}>{suggestion}</Text>
											</TouchableOpacity>
										))}
									</View>
								</ScrollView>
								<LinearGradient
									colors={['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 0)']}
									start={{ x: 0, y: 0 }}
									end={{ x: 1, y: 0 }}
									style={[styles.fadeGradient, styles.leftFadeGradient]}
									pointerEvents="none"
								/>
								<LinearGradient
									colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 1)']}
									start={{ x: 0, y: 0 }}
									end={{ x: 1, y: 0 }}
									style={[styles.fadeGradient, styles.rightFadeGradient]}
									pointerEvents="none"
								/>
							</View>
							<View style={[styles.chatContainer, styles.swipeFlexBox]}>
								<View style={styles.dollarIconContainer}>
									<MaterialIcons name="attach-money" size={30} color="#FFFFFF" />
								</View>
								<View style={styles.chatInputPosition}>
									<View style={styles.textField}>
										<TextInput
											placeholder="Ask Movya"
											placeholderTextColor={styles.labelTypo.color}
											style={[styles.labelText4, styles.inputField]}
											value={inputMessage}
											onChangeText={setInputMessage}
											editable={!isLoading}
											onSubmitEditing={handleSend}
										/>
										<TouchableOpacity onPress={handleSend} disabled={isLoading} style={styles.sendButton}>
											{isLoading ? (
												<ActivityIndicator size="small" color="#49454f" />
											) : (
												<MaterialIcons name="send" size={24} color="#49454f" />
											)}
										</TouchableOpacity>
									</View>
								</View>
							</View>
						</View>
					</View>
				</View>
			</KeyboardAvoidingView>
			
			{/* Chat History Modal */}
			<Modal
				visible={showChatHistory}
				animationType="slide"
				presentationStyle="pageSheet"
				onRequestClose={() => setShowChatHistory(false)}
			>
				<SafeAreaView style={styles.modalContainer}>
					<View style={styles.modalHeader}>
						<Text style={styles.modalTitle}>Chat History</Text>
						<TouchableOpacity onPress={() => setShowChatHistory(false)} style={styles.closeButton}>
							<MaterialIcons name="close" size={24} color="#333" />
						</TouchableOpacity>
					</View>
					
					<View style={styles.modalActions}>
						<TouchableOpacity onPress={startNewChat} style={styles.newChatButton}>
							<MaterialIcons name="add" size={20} color="#FFF" />
							<Text style={styles.newChatButtonText}>New Chat</Text>
						</TouchableOpacity>
					</View>

					<FlatList
						data={Object.values(chatHistory.conversations).sort((a, b) => b.timestamp - a.timestamp)}
						keyExtractor={(item) => item.id}
						style={styles.historyList}
						contentContainerStyle={styles.historyListContainer}
						renderItem={({ item }) => (
							<TouchableOpacity
								style={[
									styles.historyItem,
									item.id === currentConversationId && styles.currentChatItem
								]}
								onPress={() => loadPreviousChat(item.id)}
							>
								<View style={styles.historyItemContent}>
									<Text style={styles.historyItemPreview} numberOfLines={2}>
										{getChatPreview(item.messages)}
									</Text>
									<Text style={styles.historyItemDate}>
										{formatChatDate(item.timestamp)}
									</Text>
								</View>
								<View style={styles.historyItemMeta}>
									<Text style={styles.historyItemMessages}>
										{item.messages.length} messages
									</Text>
									{item.id === currentConversationId && (
										<View style={styles.currentIndicator}>
											<Text style={styles.currentIndicatorText}>Current</Text>
										</View>
									)}
								</View>
							</TouchableOpacity>
						)}
						ListEmptyComponent={
							<View style={styles.emptyHistory}>
								<MaterialIcons name="chat-bubble-outline" size={48} color="#ccc" />
								<Text style={styles.emptyHistoryText}>No chat history yet</Text>
								<Text style={styles.emptyHistorySubtext}>Start a conversation to see it here</Text>
							</View>
						}
					/>
				</SafeAreaView>
			</Modal>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	backgroundVideo: {
		...StyleSheet.absoluteFillObject,
		zIndex: -1,
	},
	appBarFlexBox: {
		gap: 16,
		flexDirection: "row",
		alignSelf: "stretch",
		alignItems: "center",
	},
	appBar: {
		paddingVertical: 8,
		paddingHorizontal: 16,
		alignItems: "center",
		justifyContent: "space-between",
		flexDirection: "row",
	},
	backButton: {
		padding: 8,
		width: 48,
		alignItems: "center",
	},
	textContent: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	headline: {
		fontSize: 24,
		lineHeight: 30,
		fontWeight: "700",
		fontFamily: "Geist",
		textAlign: "center",
		color: "#fff",
		alignSelf: "stretch",
		overflow: "hidden",
		marginBottom: 2,
	},
	supportingText: {
		color: "#e7e0ec",
		fontFamily: "Geist",
		fontWeight: "500",
		lineHeight: 16,
		letterSpacing: 1,
		fontSize: 12,
		textAlign: "center",
		alignSelf: "stretch",
		overflow: "hidden"
	},
	leadingIconParent: {
		width: 48,
		gap: 0,
		alignItems: "center",
		flexDirection: "row",
		justifyContent: "center",
	},
	avatarLayout: {
		borderRadius: 100,
		overflow: "hidden"
	},
	iconLayout: {
		maxWidth: "100%",
		overflow: "hidden",
		width: "100%"
	},
	contentFlexBox: {
		justifyContent: "center",
		alignItems: "center"
	},
	parentFlexBox: {
		gap: 0,
		justifyContent: "space-between"
	},
	content3Layout: {
		height: 48,
		justifyContent: "center"
	},
	textCenteredFlexBox: {
		gap: 12,
		justifyContent: "center",
		alignItems: "center"
	},
	helloTypo: {
		textAlign: "left",
		lineHeight: 40,
		fontSize: 24,
		fontFamily: "Geist",
		fontWeight: "700"
	},
	swipeFlexBox: {
		gap: 10,
		flexDirection: "row",
		alignItems: "center"
	},
	timeTypo: {
		lineHeight: 20,
		fontSize: 14,
		textAlign: "left",
		fontFamily: "Geist",
		fontWeight: "500"
	},
	labelTypo: {
		color: "#49454f",
		fontFamily: "Geist",
		textAlign: "left"
	},
	suggestionCard: {
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderWidth: 1,
		borderColor: "#79747e",
		borderStyle: "solid",
		borderRadius: 16,
		justifyContent: "center",
		alignItems: "center",
		marginRight: 4,
	},
	chatInputPosition: {
		borderTopRightRadius: 4,
		borderTopLeftRadius: 4,
		flex: 1
	},
	avatarWrapper: {
		justifyContent: "space-between",
		width: 83,
		alignItems: "center",
		flexDirection: "row"
	},
	stateLayerIcon: {
		height: 40,
		alignSelf: "stretch"
	},
	content1: {
		width: 40,
		borderRadius: 100,
		overflow: "hidden"
	},
	leadingIcon: {
		width: 48,
		alignItems: "center",
		flexDirection: "row"
	},
	labelText: {
		letterSpacing: 0,
		fontSize: 11,
		lineHeight: 14,
		textAlign: 'center',
	},
	dollarIconContainer: {
		backgroundColor: '#0461f0',
		borderRadius: 12,
		width: 50,
		height: 50,
		justifyContent: 'center',
		alignItems: 'center',
	},
	labelText4: {
		fontSize: 16,
		lineHeight: 24,
		color: "#49454f",
		fontFamily: "Geist",
		letterSpacing: 1,
	},
	stateLayer: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		gap: 8,
	},
	textField: {
		height: 56,
		borderWidth: 1,
		borderColor: "#79747e",
		borderStyle: "solid",
		borderRadius: 100,
		alignSelf: "stretch",
		overflow: 'hidden',
		backgroundColor: '#fff',
		flexDirection: 'row',
		alignItems: 'center',
		paddingLeft: 16,
	},
	inputField: {
		flex: 1,
		height: '100%',
	},
	sendButton: {
		padding: 8,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 8,
	},
	chatContainer: {
		alignSelf: "stretch",
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		paddingHorizontal: 16,
		paddingBottom: Platform.OS === 'ios' ? 8 : 12,
		paddingTop: 8,
	},
	textCenteredParent: {
		backgroundColor: "#fff",
		paddingTop: 12,
		borderTopLeftRadius: 32,
		borderTopRightRadius: 32,
		flex: 1,
		justifyContent: 'space-between',
	},
	content: {
		flex: 1,
		width: "100%",
	},
	chat: {
		backgroundColor: 'transparent',
		overflow: "hidden",
		width: "100%",
		flex: 1
	},
	suggestionsCarouselContainer: {
		position: 'relative',
		alignSelf: 'stretch',
		paddingHorizontal: 16,
	},
	chatSuggestionsScrollView: {
		maxHeight: 40,
	},
	chatSuggestionsContainer: {
		flexDirection: "row",
		alignItems: "center",
	},
	chatSuggestionsRow: {
		flexDirection: "row",
		gap: 4,
		alignItems: "center",
	},
	fadeGradient: {
		position: 'absolute',
		top: 0,
		bottom: 0,
		width: 30,
		height: '100%',
	},
	leftFadeGradient: {
		left: 0,
	},
	rightFadeGradient: {
		right: 0,
	},
	keyboardAvoidingContainer: {
		flex: 1,
		width: "100%",
	},
	messagesListContainer: {
		flex: 1,
		width: '100%',
		paddingHorizontal: 8,
	},
	messagesListContentContainer: {
		paddingVertical: 10,
		flexGrow: 1,
	},
	userBubbleContainer: {
		width: '100%',
		paddingLeft: '15%',
		marginBottom: 12,
		alignItems: 'flex-end',
	},
	userBubble: {
		paddingVertical: 10,
		paddingHorizontal: 14,
		borderRadius: 18,
		borderBottomRightRadius: 4,
		width: '100%',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.18,
		shadowRadius: 4,
		elevation: 3,
	},
	userMessageText: {
		color: '#fff',
		fontSize: 13,
		fontFamily: "Geist",
		lineHeight: 18,
		textAlign: 'right',
		letterSpacing: 0.1,
		fontWeight: '500',
		textShadowColor: 'rgba(0, 0, 0, 0.15)',
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 1,
	},
	agentBubbleContainer: {
		width: '100%',
		paddingRight: '15%',
		marginBottom: 10,
	},
	agentBubble: {
		backgroundColor: '#F5F5F7',
		borderRadius: 18,
		borderBottomLeftRadius: 4,
		paddingVertical: 8,
		paddingHorizontal: 10,
		width: '100%',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 2,
		borderWidth: 1,
		borderColor: '#E8E8E8',
	},
	agentMessageContent: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		width: '100%',
	},
	agentIconContainer: {
		marginRight: 8,
		marginTop: 2,
	},
	agentIconBackground: {
		width: 26,
		height: 26,
		borderRadius: 13,
		justifyContent: 'center',
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.2,
		shadowRadius: 1,
		elevation: 2,
	},
	agentIcon: {
	},
	agentMessageTextContainer: {
		flex: 1,
	},
	agentMessageText: {
		color: '#333',
		fontSize: 13,
		fontFamily: "Geist",
		lineHeight: 18,
		letterSpacing: 0.1,
	},
	agentActionsContainer: {
		flexDirection: 'row',
		justifyContent: 'flex-start',
		paddingTop: 8,
		marginLeft: 34,
	},
	actionButton: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		marginRight: 10,
	},
	bottomContainer: {
		gap: 12,
		alignItems: "center",
		width: "100%",
		paddingBottom: Platform.OS === 'ios' ? 8 : 0,
	},
	hello: {
		color: "#0461f0"
	},
	header: {
		alignItems: "baseline",
		flexDirection: "row",
		justifyContent: "center",
		marginBottom: 8,
	},
	swipe1: {
		color: "#625b71",
		letterSpacing: 0
	},
	swipeChild: {
	},
	swipe: {
		justifyContent: "center",
		alignItems: "center"
	},
	textCentered: {
		padding: 10,
		alignItems: "center",
		justifyContent: "center",
		width: "100%",
		flex: 1,
	},
	suggestionsCarouselOuterContainer: {
		position: 'relative',
		alignSelf: 'stretch',
	},
	headerIconButton: {
		padding: 8,
		alignItems: "center",
		justifyContent: "center",
	},
	modalContainer: {
		flex: 1,
		backgroundColor: '#fff',
	},
	modalHeader: {
		padding: 20,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderBottomWidth: 1,
		borderBottomColor: '#F0F0F0',
		backgroundColor: '#FAFAFA',
	},
	modalTitle: {
		fontSize: 24,
		fontWeight: 'bold',
		fontFamily: 'Geist',
		color: '#333',
	},
	closeButton: {
		padding: 8,
		borderRadius: 20,
		backgroundColor: '#F5F5F5',
	},
	modalActions: {
		padding: 20,
		backgroundColor: '#FAFAFA',
		borderBottomWidth: 1,
		borderBottomColor: '#F0F0F0',
	},
	newChatButton: {
		backgroundColor: '#0461f0',
		paddingHorizontal: 20,
		paddingVertical: 12,
		borderRadius: 12,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		shadowColor: '#0461f0',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
		elevation: 3,
	},
	newChatButtonText: {
		color: '#FFF',
		fontSize: 16,
		fontWeight: '600',
		fontFamily: 'Geist',
	},
	historyList: {
		flex: 1,
		backgroundColor: '#FAFAFA',
	},
	historyListContainer: {
		padding: 20,
		gap: 16,
	},
	historyItem: {
		padding: 20,
		borderWidth: 1,
		borderColor: '#E8E8E8',
		borderStyle: 'solid',
		borderRadius: 16,
		backgroundColor: '#FFFFFF',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 4,
		elevation: 2,
	},
	currentChatItem: {
		backgroundColor: '#F0F8FF',
		borderColor: '#0461f0',
		borderWidth: 2,
		shadowColor: '#0461f0',
		shadowOpacity: 0.1,
	},
	historyItemContent: {
		marginBottom: 12,
	},
	historyItemPreview: {
		fontSize: 16,
		fontFamily: 'Geist',
		fontWeight: '500',
		color: '#333',
		marginBottom: 6,
		lineHeight: 22,
	},
	historyItemDate: {
		color: '#888',
		fontSize: 13,
		fontFamily: 'Geist',
		fontWeight: '500',
	},
	historyItemMeta: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	historyItemMessages: {
		color: '#666',
		fontSize: 12,
		fontFamily: 'Geist',
	},
	currentIndicator: {
		backgroundColor: '#0461f0',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
	},
	currentIndicatorText: {
		color: '#fff',
		fontSize: 11,
		fontWeight: 'bold',
		fontFamily: 'Geist',
		letterSpacing: 0.5,
	},
	emptyHistory: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 40,
	},
	emptyHistoryText: {
		color: '#666',
		fontSize: 20,
		fontWeight: 'bold',
		fontFamily: 'Geist',
		marginTop: 20,
		marginBottom: 12,
	},
	emptyHistorySubtext: {
		color: '#999',
		fontSize: 16,
		fontFamily: 'Geist',
		textAlign: 'center',
		lineHeight: 22,
	},
});

export default Chat;
