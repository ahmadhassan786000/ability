import { Alert } from 'react-native';

/**
 * Safe Alert utility that handles React Native bridge issues
 * Provides consistent Alert behavior across platforms
 */
export const safeAlert = (title, message, buttons = [{ text: 'OK' }], options = {}) => {
  try {
    // Ensure we have proper parameters
    const safeTitle = title || 'Alert';
    const safeMessage = message || '';
    const safeButtons = Array.isArray(buttons) && buttons.length > 0 ? buttons : [{ text: 'OK' }];
    
    // For Android, ensure buttons have proper structure
    const processedButtons = safeButtons.map(button => ({
      text: button.text || 'OK',
      onPress: button.onPress || (() => {}),
      style: button.style || 'default'
    }));
    
    // Use setTimeout to avoid bridge timing issues
    setTimeout(() => {
      Alert.alert(safeTitle, safeMessage, processedButtons, {
        cancelable: options.cancelable !== false,
        ...options
      });
    }, 100);
    
  } catch (error) {
    console.error('Alert error:', error);
    // Fallback: just log the message
    console.log(`Alert: ${title} - ${message}`);
  }
};

/**
 * Simple success alert
 */
export const showSuccess = (title, message, onPress) => {
  safeAlert(title, message, [
    {
      text: 'OK',
      onPress: onPress || (() => {}),
      style: 'default'
    }
  ]);
};

/**
 * Simple error alert
 */
export const showError = (title, message, onPress) => {
  safeAlert(title, message, [
    {
      text: 'OK',
      onPress: onPress || (() => {}),
      style: 'default'
    }
  ]);
};

/**
 * Confirmation alert with Yes/No options
 */
export const showConfirmation = (title, message, onConfirm, onCancel) => {
  safeAlert(title, message, [
    {
      text: 'Cancel',
      onPress: onCancel || (() => {}),
      style: 'cancel'
    },
    {
      text: 'OK',
      onPress: onConfirm || (() => {}),
      style: 'default'
    }
  ]);
};