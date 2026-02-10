// Network utility functions for better error handling

export const checkNetworkConnectivity = async () => {
  try {
    // Simple network check using a lightweight request
    const response = await fetch('https://www.google.com/generate_204', {
      method: 'HEAD',
      timeout: 5000,
    });
    return response.ok;
  } catch (error) {
    console.warn('Network connectivity check failed:', error.message);
    return false;
  }
};

export const getNetworkErrorMessage = (error) => {
  if (error === 'network' || error.includes('network')) {
    return {
      title: 'Connection Issue',
      message: 'Voice recognition requires an internet connection. Please check your network and try again.'
    };
  }
  
  if (error === 'no-speech') {
    return {
      title: 'No Speech Detected',
      message: 'Please speak clearly and try again.'
    };
  }
  
  if (error === 'aborted') {
    return {
      title: 'Cancelled',
      message: 'Voice recognition was cancelled.'
    };
  }
  
  return {
    title: 'Voice Recognition Error',
    message: 'There was an issue with voice recognition. Please try again.'
  };
};

export const shouldShowErrorToUser = (error) => {
  // Don't show errors for these common, non-critical issues
  const silentErrors = ['no-speech', 'network', 'aborted'];
  return !silentErrors.includes(error);
};