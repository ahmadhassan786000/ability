import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

export default function LoadingScreen({ 
  message = "Loading...", 
  size = 60, 
  color = "#6366F1",
  backgroundColor = '#0F172A',
  textColor = '#94A3B8'
}) {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
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
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.loadingWrapper}>
        <Animated.View
          style={[
            styles.spinner,
            {
              width: size,
              height: size,
              borderColor: `${color}20`,
              borderTopColor: color,
              transform: [{ rotate: spin }],
            },
          ]}
        />
        <View style={[styles.innerCircle, { 
          width: size * 0.7, 
          height: size * 0.7,
          backgroundColor: backgroundColor 
        }]} />
      </View>
      <Text style={[styles.text, { color: textColor }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    borderWidth: 3,
    borderRadius: 50,
    borderStyle: 'solid',
  },
  innerCircle: {
    position: 'absolute',
    borderRadius: 50,
  },
  text: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});