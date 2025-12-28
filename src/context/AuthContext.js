import { createContext, useEffect, useState } from "react";
import { getCurrentUser, login, resetPassword, signOut, signup, updateUserProfile } from "../services/authService";


export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Check current auth state
      await checkAuthState();
    } catch (error) {
      console.error("Error initializing app:", error);
      setLoading(false);
    }
  };

  const checkAuthState = async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error("Error checking auth state:", error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    try {
      const userData = await login(email, password);
      setUser(userData);
      return userData;
    } catch (error) {
      throw error;
    }
  };

  const signUp = async (username, email, password) => {
    try {
      const userData = await signup(username, email, password);
      // Don't set user here - let them log in manually
      return userData;
    } catch (error) {
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  };

  const handleResetPassword = async (email) => {
    try {
      const result = await resetPassword(email);
      return result;
    } catch (error) {
      throw error;
    }
  };

  const updateProfile = async (profileData) => {
    try {
      if (!user || !user.uid) {
        throw new Error("No user logged in");
      }
      
      // Update user profile data in AsyncStorage and users list
      const updatedUser = await updateUserProfile(user.uid, profileData);
      setUser(updatedUser);
      
      return updatedUser;
    } catch (error) {
      console.error("Update profile error:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut: handleSignOut,
        resetPassword: handleResetPassword,
        updateProfile,
        // Aliases for different naming conventions
        login: signIn,
        signup: signUp,
        logout: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};