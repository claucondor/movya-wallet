import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Placeholder for user avatar - replace with actual image source if available
// const userAvatar = require('@/assets/images/avatar-placeholder.png'); // Example

const WalletScreen = () => {
  // Assuming dark mode is active as per the image and global.css
  // You might control this with useColorScheme and applying 'dark' class to a root element
  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar style="light" />
      <View className="flex-1 px-4 pt-2">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-16 mt-2.5">
          <TouchableOpacity className="p-2">
            <Text className="text-foreground text-2xl">💬</Text>
          </TouchableOpacity>
          <View className="items-center">
            <Text className="text-foreground text-lg font-semibold">Gemini</Text>
            <TouchableOpacity className="flex-row items-center">
              <Text className="text-muted-foreground text-sm">2.0 Flash</Text>
              <Text className="text-muted-foreground text-sm ml-1">▼</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity className="p-1">
            {/* Replace with actual Image component if you have an avatar */}
            {/* <Image source={userAvatar} className="w-8 h-8 rounded-full" /> */}
            <View className="w-8 h-8 rounded-full bg-muted" /> 
          </TouchableOpacity>
        </View>

        {/* Hello Message */}
        <View className="flex-1 justify-center items-center mb-8">
          <Text className="text-5xl text-center">
            {/* For a true gradient, expo-linear-gradient with MaskedView would be needed.
                Using theme colors for a similar effect. */}
            <Text style={{ color: 'oklch(0.623 0.214 259.815)' }}>Hello, </Text>{/* approx --primary from light theme for visibility, or a specific gradient color */}
            <Text style={{ color: 'oklch(0.7 0.2 259.815)' }}>Ruy</Text> {/* a lighter shade */}
          </Text>
        </View>

        {/* Suggestion Buttons */}
        <View className="mb-4 h-[60px]">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="items-center">
            <TouchableOpacity className="bg-card p-3 rounded-lg mr-2 min-w-[100px] h-[56px] justify-center items-center">
              <Text className="text-card-foreground text-center text-sm leading-tight">Save me</Text>
              <Text className="text-card-foreground text-center text-sm leading-tight">time</Text>
            </TouchableOpacity>
            <TouchableOpacity className="bg-card p-3 rounded-lg mr-2 min-w-[100px] h-[56px] justify-center items-center">
              <Text className="text-card-foreground text-center text-sm leading-tight">Tell me what</Text>
              <Text className="text-card-foreground text-center text-sm leading-tight">you can do</Text>
            </TouchableOpacity>
            <TouchableOpacity className="bg-card p-3 rounded-lg mr-2 min-w-[100px] h-[56px] justify-center items-center">
              <Text className="text-card-foreground text-center text-sm leading-tight">Help me</Text>
              <Text className="text-card-foreground text-center text-sm leading-tight">plan</Text>
            </TouchableOpacity>
            <TouchableOpacity className="bg-card p-3 rounded-lg min-w-[100px] h-[56px] justify-center items-center">
              <Text className="text-card-foreground text-center text-sm leading-tight">Research</Text>
              <Text className="text-card-foreground text-center text-sm leading-tight">a topic</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Input Bar */}
        <View className="flex-row items-center bg-card px-2 py-1 rounded-full h-[52px] mb-2">
          <TouchableOpacity className="p-2">
            <Text className="text-foreground text-2xl">+</Text>
          </TouchableOpacity>
          <TextInput
            placeholder="Ask Gemini"
            placeholderTextColor="oklch(0.705 0.015 286.067)" // --muted-foreground
            className="flex-1 text-foreground mx-2 text-base h-10"
          />
          <TouchableOpacity className="p-2">
            <Text className="text-foreground text-2xl">🎤</Text>
          </TouchableOpacity>
          <TouchableOpacity className="p-2">
            <Text className="text-foreground text-2xl">📶</Text> {/* Placeholder for the tuning/filter icon */}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default WalletScreen;
