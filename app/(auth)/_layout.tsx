import { Stack } from 'expo-router';
import React from 'react';

// Simple stack layout for the auth flow (e.g., Login, Signup)
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} />
    // You might add providers specific to auth here if needed
  );
} 