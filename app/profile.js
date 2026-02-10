import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSpeechRecognitionEvent } from "expo-speech-recognition";
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '../src/components/Button';
import { useAuth } from '../src/hooks/useAuth';
import { voiceNavigationService } from '../src/services/voiceNavigationService';
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

  // Initialize voice navigation
  useEffect(() => {
    const initializeVoiceNavigation = async () => {
      voiceNavigationService.initialize(router, null, 'profile', handleLogout);

      // Load saved voice navigation state (will be enabled if user enabled it on welcome page)
      const { getVoiceNavigationState } = await import('../src/utils/voiceNavigationStorage');
      const savedState = await getVoiceNavigationState();
      console.log("Loading saved voice navigation state for profile:", savedState);

      voiceNavigationService.setSilentEnabled(savedState);

      // Only start listening and announce if voice navigation is enabled
      if (savedState) {
        // Auto-start listening with delay
        setTimeout(() => {
          console.log("Starting voice recognition on profile page...");
          voiceNavigationService.startListening();
        }, 1500);

        // Announce page opened
        voiceNavigationService.announcePage('profile');
      } else {
        console.log("Voice disabled, not starting listening");
      }
    };

    initializeVoiceNavigation();

    // Cleanup function to stop listening when leaving the page
    return () => {
      console.log("Leaving profile page, stopping voice recognition");
      voiceNavigationService.stopListening();
    };
  }, [router]);

  // Setup voice recognition event listeners
  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results[0]?.transcript || "";
    const isFinal = event.results[0]?.isFinal || false;

    console.log("Voice recognition result:", transcript, "Final:", isFinal);

    // Only process if voice navigation is enabled
    if (transcript.trim() && voiceNavigationService.isEnabled) {
      if (isFinal) {
        // Process immediately if final
        voiceNavigationService.processVoiceCommand(transcript);
      } else {
        // For interim results, use debounced processing
        voiceNavigationService.processInterimCommand(transcript);
      }
    } else if (transcript.trim() && !voiceNavigationService.isEnabled) {
      console.log("Voice disabled, ignoring command:", transcript);
    }
  });

  useSpeechRecognitionEvent("end", () => {
    console.log("Voice recognition ended");
    // Mark as not listening and let auto-restart handle it
    if (voiceNavigationService.isListening) {
      voiceNavigationService.isListening = false;
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    // Handle different types of errors gracefully
    if (event.error === "no-speech") {
      // Don't restart for no-speech, just log it
      console.log("No speech detected, continuing to listen...");
      // Don't restart - let it continue listening
    } else if (event.error === "aborted") {
      // User cancelled, restart if enabled
      console.log("Speech recognition aborted");
      if (voiceNavigationService.isEnabled) {
        setTimeout(() => {
          voiceNavigationService.startListening();
        }, 2000);
      }
    } else if (event.error === "network") {
      // Network error - handle gracefully without showing error to user
      console.warn("Network error during speech recognition - this is normal and will retry automatically");
      if (voiceNavigationService.isEnabled) {
        // Retry after a longer delay for network issues
        setTimeout(() => {
          console.log("Retrying speech recognition after network error...");
          voiceNavigationService.startListening();
        }, 5000); // 5 second delay for network issues
      }
    } else {
      // Log other errors but still restart - don't show error to user
      console.warn("Speech recognition error:", event.error, event.message || "Unknown error");
      if (voiceNavigationService.isEnabled) {
        setTimeout(() => {
          console.log("Restarting after error...");
          voiceNavigationService.startListening();
        }, 3000);
      }
    }
  });

  useEffect(() => {
    // Initialize edited username with current username
    setEditedUsername(user?.displayName || user?.email?.split('@')[0] || 'User');
  }, [user]);

  const handleLogout = async () => {
    try {
      // Disable voice navigation before logout
      voiceNavigationService.disable();

      // State is preserved across logins now
      // await clearVoiceNavigationState();

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
    <SafeAreaView
      style={styles.safeContainer}
      edges={Platform.OS === 'ios' ? ['top'] : []}
    >
      <StatusBar style="light" backgroundColor="#374353" />
      <View style={styles.container}>

        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#A78BFA" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile </Text>
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
                    <Ionicons name="pencil" size={18} color="#A78BFA" />
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
        <SafeAreaView
          style={styles.footer}
          edges={Platform.OS === 'ios' ? ['bottom'] : []}
        >
          <View style={styles.logoutContainer}>
            <Button
              title="Logout"
              onPress={handleLogout}
              style={styles.logoutButton}
              textStyle={styles.logoutButtonText}
            />
          </View>
        </SafeAreaView>

      </View>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingTop: Platform.OS === 'android' ? 0 : 20, // Reduced padding
  },

  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 15,
    backgroundColor: '#374353',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 102, 241, 0.2)',
    minHeight: 60, // Increased height
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
  },
  backButtonText: {
    fontSize: Typography.fontSize.xl,
    color: '#A78BFA',
    fontWeight: Typography.fontWeight.bold,
  },
  headerTitle: {
    fontSize: Math.min(22, width * 0.06),
    fontWeight: '700',
    color: '#F8FAFC',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  // Content Styles
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Profile Picture Styles
  profileSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl, // More spacing
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: Spacing.sm,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  defaultProfileImage: {
    width: Math.min(120, width * 0.3), // Responsive size
    height: Math.min(120, width * 0.3),
    borderRadius: Math.min(60, width * 0.15),
    backgroundColor: 'rgba(99, 102, 241, 0.1)', // Lighter background
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#6366F1', // Solid border color
  },
  profileInitials: {
    fontSize: Math.min(48, width * 0.12), // Responsive font size
    fontWeight: Typography.fontWeight.bold,
    color: '#F8FAFC',
    textShadowColor: 'rgba(99, 102, 241, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  // Info Section Styles
  infoSection: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    ...Shadows.lg,
  },
  infoItem: {
    marginBottom: Spacing.lg,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 13,
    color: '#A78BFA', // Purple label
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 16,
    color: '#F8FAFC',
    fontWeight: '500',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
    overflow: 'hidden',
  },

  // Footer Styles
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    paddingBottom: Platform.OS === 'android' ? Spacing.xl : Spacing.lg,
    alignItems: 'center',
    width: '100%',
  },
  logoutContainer: {
    width: '100%',
    maxWidth: 400,
    marginBottom: Platform.OS === 'android' ? 20 : 0,
  },
  logoutButton: {
    backgroundColor: 'transparent',
    borderColor: '#F87171',
    borderWidth: 1,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderRadius: BorderRadius.full, // Pill shape
    width: '100%',
  },
  logoutButtonText: {
    color: '#F87171',
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  // Username Editing Styles
  editButton: {
    padding: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: BorderRadius.full,
  },
  editContainer: {
    width: '100%',
  },
  editInput: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    padding: 12,
    borderRadius: BorderRadius.md,
    fontSize: 16,
    color: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#6366F1',
    marginBottom: Spacing.md,
  },
  editButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#10B981',
    marginRight: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 10,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginLeft: Spacing.xs,
  },
  cancelButtonText: {
    color: '#F87171',
    fontWeight: '600',
    fontSize: 14,
  },
});