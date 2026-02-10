import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

export default function CircleLoader({ 
  size = 20, 
  color = "#FFFFFF", 
  strokeWidth = 2 
}) {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    
    spinAnimation.start();
    
    return () => spinAnimation.stop();
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={{ 
      width: size, 
      height: size, 
      justifyContent: 'center', 
      alignItems: 'center' 
    }}>
      <Animated.View
        style={{
          width: size,
          height: size,
          borderWidth: strokeWidth,
          borderRadius: size / 2,
          borderColor: `${color}30`,
          borderTopColor: color,
          transform: [{ rotate: spin }],
        }}
      />
    </View>
  );
}