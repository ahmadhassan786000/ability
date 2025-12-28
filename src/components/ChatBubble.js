import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import {
    BorderRadius,
    Colors,
    Shadows,
    Spacing,
    Typography,
} from '../styles/designSystem';

// Animated Typing Dots Component
function TypingDots() {
  const dot1Anim = useRef(new Animated.Value(0.4)).current;
  const dot2Anim = useRef(new Animated.Value(0.4)).current;
  const dot3Anim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animateDots = () => {
      const duration = 600;
      const delay = 200;

      // Animate dot 1
      Animated.sequence([
        Animated.timing(dot1Anim, {
          toValue: 1,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(dot1Anim, {
          toValue: 0.4,
          duration: duration,
          useNativeDriver: true,
        }),
      ]).start();

      // Animate dot 2 with delay
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(dot2Anim, {
            toValue: 1,
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.timing(dot2Anim, {
            toValue: 0.4,
            duration: duration,
            useNativeDriver: true,
          }),
        ]).start();
      }, delay);

      // Animate dot 3 with more delay
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(dot3Anim, {
            toValue: 1,
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.timing(dot3Anim, {
            toValue: 0.4,
            duration: duration,
            useNativeDriver: true,
          }),
        ]).start();
      }, delay * 2);
    };

    // Start animation and repeat
    animateDots();
    const interval = setInterval(animateDots, 1800); // Total cycle time

    return () => clearInterval(interval);
  }, [dot1Anim, dot2Anim, dot3Anim]);

  return (
    <View style={styles.typingIndicator}>
      <Animated.View style={[styles.dot, { opacity: dot1Anim }]} />
      <Animated.View style={[styles.dot, { opacity: dot2Anim }]} />
      <Animated.View style={[styles.dot, { opacity: dot3Anim }]} />
    </View>
  );
}

export default function ChatBubble({ message, currentUserId }) {
  const isUser = message.userId === currentUserId;
  const isLoading = message.type === 'loading';
  const isError = message.type === 'error';
  
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.aiContainer]}>
      <View style={[
        styles.bubble, 
        isUser ? styles.userBubble : styles.aiBubble,
        isLoading && styles.loadingBubble,
        isError && styles.errorBubble
      ]}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <TypingDots />
            <Text style={[styles.text, styles.loadingText]}>
              {message.text}
            </Text>
          </View>
        ) : (
          <Text style={[
            styles.text, 
            isUser ? styles.userText : styles.aiText,
            isError && styles.errorText
          ]}>
            {message.text}
          </Text>
        )}
        
        {!isLoading && (
          <Text style={[
            styles.timestamp, 
            isUser ? styles.userTimestamp : styles.aiTimestamp
          ]}>
            {formatTime(message.timestamp)}
          </Text>
        )}
      </View>
    </View>
  );
}

// Named export for compatibility
export { ChatBubble };

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  aiContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: BorderRadius.sm,
  },
  aiBubble: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: BorderRadius.sm,
  },
  loadingBubble: {
    backgroundColor: '#F0F9FF', // Lighter blue for loading
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  errorBubble: {
    backgroundColor: '#FEF2F2', // Light red for errors
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366F1',
    marginHorizontal: 2,
  },
  text: {
    fontSize: Typography.fontSize.sm, // Reduced from base (16px) to sm (14px)
    lineHeight: 18, // Adjusted line height proportionally
    marginBottom: Spacing.xs,
  },
  userText: {
    color: Colors.white,
  },
  aiText: {
    color: Colors.gray900,
  },
  loadingText: {
    color: Colors.gray600,
    fontStyle: 'italic',
  },
  errorText: {
    color: Colors.error,
  },
  timestamp: {
    fontSize: Typography.fontSize.xs,
    alignSelf: 'flex-end',
  },
  userTimestamp: {
    color: Colors.white,
    opacity: 0.8,
  },
  aiTimestamp: {
    color: Colors.gray500,
  },
});
