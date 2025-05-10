/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    cardBackground: '#FFFFFF',
    secondaryText: '#666666',
    danger: '#FF3B30',
    card: '#FFFFFF',
    inputBackground: '#F5F5F5',
    border: '#E5E5E5',
    placeholder: '#A0A0A0'
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    cardBackground: '#1C1C1E',
    secondaryText: '#8E8E93',
    danger: '#FF453A',
    card: '#2C2C2E',
    inputBackground: '#1C1C1E',
    border: '#3A3A3C',
    placeholder: '#636366'
  },
};
