import React, { useState, useCallback, memo } from 'react';
import { View, StyleSheet, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { FAB as PaperFAB, useTheme } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface ActionItem {
  icon: string;
  onPress: () => void;
  color?: string;
  style?: any;
}

interface SpeedDialFABProps {
  actions: ActionItem[];
  mainFabIconOpen?: string;
  mainFabIconClose?: string;
  fabColor?: string;
  fabIconColor?: string;
  actionsBackgroundColor?: string;
  actionsIconColor?: string;
  actionsLabelColor?: string;
}

// Usar una constante para la duración de la animación
const ANIMATION_DURATION = 150;
const ANIMATION_EASING = Easing.bezier(0.25, 0.1, 0.25, 1);

// Componente de botón de acción optimizado
const ActionButton = memo(({ 
  icon, 
  color, 
  style, 
  onPress, 
  backgroundColor 
}: { 
  icon: string; 
  color: string; 
  style: any; 
  onPress: () => void; 
  backgroundColor: string; 
}) => (
  <PaperFAB
    icon={icon}
    size="small"
    color={color}
    style={[styles.secondaryFab, { backgroundColor }, style]}
    onPress={onPress}
  />
));

// Componente principal
function SpeedDialFAB({
  actions,
  mainFabIconOpen = "plus",
  mainFabIconClose = "close",
  fabColor,
  fabIconColor,
  actionsBackgroundColor,
  actionsIconColor,
}: SpeedDialFABProps) {
  const theme = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  // Valores de animación optimizados
  const expansionProgress = useSharedValue(0);

  // Colores efectivos
  const effectiveFabColor = fabColor || theme.colors.primary;
  const effectiveFabIconColor = fabIconColor || theme.colors.onPrimary;
  const effectiveActionsBgColor = actionsBackgroundColor || theme.colors.surface;
  const effectiveActionsIconColor = actionsIconColor || theme.colors.primary;

  // Handlers optimizados con useCallback
  const toggleExpansion = useCallback(() => {
    const newValue = !isExpanded;
    setIsExpanded(newValue);
    
    // Animación simple y eficiente
    expansionProgress.value = withTiming(
      newValue ? 1 : 0, 
      { duration: ANIMATION_DURATION, easing: ANIMATION_EASING }
    );
  }, [isExpanded, expansionProgress]);

  // Animación simplificada para el FAB principal - solo rotación
  const mainFabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ 
      rotate: `${expansionProgress.value * 45}deg` 
    }],
  }));

  // Función factory para generar estilos animados - fuera del render para mejorar rendimiento
  const createActionButtonStyle = useCallback((index: number) => {
    return useAnimatedStyle(() => {
      const offset = -48 * (index + 1);
      return {
        transform: [
          { translateY: expansionProgress.value * offset },
          { scale: 0.7 + (expansionProgress.value * 0.3) }
        ],
        opacity: expansionProgress.value,
        position: 'absolute',
      };
    });
  }, []);

  // Manejador optimizado para los botones de acción
  const handleActionPress = useCallback((actionFn: () => void) => {
    return () => {
      actionFn();
      toggleExpansion();
    };
  }, [toggleExpansion]);

  // Renderizar overlay solo cuando está expandido para mejorar rendimiento
  const renderOverlay = useCallback(() => {
    if (!isExpanded) return null;
    
    return (
      <TouchableWithoutFeedback onPress={toggleExpansion}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>
    );
  }, [isExpanded, toggleExpansion]);

  return (
    <>
      {renderOverlay()}
      <View style={styles.container}>
        {actions.map((action, index) => (
          <Animated.View 
            key={`action-${index}`} 
            style={[
              styles.actionButtonContainer,
              createActionButtonStyle(index)
            ]}
          >
            <ActionButton
              icon={action.icon}
              color={action.color || effectiveActionsIconColor}
              style={action.style}
              onPress={handleActionPress(action.onPress)}
              backgroundColor={effectiveActionsBgColor}
            />
          </Animated.View>
        ))}
        
        <TouchableOpacity activeOpacity={0.8} onPress={toggleExpansion}>
          <Animated.View style={mainFabAnimatedStyle}> 
            <PaperFAB
              icon={isExpanded ? mainFabIconClose : mainFabIconOpen}
              style={[styles.fab, { backgroundColor: effectiveFabColor }]}
              color={effectiveFabIconColor}
            />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  actionButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    elevation: 4,
    borderWidth: 0,
  },
  secondaryFab: {
    elevation: 2,
    marginBottom: 8,
    borderWidth: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 1,
  }
});

export default SpeedDialFAB; 