import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

import Button from '../src/components/Button';
import { useAuth } from '../src/hooks/useAuth';
import {
    BorderRadius,
    Shadows,
    Spacing,
    Typography
} from '../src/styles/designSystem';

export default function ProfileScreen() {
  const router = useRouter();
  const { logout, user, updateProfile } = useAuth();
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editedUsername, setEditedUsername] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Initialize edited username with current username
    setEditedUsername(user?.displayName || user?.email?.split('@')[0] || 'User');
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleUsernameEdit = () => {
    setIsEditingUsername(true);
  };

  const handleUsernameSave = async () => {
    setIsSaving(true);
    try {
      // Update the user profile with new displayName
      await updateProfile({ displayName: editedUsername.trim() });
      setIsEditingUsername(false);
      Alert.alert('Success', 'Username updated successfully!');
    } catch (error) {
      console.error('Error updating username:', error);
      Alert.alert('Error', 'Failed to update username. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUsernameCancel = () => {
    setEditedUsername(user?.displayName || user?.email?.split('@')[0] || 'User');
    setIsEditingUsername(false);
  };

  const getInitials = () => {
    if (user?.displayName) {
      return user.displayName.charAt(0).toUpperCase();
    } else if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <>
      <StatusBar style="light" backgroundColor="#374353" />
      <View style={styles.container}>
        
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Profile Content */}
        <View style={styles.content}>
          
          {/* Profile Picture Section */}
          <View style={styles.profileSection}>
            <View style={styles.profileImageContainer}>
              <View style={styles.defaultProfileImage}>
                <Text style={styles.profileInitials}>{getInitials()}</Text>
              </View>
            </View>
          </View>

          {/* User Info Section */}
          <View style={styles.infoSection}>
            <View style={styles.infoItem}>
              <View style={styles.infoHeader}>
                <Text style={styles.infoLabel}>Username</Text>
                {!isEditingUsername && (
                  <TouchableOpacity onPress={handleUsernameEdit} style={styles.editButton}>
                    <Text style={styles.editButtonText}>✏️</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {isEditingUsername ? (
                <View style={styles.editContainer}>
                  <TextInput
                    style={styles.editInput}
                    value={editedUsername}
                    onChangeText={setEditedUsername}
                    placeholder="Enter username"
                    placeholderTextColor="#94A3B8"
                  />
                  <View style={styles.editButtons}>
                    <Button
                      title="Save"
                      onPress={handleUsernameSave}
                      loading={isSaving}
                      disabled={isSaving}
                      style={styles.saveButton}
                      size="sm"
                    />
                    <TouchableOpacity onPress={handleUsernameCancel} style={styles.cancelButton}>
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <Text style={styles.infoValue}>
                  {user?.displayName || user?.email?.split('@')[0] || 'User'}
                </Text>
              )}
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>
                {user?.email || 'No email provided'}
              </Text>
            </View>
          </View>

        </View>

        {/* Logout Button */}
        <View style={styles.footer}>
          <Button
            title="Logout"
            onPress={handleLogout}
            style={styles.logoutButton}
            textStyle={styles.logoutButtonText}
          />
        </View>

      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingTop: 0, // No padding
  },

  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Same as welcome
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, // Same as welcome
    paddingVertical: Spacing.lg, // Increased from Spacing.sm to match welcome
    backgroundColor: 'rgba(55, 66, 83, 0.95)', // Same as welcome
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 102, 241, 0.2)',
    ...Shadows.lg, // Same as welcome
    marginTop: -10, // Negative margin to pull header up and eliminate gap
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    // Removed background color
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: Typography.fontSize.lg,
    color: '#A78BFA',
    fontWeight: Typography.fontWeight.bold,
  },
  headerTitle: {
    fontSize: 22, // Same font size as welcome title
    fontWeight: Typography.fontWeight.bold,
    color: '#F8FAFC',
  },
  placeholder: {
    width: 36,
  },

  // Content Styles
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center', // Center content vertically
    alignItems: 'center', // Center content horizontally
  },
  
  // Profile Picture Styles
  profileSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  defaultProfileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(99, 102, 241, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  profileInitials: {
    fontSize: 40,
    fontWeight: Typography.fontWeight.bold,
    color: '#FFFFFF',
  },

  // Info Section Styles
  infoSection: {
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    ...Shadows.md,
  },
  infoItem: {
    marginBottom: Spacing.md,
  },
  infoLabel: {
    fontSize: Typography.fontSize.xs,
    color: '#94A3B8',
    marginBottom: Spacing.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  infoValue: {
    fontSize: Typography.fontSize.base,
    color: '#F8FAFC',
    fontWeight: Typography.fontWeight.medium,
    backgroundColor: 'rgba(51, 65, 85, 0.6)',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },

  // Footer Styles
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderWidth: 1,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    width: '100%',
    ...Shadows.sm,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontWeight: Typography.fontWeight.bold,
    fontSize: Typography.fontSize.base,
    textAlign: 'center',
  },

  // Username Editing Styles
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  editButton: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
    // Removed background color
  },
  editButtonText: {
    fontSize: Typography.fontSize.sm,
  },
  editContainer: {
    width: '100%',
  },
  editInput: {
    backgroundColor: 'rgba(51, 65, 85, 0.8)',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    fontSize: Typography.fontSize.base,
    color: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    marginBottom: Spacing.sm,
  },
  editButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#10B981',
    marginRight: Spacing.xs,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginLeft: Spacing.xs,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontWeight: Typography.fontWeight.semiBold,
    fontSize: Typography.fontSize.sm,
  },
});