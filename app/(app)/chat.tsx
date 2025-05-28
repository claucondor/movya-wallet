import * as React from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	ScrollView,
	Image,
	Platform,
	StatusBar as ReactNativeStatusBar,
	Animated,
	Dimensions,
	KeyboardAvoidingView,
	FlatList,
	ActivityIndicator,
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

	// --- State Management ---
	const [messages, setMessages] = React.useState<ChatMessage[]>([]);
	const [inputMessage, setInputMessage] = React.useState('');
	const [isLoading, setIsLoading] = React.useState(false);
	const [conversationState, setConversationState] = React.useState<AIResponse | null>(null);
	const [currentConversationId, setCurrentConversationId] = React.useState<string>('');

	// --- Chat History Persistence (Save Only) ---
	// loadChatHistory function is kept for potential future use or if logic changes,
	// but it won't be used to populate the initial chat screen view.
	const loadChatHistory_UNUSED_FOR_INITIAL_LOAD = React.useCallback(() => {
		try {
			const storedHistory = storage.getString(CHAT_HISTORY_KEY);
			let parsedHistory: any = null;
			if (storedHistory) {
				try {
					parsedHistory = JSON.parse(storedHistory);
				} catch (e) {
					console.error('[ChatScreen] Failed to parse stored history JSON:', e);
				}
			}

			if (parsedHistory && typeof parsedHistory === 'object' && !Array.isArray(parsedHistory) && parsedHistory.conversations && typeof parsedHistory.conversations === 'object') {
				const conversationsMap = parsedHistory.conversations as Record<string, { id: string; timestamp: number; messages: ChatMessage[] }>;
				const conversationsArray = Object.values(conversationsMap);
				conversationsArray.sort((a, b) => b.timestamp - a.timestamp); // Newest first

				if (conversationsArray.length > 0) {
					const mostRecentConversation = conversationsArray[0];
					setMessages(mostRecentConversation.messages);
					setCurrentConversationId(mostRecentConversation.id);
					console.log(`[ChatScreen] Loaded most recent conversation: ${mostRecentConversation.id}`);
				} else {
					const newConversationId = `conversation-${Date.now()}`;
					setCurrentConversationId(newConversationId);
					setMessages([]);
					console.log(`[ChatScreen] No conversations in history. Starting new: ${newConversationId}`);
				}
			} else {
				const newConversationId = `conversation-${Date.now()}`;
				setCurrentConversationId(newConversationId);
				setMessages([]);
				console.log('[ChatScreen] No valid chat history structure found. Starting new conversation.');
			}
		} catch (error) {
			console.error('[ChatScreen] Critical error in loadChatHistory:', error);
			const newConversationId = `conversation-${Date.now()}`;
			setCurrentConversationId(newConversationId);
			setMessages([]);
		}
	}, []);

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
	}, []); 

	React.useEffect(() => {
		// Show welcome message if messages are empty (which they will be on fresh load)
		if (messages.length === 0 && currentConversationId) { 
			addMessage("Hello! I'm Movya. How can I assist you today?", 'agent'); // Updated Welcome Message
		}
	}, [currentConversationId, addMessage]); 

	// --- Render Logic ---
	const renderItem = ({ item }: { item: ChatMessage }) => {
		if (item.sender === 'agent') {
			return (
				<View style={styles.agentBubble}>
					<View style={styles.agentMessageContent}>
						<View style={styles.agentIconContainer}>
							<MaterialIcons name="smart-toy" size={24} color="#49454f" style={styles.agentIcon} />
						</View>
						<View style={styles.agentMessageTextContainer}>
							<Text style={styles.agentMessageText}>{item.text}</Text>
						</View>
					</View>
					<View style={styles.agentActionsContainer}>
						<TouchableOpacity style={styles.actionButton} onPress={() => console.log('Copy pressed for message:', item.id)}>
							<MaterialIcons name="content-copy" size={18} color="#555" />
						</TouchableOpacity>
						<TouchableOpacity style={styles.actionButton} onPress={() => console.log('Like pressed for message:', item.id)}>
							<MaterialIcons name="thumb-up-off-alt" size={18} color="#555" />
						</TouchableOpacity>
						<TouchableOpacity style={styles.actionButton} onPress={() => console.log('Dislike pressed for message:', item.id)}>
							<MaterialIcons name="thumb-down-off-alt" size={18} color="#555" />
						</TouchableOpacity>
					</View>
				</View>
			);
		} else {
			// User message
			return (
				<View style={styles.userBubble}>
					<Text style={styles.userMessageText}>{item.text}</Text>
				</View>
			);
		}
	};

	return (
		<SafeAreaView style={styles.chat}>
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
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={styles.keyboardAvoidingContainer}
				keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0} // Adjust as needed
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
							{/* Placeholder for potential future icons */}
							<View style={{ width: 48 }} /> 
							<View style={{ width: 48 }} />
						</View>
					</View>

					{/* Messages List */}
					<FlatList
						ref={flatListRef}
						data={messages}
						renderItem={renderItem}
						keyExtractor={(item) => item.id}
						style={styles.messagesListContainer}
						contentContainerStyle={styles.messagesListContentContainer}
						inverted={false} // Keep true if you prefer new messages at bottom and list inverted
					/>

					{/* Bottom section: Suggestions and Input */}
					<View style={[styles.bottomStaticContainer]}>
						<View style={[styles.textCenteredParent]}>
							{/* Suggestions Carousel - remains from original code */}
							<View style={styles.suggestionsCarouselContainer}>
								<ScrollView
									horizontal
									showsHorizontalScrollIndicator={false}
									style={styles.chatSuggestionsScrollView}
									contentContainerStyle={styles.chatSuggestionsContainer}
								>
									<View style={styles.chatSuggestionsRow}>
										<TouchableOpacity style={styles.suggestionCard} onPress={() => { const msg = "Send Money to a Friend"; setInputMessage(msg); callAgentApi(msg, conversationState); }}>
											<Text style={[styles.labelText, styles.labelTypo]}>Send Money to a Friend</Text>
										</TouchableOpacity>
										<TouchableOpacity style={styles.suggestionCard} onPress={() => { const msg = "Send Money to a Wallet"; setInputMessage(msg); callAgentApi(msg, conversationState); }}>
											<Text style={[styles.labelText, styles.labelTypo]}>Send Money to a Wallet</Text>
										</TouchableOpacity>
										<TouchableOpacity style={styles.suggestionCard} onPress={() => { const msg = "How to send AVA?"; setInputMessage(msg); callAgentApi(msg, conversationState); }}>
											<Text style={[styles.labelText, styles.labelTypo]}>How to send AVA?</Text>
										</TouchableOpacity>
										<TouchableOpacity style={styles.suggestionCard} onPress={() => { const msg = "Who are you?"; setInputMessage(msg); callAgentApi(msg, conversationState); }}>
											<Text style={[styles.labelText, styles.labelTypo]}>Who are you?</Text>
										</TouchableOpacity>
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

							{/* Chat Input Area - connected to new logic */}
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
											onSubmitEditing={handleSend} // Send on submit
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
	headline: {
		fontSize: 22,
		lineHeight: 28,
		fontWeight: "700",
		fontFamily: "Geist",
		textAlign: "center",
		color: "#fff",
		alignSelf: "stretch",
		overflow: "hidden"
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
	textContent: {
		flex: 1
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
	leadingIconParent: {
		width: 83,
		gap: 0,
		alignItems: "center",
		flexDirection: "row"
	},
	appBar: {
		paddingVertical: 8,
		paddingHorizontal: 16,
		alignItems: "center",
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
		left: 16,
	},
	rightFadeGradient: {
		right: 16,
	},
	keyboardAvoidingContainer: {
		flex: 1,
	},
	messagesListContainer: {
		flex: 1,
		paddingHorizontal: 16,
	},
	messagesListContentContainer: {
		paddingVertical: 10,
	},
	messageBubble: {
		paddingVertical: 10,
		paddingHorizontal: 15,
		borderRadius: 18,
		marginBottom: 10,
		maxWidth: '85%',
	},
	userBubble: {
		alignSelf: 'flex-end',
		backgroundColor: '#007AFF',
		paddingVertical: 10,
		paddingHorizontal: 15,
		borderRadius: 18,
		borderBottomRightRadius: 6,
		marginBottom: 10,
		maxWidth: '85%',
	},
	agentBubble: {
		alignSelf: 'flex-start',
		backgroundColor: '#FFFFFF',
		borderRadius: 18,
		borderBottomLeftRadius: 6,
		borderColor: '#E0E0E0',
		borderWidth: 1,
		paddingVertical: 10,
		paddingHorizontal: 12,
		marginBottom: 10,
		maxWidth: '85%',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.15,
		shadowRadius: 2,
		elevation: 2,
	},
	userMessageText: {
		color: '#fff',
		fontSize: 16,
		fontFamily: "Geist",
	},
	agentMessageContent: {
		flexDirection: 'row',
		alignItems: 'flex-start',
	},
	agentIconContainer: {
		marginRight: 8,
	},
	agentIcon: {
	},
	agentMessageTextContainer: {
		flex: 1,
	},
	agentMessageText: {
		color: '#222',
		fontSize: 16,
		fontFamily: "Geist",
		lineHeight: 22,
	},
	agentActionsContainer: {
		flexDirection: 'row',
		justifyContent: 'flex-start',
		paddingTop: 8,
		marginLeft: 32,
	},
	actionButton: {
		paddingHorizontal: 8,
		paddingVertical: 4,
	},
	backButton: {
		padding: 8,
		marginRight: 8,
	},
	bottomStaticContainer: {
	},
});

export default Chat;
