import {
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword as firebaseUpdatePassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

// Test Firebase connection
export const testFirebaseConnection = async () => {
  try {
    console.log("🔥 Testing Firebase connection...");
    console.log("🔥 Auth instance:", auth ? "✅ Connected" : "❌ Not connected");
    console.log("🔥 Firestore instance:", db ? "✅ Connected" : "❌ Not connected");
    console.log("🔥 Current user:", auth.currentUser ? auth.currentUser.email : "None");
    return true;
  } catch (error) {
    console.error("❌ Firebase connection test failed:", error);
    return false;
  }
};

// Debug function to check all users in Firestore
export const debugAllUsers = async () => {
  try {
    const usersCollection = collection(db, 'users');
    const querySnapshot = await getDocs(usersCollection);
    
    const allUsers = [];
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      allUsers.push({
        id: doc.id,
        email: userData.email,
        username: userData.username,
        displayName: userData.displayName,
        createdAt: userData.createdAt
      });
    });
    
    return allUsers;
  } catch (error) {
    console.error("❌ Error fetching all users:", error);
    return [];
  }
};

// Fix email mismatches between Firebase Auth and Firestore
export const fixEmailMismatches = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return { success: false, message: "No user logged in" };
    }
    
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (!userDoc.exists()) {
      return { success: false, message: "No Firestore document found" };
    }
    
    const userData = userDoc.data();
    
    if (userData.email !== currentUser.email) {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        email: currentUser.email,
        updatedAt: new Date().toISOString()
      });
      
      return { 
        success: true, 
        message: `Updated Firestore email from ${userData.email} to ${currentUser.email}`,
        oldEmail: userData.email,
        newEmail: currentUser.email
      };
    } else {
      return { success: true, message: "No mismatch found" };
    }
  } catch (error) {
    return { success: false, message: error.message };
  }
};

// Email login with Firebase
export const login = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Get additional user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.exists() ? userDoc.data() : {};
    
    // Check if Firestore email matches Firebase Auth email
    if (userData.email && userData.email !== user.email) {
      // Update Firestore document to match Firebase Auth
      await updateDoc(doc(db, 'users', user.uid), {
        email: user.email, // Use Firebase Auth email as the source of truth
        updatedAt: new Date().toISOString()
      });
      
      // Update userData object
      userData.email = user.email;
    }
    
    const result = {
      uid: user.uid,
      email: user.email, // Always use Firebase Auth email as source of truth
      displayName: user.displayName || userData.displayName || userData.username || user.email.split('@')[0],
      ...userData,
      email: user.email // Ensure email is always from Firebase Auth
    };
    
    return result;
  } catch (error) {
    throw new Error(getFirebaseErrorMessage(error.code));
  }
};

// Signup with Firebase
export const signup = async (username, email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update user profile
    await updateProfile(user, {
      displayName: username.trim()
    });
    
    // Save additional user data to Firestore
    const userData = {
      uid: user.uid,
      username: username.trim(),
      email: email,
      displayName: username.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await setDoc(doc(db, 'users', user.uid), userData);
    
    return {
      uid: user.uid,
      username: username.trim(),
      email: user.email,
      displayName: username.trim()
    };
  } catch (error) {
    throw new Error(getFirebaseErrorMessage(error.code));
  }
};

// Get current user
export const getCurrentUser = () => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (user) {
        try {
          // Get additional user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.exists() ? userDoc.data() : {};
          
          resolve({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || userData.displayName || userData.username || user.email.split('@')[0],
            ...userData
          });
        } catch (error) {
          console.error('Error getting user data:', error);
          resolve({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0]
          });
        }
      } else {
        resolve(null);
      }
    });
  });
};

// Sign out
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    throw new Error('Failed to sign out');
  }
};

// Force clear all authentication data
export const forceSignOut = async () => {
  try {
    // Sign out from Firebase
    if (auth.currentUser) {
      await firebaseSignOut(auth);
    }
    
    // Clear any cached auth data
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

// Password reset
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return {
      success: true,
      message: `Password reset instructions have been sent to ${email}`,
      email: email
    };
  } catch (error) {
    throw new Error(getFirebaseErrorMessage(error.code));
  }
};

// Update password
export const updatePassword = async (newPassword) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in');
    }
    
    await firebaseUpdatePassword(user, newPassword);
    
    // Update timestamp in Firestore
    await updateDoc(doc(db, 'users', user.uid), {
      updatedAt: new Date().toISOString()
    });
    
    return {
      success: true,
      message: "Password updated successfully"
    };
  } catch (error) {
    throw new Error(getFirebaseErrorMessage(error.code));
  }
};

// Update user profile
export const updateUserProfile = async (userId, profileData) => {
  try {
    const user = auth.currentUser;
    if (!user || user.uid !== userId) {
      throw new Error('User not authenticated');
    }
    
    // Update Firebase Auth profile if displayName is being updated
    if (profileData.displayName) {
      await updateProfile(user, {
        displayName: profileData.displayName
      });
    }
    
    // Update Firestore document
    const updateData = {
      ...profileData,
      updatedAt: new Date().toISOString()
    };
    
    // If displayName is updated, also update username for consistency
    if (profileData.displayName) {
      updateData.username = profileData.displayName;
    }
    
    await updateDoc(doc(db, 'users', userId), updateData);
    
    // Get updated user data
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.exists() ? userDoc.data() : {};
    
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      ...userData
    };
  } catch (error) {
    throw new Error('Failed to update profile');
  }
};

// Helper function to convert Firebase error codes to user-friendly messages
const getFirebaseErrorMessage = (errorCode) => {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'No account found with this email address. Please sign up first.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please check your credentials and try again.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email address';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters';
    case 'auth/invalid-email':
      return 'Please enter a valid email address';
    case 'auth/user-disabled':
      return 'This account has been disabled';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection';
    case 'auth/operation-not-allowed':
      return 'Email/password authentication is not enabled. Please contact support.';
    default:
      return `Authentication error: ${errorCode}. Please try again or contact support.`;
  }
};