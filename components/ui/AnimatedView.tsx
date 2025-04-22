import React from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';

interface AnimatedViewProps {
  children: React.ReactNode;
  show: boolean;
  direction?: 'left' | 'right' | 'up' | 'down';
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

export default function AnimatedView({
  children,
  show,
  direction = 'right',
  duration = 300,
  style,
}: AnimatedViewProps) {
  const translateValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(translateValue, {
      toValue: show ? 0 : getInitialValue(direction),
      duration,
      useNativeDriver: true,
    }).start();
  }, [show, direction, duration, translateValue]);

  const getInitialValue = (dir: string) => {
    switch (dir) {
      case 'left': return 100;
      case 'right': return -100;
      case 'up': return 100;
      case 'down': return -100;
      default: return 0;
    }
  };

  const getTransform = () => {
    switch (direction) {
      case 'left':
      case 'right':
        return [{ translateX: translateValue }];
      case 'up':
      case 'down':
        return [{ translateY: translateValue }];
      default:
        return [];
    }
  };

  return (
    <Animated.View
      style={[
        style,
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: translateValue.interpolate({
            inputRange: direction === 'left' || direction === 'right' 
              ? [-100, 0] 
              : [100, 0],
            outputRange: [0, 1],
          }),
          transform: getTransform(),
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}