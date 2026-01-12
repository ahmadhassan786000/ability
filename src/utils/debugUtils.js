/**
 * Debug utilities for development
 */

export const logError = (context, error, additionalInfo = {}) => {
  if (__DEV__) {
    console.group(`🚨 Error in ${context}`);
    console.error('Error:', error);
    console.log('Error message:', error?.message);
    console.log('Error code:', error?.code);
    console.log('Error stack:', error?.stack);
    console.log('Additional info:', additionalInfo);
    console.groupEnd();
  }
};

export const logInfo = (context, message, data = {}) => {
  if (__DEV__) {
    console.group(`ℹ️ ${context}`);
    console.log('Message:', message);
    if (Object.keys(data).length > 0) {
      console.log('Data:', data);
    }
    console.groupEnd();
  }
};

export const logWarning = (context, message, data = {}) => {
  if (__DEV__) {
    console.group(`⚠️ Warning in ${context}`);
    console.warn('Message:', message);
    if (Object.keys(data).length > 0) {
      console.log('Data:', data);
    }
    console.groupEnd();
  }
};

export const logSuccess = (context, message, data = {}) => {
  if (__DEV__) {
    console.group(`✅ Success in ${context}`);
    console.log('Message:', message);
    if (Object.keys(data).length > 0) {
      console.log('Data:', data);
    }
    console.groupEnd();
  }
};