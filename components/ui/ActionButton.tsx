import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/ThemeContext";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

interface ActionButtonProps {
  iconName: string;
  label: string;
  onClick?: () => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  iconName,
  label,
  onClick,
}) => {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  
  return (
    <TouchableOpacity style={styles.container} onPress={onClick}>
      <View style={[
        styles.iconContainer,
        { backgroundColor: isDark ? '#252D4A' : '#E8EAF6' }
      ]}>
        <MaterialIcons
          name={iconName}
          size={24}
          color={isDark ? 'white' : '#0A0E17'}
        />
      </View>
      <ThemedText
        type="default"
        style={styles.label}
        lightColor="#0A0E17"
        darkColor="white"
      >
        {label}
      </ThemedText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  icon: {
    width: 24,
    height: 24,
  },
  label: {
    fontSize: 12,
  }
});

export default ActionButton;