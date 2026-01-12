import { ActivityIndicator, Keyboard, Platform, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { BorderRadius, Colors, Shadows, Typography } from '../styles/designSystem';

export default function Button({ 
  title, 
  onPress, 
  variant = 'primary', 
  size = 'md', 
  loading = false, 
  disabled = false,
  dismissKeyboard = false,
  style,
  textStyle,
  ...props 
}) {
  const getButtonStyle = () => {
    const baseStyle = [styles.button, styles[size]];
    
    if (variant === 'primary') {
      baseStyle.push(styles.primary);
    } else if (variant === 'secondary') {
      baseStyle.push(styles.secondary);
    } else if (variant === 'outline') {
      baseStyle.push(styles.outline);
    } else if (variant === 'ghost') {
      baseStyle.push(styles.ghost);
    }
    
    if (disabled || loading) {
      baseStyle.push(styles.disabled);
    }
    
    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle = [styles.text, styles[`text${size.charAt(0).toUpperCase() + size.slice(1)}`]];
    
    if (variant === 'primary') {
      baseStyle.push(styles.primaryText);
    } else if (variant === 'secondary') {
      baseStyle.push(styles.secondaryText);
    } else if (variant === 'outline') {
      baseStyle.push(styles.outlineText);
    } else if (variant === 'ghost') {
      baseStyle.push(styles.ghostText);
    }
    
    return baseStyle;
  };

  const handlePress = () => {
    // Dismiss keyboard if requested
    if (dismissKeyboard) {
      try {
        // Method 1: Try Keyboard.dismiss() (works on native)
        if (Keyboard && Keyboard.dismiss) {
          Keyboard.dismiss();
        }
      } catch (error) {
        console.log('Keyboard dismiss failed on native:', error);
      }
      
      // Method 2: For web, try to blur active element
      try {
        if (Platform.OS === 'web' && typeof document !== 'undefined') {
          const activeElement = document.activeElement;
          if (activeElement && activeElement.blur) {
            activeElement.blur();
          }
        }
      } catch (error) {
        console.log('Keyboard dismiss failed on web:', error);
      }
    }
    
    // Small delay to ensure keyboard dismissal completes
    setTimeout(() => {
      if (onPress) {
        onPress();
      }
    }, 50);
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'primary' ? Colors.white : Colors.primary} 
        />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  
  // Sizes
  sm: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 36,
  },
  md: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    minHeight: 48,
  },
  lg: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    minHeight: 56,
  },
  
  // Variants
  primary: {
    backgroundColor: Colors.primary,
  },
  secondary: {
    backgroundColor: Colors.secondary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  
  disabled: {
    opacity: 0.5,
  },
  
  // Text styles
  text: {
    fontFamily: Typography.fontFamily.semiBold,
    fontWeight: Typography.fontWeight.semiBold,
  },
  textSm: {
    fontSize: Typography.fontSize.sm,
  },
  textMd: {
    fontSize: Typography.fontSize.base,
  },
  textLg: {
    fontSize: Typography.fontSize.lg,
  },
  
  primaryText: {
    color: Colors.white,
  },
  secondaryText: {
    color: Colors.white,
  },
  outlineText: {
    color: Colors.primary,
  },
  ghostText: {
    color: Colors.primary,
  },
});