import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// For icons, we'll use text placeholders for now as per the image.
// In a real app, you'd use an icon library like lucide-react-native or react-native-vector-icons.

// Placeholder for user avatar - replace with actual image source if available
// const userAvatar = require('@/assets/images/avatar-placeholder.png');

const HomeScreen = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <TouchableOpacity style={styles.headerIconContainer}>
            <Text style={styles.iconText}>💬</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Gemini</Text>
            <TouchableOpacity style={styles.headerSubtitleContainer}>
              <Text style={styles.headerSubtitle}>2.0 Flash</Text>
              <Text style={styles.headerSubtitleIcon}>▼</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.avatarContainer}>
            {/* Replace with actual Image component if you have an avatar */}
            {/* <Image source={userAvatar} style={styles.avatar} /> */}
            <View style={styles.avatarPlaceholder} /> 
          </TouchableOpacity>
        </View>

        {/* Hello Message */}
        <View style={styles.helloMessageContainer}>
          <Text style={styles.helloText}>
            <Text style={styles.helloGradientPart1}>Hello, </Text>
            <Text style={styles.helloGradientPart2}>Ruy</Text>
          </Text>
        </View>

        {/* Suggestion Buttons */}
        <View style={styles.suggestionsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsScrollContent}>
            <TouchableOpacity style={styles.suggestionButton}>
              <Text style={styles.suggestionText}>Save me</Text>
              <Text style={styles.suggestionText}>time</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.suggestionButton}>
              <Text style={styles.suggestionText}>Tell me what</Text>
              <Text style={styles.suggestionText}>you can do</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.suggestionButton}>
              <Text style={styles.suggestionText}>Help me</Text>
              <Text style={styles.suggestionText}>plan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.suggestionButtonLast}>
              <Text style={styles.suggestionText}>Research</Text>
              <Text style={styles.suggestionText}>a topic</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Input Bar */}
        <View style={styles.inputBarContainer}>
          <TouchableOpacity style={styles.inputBarIconContainer}>
            <Text style={styles.iconTextLg}>+</Text>
          </TouchableOpacity>
          <TextInput
            placeholder="Ask Gemini"
            placeholderTextColor="#888888" // gray-400
            style={styles.textInput}
          />
          <TouchableOpacity style={styles.inputBarIconContainer}>
            <Text style={styles.iconTextLg}>🎤</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.inputBarIconContainerLast}>
            <Text style={styles.iconTextLg}>📶</Text> {/* Placeholder for the tuning/filter icon */}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

// Using StyleSheet for better organization and potential NativeWind processing if configured.
// Tailwind classes are descriptive but direct StyleSheet can be clearer for complex layouts.
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000', // black
  },
  container: {
    flex: 1,
    paddingHorizontal: 16, // p-4
    paddingTop: 8, // pt-2 (SafeAreaView might add top padding already)
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 64, // mb-16, adjusted for visual balance from image
    marginTop: 10, // Added margin for status bar
  },
  headerIconContainer: {
    padding: 8, // p-2
  },
  iconText: {
    color: 'white',
    fontSize: 24,
  },
  iconTextLg: {
    color: 'white',
    fontSize: 24, // text-2xl
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18, // text-lg
    fontWeight: '600', // font-semibold
  },
  headerSubtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerSubtitle: {
    color: '#A0A0A0', // gray-400
    fontSize: 14, // text-sm
  },
  headerSubtitleIcon: {
    color: '#A0A0A0', // gray-400
    fontSize: 14, // text-sm
    marginLeft: 4, // ml-1
  },
  avatarContainer: {
    padding: 4, // p-1
  },
  avatar: { // If using an actual image
    width: 32, // w-8
    height: 32, // h-8
    borderRadius: 16, // rounded-full
  },
  avatarPlaceholder: { // Placeholder for the image
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#555555', // A dark gray for placeholder
  },
  helloMessageContainer: {
    flex: 1, // Pushes suggestions and input to bottom
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32, // Added some margin from suggestions
  },
  helloText: {
    fontSize: 48, // text-5xl or similar, adjust as needed
    textAlign: 'center',
    // Gradient text is complex in React Native. This is a simulation.
    // For true gradient, you'd use a library like react-native-linear-gradient with MaskedView.
  },
  helloGradientPart1: {
    color: '#A78BFA', // A purple shade, similar to Tailwind's violet-400 or a custom one
  },
  helloGradientPart2: {
    color: '#C4B5FD', // A lighter purple, similar to Tailwind's violet-300
  },
  suggestionsContainer: {
    marginBottom: 16, // mb-4
    height: 60, // Fixed height for the scrollview row
  },
  suggestionsScrollContent: {
    alignItems: 'center', // Vertically center items in scrollview
  },
  suggestionButton: {
    backgroundColor: '#27272A', // neutral-800
    paddingVertical: 8, // p-2 (adjust for two lines of text)
    paddingHorizontal: 12, // p-3
    borderRadius: 8, // rounded-lg
    marginRight: 8, // mr-2
    minWidth: 100, // min-w-[100px]
    height: 56, // Fixed height for buttons
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionButtonLast: { // To remove margin from the last item
    backgroundColor: '#27272A',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 100,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14, // text-sm
    lineHeight: 18, // Adjust line height for two lines
  },
  inputBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272A', // neutral-800
    paddingHorizontal: 8, // p-2 horizontal
    paddingVertical: 4, // p-1 vertical (adjust for overall height)
    borderRadius: 9999, // rounded-full
    height: 52, // Fixed height for input bar
    marginBottom: 8, // Added some bottom margin
  },
  inputBarIconContainer: {
    padding: 8, // p-2
  },
  inputBarIconContainerLast: { // To remove margin from the last item if needed, or specific padding
    padding: 8,
  },
  textInput: {
    flex: 1,
    color: 'white',
    marginHorizontal: 8, // mx-2
    fontSize: 16, // text-base
    height: 40, // h-10 (ensure it fits within the 52px bar)
  },
});

export default HomeScreen;
