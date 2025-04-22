import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';

type ColorSchemeType = 'light' | 'dark';

interface ThemeContextType {
  colorScheme: ColorSchemeType;
  toggleColorScheme: () => void;
  setColorScheme: (scheme: ColorSchemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const deviceColorScheme = useDeviceColorScheme() as ColorSchemeType;
  const [colorScheme, setColorScheme] = useState<ColorSchemeType>(deviceColorScheme);

  // Update the theme when the device theme changes
  useEffect(() => {
    setColorScheme(deviceColorScheme);
  }, [deviceColorScheme]);

  const toggleColorScheme = () => {
    setColorScheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ colorScheme, toggleColorScheme, setColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// This hook is a drop-in replacement for the original useColorScheme
export function useColorScheme() {
  const { colorScheme } = useTheme();
  return colorScheme;
}