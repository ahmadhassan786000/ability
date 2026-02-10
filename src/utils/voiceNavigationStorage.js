// Persistent storage for voice navigation state using AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';

const VOICE_NAVIGATION_KEY = 'voiceNavigationEnabled';

export const saveVoiceNavigationState = async (enabled) => {
  try {
    await AsyncStorage.setItem(VOICE_NAVIGATION_KEY, JSON.stringify(enabled));
    console.log('Voice navigation state saved:', enabled);
  } catch (error) {
    console.error('Error saving voice navigation state:', error);
  }
};

export const getVoiceNavigationState = async () => {
  try {
    const savedState = await AsyncStorage.getItem(VOICE_NAVIGATION_KEY);
    const enabled = savedState !== null ? JSON.parse(savedState) : false; // Default to disabled
    console.log('Voice navigation state loaded:', enabled);
    return enabled;
  } catch (error) {
    console.error('Error getting voice navigation state:', error);
    return false; // Default to disabled on error
  }
};

export const clearVoiceNavigationState = async () => {
  try {
    await AsyncStorage.removeItem(VOICE_NAVIGATION_KEY);
    console.log('Voice navigation state cleared');
  } catch (error) {
    console.error('Error clearing voice navigation state:', error);
  }
};