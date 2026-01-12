// Import the functions you need from the SDKs you need
import { getApps, initializeApp } from "firebase/app";
import { getAuth, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from 'react-native';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBze_YjHYm2bALCGci1ARUICVUpv4oo1HU",
  authDomain: "ability-59841.firebaseapp.com",
  projectId: "ability-59841",
  storageBucket: "ability-59841.firebasestorage.app",
  messagingSenderId: "535132309126",
  appId: "1:535132309126:web:d4feae31b917f987127307",
  measurementId: "G-L8FG9EGZ94"
};

// Initialize Firebase only if it hasn't been initialized already
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Firebase services
export const db = getFirestore(app);

// Initialize Auth with platform-specific persistence
let auth;
try {
  if (Platform.OS === 'web') {
    // For web, use default persistence (browser storage)
    auth = getAuth(app);
  } else {
    // For React Native, use AsyncStorage persistence
    const { getReactNativePersistence } = require("firebase/auth");
    const ReactNativeAsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage)
    });
  }
} catch (error) {
  if (error.code === 'auth/already-initialized') {
    // If auth is already initialized, get the existing instance
    auth = getAuth(app);
  } else {
    throw error;
  }
}

export { auth };
export default app;