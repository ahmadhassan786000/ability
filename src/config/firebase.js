// Import the functions you need from the SDKs you need
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp } from "firebase/app";
import { getAuth, getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCF62wfutBFIlNqeXdRJgEV3U9AndVQ5Ig",
  authDomain: "abilityapp-577c8.firebaseapp.com",
  projectId: "abilityapp-577c8",
  storageBucket: "abilityapp-577c8.firebasestorage.app",
  messagingSenderId: "196771306016",
  appId: "1:196771306016:web:0c4f87e2053828b77e3a45",
  measurementId: "G-HBHTN3PX4F"
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

// Initialize Auth with proper error handling
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
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