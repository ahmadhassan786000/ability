import AsyncStorage from "@react-native-async-storage/async-storage";

// Simple authentication service that works with Expo Go
const USERS_KEY = "app_users";
const CURRENT_USER_KEY = "current_user";

const getUsers = async () => {
  try {
    const users = await AsyncStorage.getItem(USERS_KEY);
    return users ? JSON.parse(users) : [];
  } catch (error) {
    return [];
  }
};

const saveUsers = async (users) => {
  try {
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (error) {
    console.error("Error saving users:", error);
  }
};

// Email login
export const login = async (email, password) => {
  const users = await getUsers();
  const user = users.find(u => u.email === email && u.password === password);
  
  if (!user) {
    throw new Error("Invalid email or password");
  }
  
  const userData = {
    uid: user.id,
    email: user.email,
    displayName: user.displayName || user.username || user.email.split('@')[0]
  };
  
  await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userData));
  return userData;
};

// Signup
export const signup = async (username, email, password) => {
  const users = await getUsers();
  const existingUser = users.find(u => u.email === email || u.username === username);
  
  if (existingUser) {
    if (existingUser.email === email) {
      throw new Error("User already exists with this email");
    }
    if (existingUser.username === username) {
      throw new Error("Username is already taken");
    }
  }
  
  const newUser = {
    id: Date.now().toString(),
    username: username.trim(),
    email,
    password,
    displayName: username.trim(),
    createdAt: new Date().toISOString()
  };
  
  users.push(newUser);
  await saveUsers(users);
  
  // Don't automatically log in - just return user data for confirmation
  return {
    uid: newUser.id,
    username: newUser.username,
    email: newUser.email,
    displayName: newUser.displayName
  };
};

// Get current user
export const getCurrentUser = async () => {
  try {
    const userData = await AsyncStorage.getItem(CURRENT_USER_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    return null;
  }
};

// Sign out
export const signOut = async () => {
  await AsyncStorage.removeItem(CURRENT_USER_KEY);
};

// Password reset
export const resetPassword = async (email) => {
  const users = await getUsers();
  const user = users.find(u => u.email === email);
  
  if (!user) {
    throw new Error("No account found with this email address");
  }
  
  // Simulate sending reset email
  console.log(`Password reset email sent to ${email}`);
  
  // In a real app, you would:
  // 1. Generate a secure reset token
  // 2. Store it with expiration time
  // 3. Send email with reset link
  // 4. Verify token when user clicks link
  
  // For demo, we'll simulate a successful email send
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
  
  return {
    success: true,
    message: `Password reset instructions have been sent to ${email}`,
    email: email
  };
};

// Update password
export const updatePassword = async (email, newPassword) => {
  const users = await getUsers();
  const userIndex = users.findIndex(u => u.email === email);
  
  if (userIndex === -1) {
    throw new Error("No account found with this email address");
  }
  
  // Update the user's password
  users[userIndex].password = newPassword;
  users[userIndex].updatedAt = new Date().toISOString();
  
  await saveUsers(users);
  
  return {
    success: true,
    message: "Password updated successfully"
  };
};

// Update user profile
export const updateUserProfile = async (userId, profileData) => {
  const users = await getUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    throw new Error("User not found");
  }
  
  // Update the user's profile data
  users[userIndex] = { ...users[userIndex], ...profileData, updatedAt: new Date().toISOString() };
  
  // If displayName is updated, also update username for consistency
  if (profileData.displayName) {
    users[userIndex].username = profileData.displayName;
  }
  
  await saveUsers(users);
  
  // Update current user in AsyncStorage
  const currentUser = await getCurrentUser();
  if (currentUser && currentUser.uid === userId) {
    const updatedCurrentUser = { ...currentUser, ...profileData };
    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedCurrentUser));
    return updatedCurrentUser;
  }
  
  return users[userIndex];
};