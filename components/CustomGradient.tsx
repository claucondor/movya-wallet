import React from 'react';
import { View } from 'react-native';

interface CustomGradientProps {
  colors: string[];
  style?: any; // Cambiamos ViewStyle a any para aceptar StyleSheet.absoluteFill
}

/**
 * A simple gradient component that doesn't rely on expo-linear-gradient.
 * Uses a simple View with backgroundColor to avoid native module dependency.
 */
export const CustomGradient: React.FC<CustomGradientProps> = ({ colors, style }) => {
  // Just use the first color as the background color
  return (
    <View style={[style, { backgroundColor: colors[0] }]} />
  );
};

export default CustomGradient; 