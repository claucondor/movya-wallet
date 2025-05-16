import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
// Import Ionicons or your preferred icon library if you want to use vector icons
// For simplicity, we'll use text placeholders or simple shapes for icons initially.

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Mock data - replace with actual data fetching
const MOCK_USER_NAME = 'Ruy';
const MOCK_TOTAL_BALANCE = '$0.01';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const [inputMessage, setInputMessage] = useState('');
  const [showWelcomeText, setShowWelcomeText] = useState(true);
  const welcomeOpacity = useRef(new Animated.Value(1)).current;

  // Simulate fetching user data
  const [userName, setUserName] = useState(MOCK_USER_NAME);
  const [totalBalance, setTotalBalance] = useState(MOCK_TOTAL_BALANCE);

  const videoRef = useRef<Video>(null);

  useEffect(() => {
    // This is where you might fetch actual user name and balance
    // For now, we use mock data
  }, []);

  const handleChatInteraction = () => {
    if (showWelcomeText) {
      Animated.timing(welcomeOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setShowWelcomeText(false));
    }
    // Add actual chat sending logic here
  };

  const navigateToSettings = () => {
    // router.push('/settings'); // Example navigation
    console.log('Navigate to User Settings');
  };

  const navigateToContacts = () => {
    // router.push('/contacts'); // Example navigation
    console.log('Navigate to Contacts');
  };

  const navigateToChatHistory = () => {
    // router.push('/chat-history'); // Example navigation
    console.log('Navigate to Chat History');
  };

  const handlePlusButton = () => {
    console.log('Plus button pressed');
    // Implement menu opening logic later
  };

  const suggestionChips = [
    'Send Money to a Friend',
    'Send Money to a Wallet',
    'How do I send AVA?',
    'Who are you?',
  ];

  return (
    <KeyboardAvoidingView
      style={styles.fullScreen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.fullScreen}>
        <ReactNativeStatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        
        {/* Animated Background */}
        <View style={styles.videoBackgroundContainer}>
          <Video
            ref={videoRef}
            style={styles.video}
            source={require('@/assets/bg/header-bg.webm')} // Ensure this path is correct
            resizeMode={ResizeMode.COVER}
            isLooping
            shouldPlay
            isMuted
          />
        </View>

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={navigateToSettings} style={styles.avatarPlaceholder}>
            {/* Replace with actual avatar image or icon */}
          </TouchableOpacity>
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceAmount}>{totalBalance}</Text>
            <Text style={styles.balanceLabel}>Total Balance</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity onPress={navigateToContacts} style={styles.iconButton}>
              <Text style={styles.iconText}>👤</Text> {/* Placeholder icon */}
            </TouchableOpacity>
            <TouchableOpacity onPress={navigateToChatHistory} style={styles.iconButton}>
              <Text style={styles.iconText}>💬</Text> {/* Placeholder icon */}
            </TouchableOpacity>
          </View>
        </View>

        {/* White Content Area */}
        <View style={styles.contentArea}>
          {showWelcomeText && (
            <Animated.View style={[styles.welcomeContainer, { opacity: welcomeOpacity }]}>
              <View style={styles.helloUserContainer}>
                <Text style={styles.helloText}>Hello, </Text>
                <LinearGradient
                  colors={['#0461F0', '#9CCAFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.userNameGradient}
                >
                  <Text style={styles.userNameText}>${userName}</Text>
                </LinearGradient>
              </View>
              <View style={styles.swipeHintContainer}>
                <Text style={styles.swipeHintText}>Swipe to change view</Text>
                <Text style={styles.swipeHintArrow}>→</Text>
              </View>
            </Animated.View>
          )}

          {/* Chat messages would go here if implemented */}
          {/* <ScrollView style={styles.chatMessagesContainer}></ScrollView> */}
          
          <View style={styles.suggestionsContainer}>
            {suggestionChips.map((suggestion, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.suggestionChip}
                onPress={() => {
                  setInputMessage(suggestion);
                  handleChatInteraction();
                }}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Input Area */}
        <View style={[styles.inputContainer, { paddingBottom: Platform.OS === 'ios' ? insets.bottom + 10 : 20 }]}>
          <TouchableOpacity onPress={handlePlusButton} style={styles.plusButton}>
            <Text style={styles.plusButtonText}>+</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            placeholder="Ask Movya"
            placeholderTextColor="#8A8A8E"
            value={inputMessage}
            onChangeText={setInputMessage}
            onFocus={handleChatInteraction} // Trigger animation on focus
            onSubmitEditing={handleChatInteraction} // Or on submit
          />
          <TouchableOpacity onPress={handleChatInteraction} style={styles.sendButton}>
            <Text style={styles.sendButtonText}>➢</Text> {/* Send icon placeholder */}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
  },
  videoBackgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1, // Ensure it's behind everything
  },
  video: {
    width: '100%',
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10, // Space below header content before white area
    // backgroundColor: 'transparent', // Header is over the video
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D8D8D8', // Light grey placeholder
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceContainer: {
    alignItems: 'center',
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  balanceLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  headerIcons: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
  },
  iconText: {
    fontSize: 24, // Adjust as needed for your icons
    color: '#FFFFFF',
  },
  contentArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: screenHeight * 0.15, // Adjust this to control how much of the blue header is visible
    paddingTop: 20,
    paddingHorizontal: 20,
    justifyContent: 'center', // Center welcome text initially
    alignItems: 'center',
  },
  welcomeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute', // So it can be overlaid and animated out
    top: 0,
    left: 0,
    right: 0,
    bottom: '25%', // Pushes it up a bit from the input
  },
  helloUserContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  helloText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0461F0',
  },
  userNameGradient: {
    paddingVertical: 2, // Ensure text is visible within gradient
    paddingHorizontal: 1, // Minimal horizontal padding for tight fit
    borderRadius: 5, // Optional: if you want rounded corners for the gradient itself
  },
  userNameText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'transparent', // Text color is transparent, gradient provides color
    // backgroundColor: 'transparent', // Ensure no bg color interferes
  },
  swipeHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  swipeHintText: {
    fontSize: 14,
    color: '#8A8A8E',
    marginRight: 8,
  },
  swipeHintArrow: {
    fontSize: 16,
    color: '#8A8A8E',
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 10,
    position: 'absolute',
    bottom: 80, // Adjust based on input field height and desired spacing
    left: 0,
    right: 0,
  },
  suggestionChip: {
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    margin: 4,
  },
  suggestionText: {
    fontSize: 13,
    color: '#333333',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 10, // Space above input field
    // paddingBottom will be set by insets
    backgroundColor: '#FFFFFF', // Match content area or make distinct
    borderTopWidth: 1,
    borderTopColor: '#EFEFF4',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  plusButton: {
    padding: 10,
    marginRight: 8,
  },
  plusButtonText: {
    fontSize: 24,
    color: '#0461F0',
    fontWeight: 'bold',
  },
  textInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#F0F0F0',
    borderRadius: 22,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#000000',
  },
  sendButton: {
    padding: 10,
    marginLeft: 8,
  },
  sendButtonText: {
    fontSize: 24,
    color: '#0461F0',
    fontWeight: 'bold',
  },
});