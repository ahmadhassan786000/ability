import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Debug utility to check Firebase users (for development only)
 */
export const debugFirebaseUsers = async () => {
  if (!__DEV__) {
    console.log('Debug functions only available in development');
    return;
  }

  try {
    console.log('🔍 Checking Firebase users...');
    
    const usersCollection = collection(db, 'users');
    const querySnapshot = await getDocs(usersCollection);
    
    const users = [];
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      users.push({
        id: doc.id,
        email: userData.email,
        username: userData.username || userData.displayName,
        createdAt: userData.createdAt
      });
    });
    
    console.log('📊 Found users in Firestore:', users.length);
    users.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}, Username: ${user.username}`);
    });
    
    return users;
  } catch (error) {
    console.error('❌ Error checking Firebase users:', error);
    return [];
  }
};

/**
 * Check if email exists in Firebase
 */
export const checkEmailExists = async (email) => {
  try {
    const users = await debugFirebaseUsers();
    const emailExists = users.some(user => user.email.toLowerCase() === email.toLowerCase());
    
    console.log(`📧 Email ${email} exists:`, emailExists);
    return emailExists;
  } catch (error) {
    console.error('Error checking email:', error);
    return false;
  }
};