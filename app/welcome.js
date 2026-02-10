import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSpeechRecognitionEvent } from "expo-speech-recognition";
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  Dimensions,
  Platform,
  StyleSheet,
  Text,
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
import { saveVoiceNavigationState } from '../src/utils/voiceNavigationStorage';

export default function WelcomeScreen() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const [voiceNavigationEnabled, setVoiceNavigationEnabled] = useState(false);

  // Initialize voice navigation service and load saved state
  useEffect(() => {
    const initializeVoiceNavigation = async () => {
      // Initialize service with logout callback
      voiceNavigationService.initialize(router, null, 'welcome', handleLogout);

      // Load saved voice navigation state
      const { getVoiceNavigationState } = await import('../src/utils/voiceNavigationStorage');
      const savedState = await getVoiceNavigationState();
      console.log("Loading saved voice navigation state:", savedState);

      setVoiceNavigationEnabled(savedState);
      voiceNavigationService.setSilentEnabled(savedState);

      if (savedState) {
        // Auto-start listening with longer delay to ensure page is ready
        setTimeout(() => {
          console.log("Starting voice recognition on welcome page...");
          voiceNavigationService.startListening();
        }, 1500);

        // Announce page opened
        voiceNavigationService.announcePage('welcome');
      } else {
        console.log("Voice disabled, not starting listening");
      }
    };

    initializeVoiceNavigation();

    // Cleanup function to stop listening when leaving the page
    return () => {
      console.log("Leaving welcome page, stopping voice recognition");
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

  useSpeechRecognitionEvent("start", () => {
    console.log("Voice recognition started");
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
      if (voiceNavigationService.isEnabled && event.error !== 'no-speech') {
        setTimeout(() => {
          console.log("Restarting after error...");
          voiceNavigationService.startListening();
        }, 3000);
      }
    }
  });

  const handleLogout = async () => {
    try {
      // Disable voice navigation before logout
      if (voiceNavigationEnabled) {
        voiceNavigationService.disable();
        setVoiceNavigationEnabled(false);
      }

      // State is preserved across logins now
      // await clearVoiceNavigationState();

      await logout();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const toggleVoiceNavigation = async () => {
    if (voiceNavigationEnabled) {
      // Disable voice navigation
      voiceNavigationService.disable();
      setVoiceNavigationEnabled(false);
      await saveVoiceNavigationState(false);
    } else {
      // Enable voice navigation
      const success = await voiceNavigationService.enable();
      if (success) {
        setVoiceNavigationEnabled(true);
        await saveVoiceNavigationState(true);
        // Start listening after a short delay to ensure everything is set up
        setTimeout(() => {
          console.log("Starting voice recognition from welcome page...");
          voiceNavigationService.startListening();
        }, 1000);
      }
    }
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={Platform.OS === 'ios' ? ['top', 'bottom'] : ['bottom']}
    >
      <StatusBar style="light" backgroundColor="#374353" />

      {/* ===== HEADER ===== */}
      <View style={styles.header}>
        <View style={styles.userSection}>
          <View style={styles.profilePicContainer}>
            <View style={styles.defaultProfilePic}>
              <Text style={styles.profileInitial}>
                {user?.displayName?.charAt(0)?.toUpperCase() ||
                  user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
          </View>

          <View style={styles.welcomeContainer}>
            <Text style={styles.title}>
              {user
                ? user.displayName || user.email?.split('@')[0]
                : 'Guest'}
            </Text>
          </View>
        </View>

        <View style={styles.headerButtons}>
          {/* Voice Navigation Toggle */}
          <TouchableOpacity
            style={[
              styles.voiceButton,
              voiceNavigationEnabled && styles.voiceButtonActive
            ]}
            onPress={toggleVoiceNavigation}
            accessible={true}
            accessibilityLabel={voiceNavigationEnabled ? "Disable voice navigation" : "Enable voice navigation"}
            accessibilityHint={voiceNavigationEnabled ? "Double tap to turn off voice commands" : "Double tap to turn on voice commands"}
          >
            <Ionicons
              name={voiceNavigationEnabled ? 'volume-high' : 'volume-mute'}
              size={24}
              color={voiceNavigationEnabled ? '#22C55E' : '#EF4444'}
            />
          </TouchableOpacity>

          {/* Settings Button */}
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => router.push('/profile')}
            accessible={true}
            accessibilityLabel="Open settings"
            accessibilityHint="Double tap to open profile and settings"
          >
            <Ionicons name="settings-sharp" size={24} color="#A78BFA" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ===== CONTENT ===== */}
      <View style={styles.content}>
        <View style={styles.content}>
          {/* ===== MAIN CARD ===== */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Choose Chat Mode</Text>
            <Text style={styles.cardDescription}>
              Select your preferred way to interact
            </Text>

            {/* Voice Chat */}
            <View style={styles.option}>
              <View style={styles.optionIcon}>
                <Text style={styles.icon}>🎙️</Text>
              </View>
              <View style={styles.optionContent}>
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>Voice Chat</Text>
                  <Text style={styles.optionSub}>Speak naturally</Text>
                </View>
                <Button
                  title="Start"
                  onPress={() => router.push('/chat?mode=voice')}
                  style={styles.primaryButton}
                  textStyle={styles.primaryButtonText}
                />
              </View>
            </View>

            {/* Text Chat */}
            <View style={styles.option}>
              <View style={styles.optionIcon}>
                <Text style={styles.icon}>💬</Text>
              </View>
              <View style={styles.optionContent}>
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>Text Chat</Text>
                  <Text style={styles.optionSub}>Type messages</Text>
                </View>
                <Button
                  title="Start"
                  onPress={() => router.push('/chat?mode=text')}
                  style={styles.secondaryButton}
                  textStyle={styles.secondaryButtonText}
                />
              </View>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingTop: Platform.OS === 'android' ? 0 : 20, // Android status bar compensation
  },

  /* HEADER */
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

  /* CONTENT */
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center', // Center content vertically
    alignItems: 'center', // Center content horizontally
  },

  welcomeContainer: {
    flex: 1,
  },

  // Header buttons container
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  // Voice Navigation Button
  voiceButton: {
    padding: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(239, 68, 68, 0.1)', // Subtle red tint
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  voiceButtonActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)', // Subtle green tint
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },

  voiceIcon: {
    fontSize: Typography.fontSize.xl,
    color: '#EF4444', // Red color when inactive/disabled
    fontWeight: Typography.fontWeight.bold,
  },

  voiceIconActive: {
    color: '#22C55E', // Green color when active
  },

  menuButton: {
    padding: 8,
    borderRadius: BorderRadius.full,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  menuIcon: {
    fontSize: Typography.fontSize.xl,
    color: '#A78BFA', // Light purple
    fontWeight: Typography.fontWeight.bold,
  },

  welcomeText: {
    fontSize: 14,
    color: '#94A3B8',
  },

  title: {
    fontSize: Math.min(20, width * 0.05),
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },

  welcomeContainer: {
    flex: 1,
    marginLeft: Spacing.sm, // Smaller gap
  },

  // User Section (Profile + Username)
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  // Profile Picture Styles
  profilePicContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  defaultProfilePic: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },

  /* CARD */
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderRadius: BorderRadius.lg, // Same as profile infoSection
    padding: Spacing.lg, // Same as profile infoSection
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    ...Shadows.md, // Same as profile infoSection
    width: '100%',
    maxWidth: 400,
  },

  cardTitle: {
    fontSize: Math.min(28, width * 0.07), // Responsive font size (~7% of screen width)
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.sm,
    color: '#F8FAFC',
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(99, 102, 241, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  cardDescription: {
    fontSize: Math.min(16, width * 0.045), // Responsive font size (~4.5% of width)
    color: '#94A3B8',
    marginBottom: Spacing.xl,
    textAlign: 'center',
    lineHeight: 24,
  },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(51, 65, 85, 0.6)',
    padding: Spacing.md, // Keep same as before
    borderRadius: BorderRadius.lg, // Match card border radius
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
    minHeight: 90, // Increased height for vertical layout
  },

  optionIcon: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },

  icon: {
    fontSize: 24,
  },

  optionContent: {
    flex: 1,
    flexDirection: 'column',
  },

  optionText: {
    marginBottom: Spacing.sm,
  },

  optionTitle: {
    fontSize: 14,
    fontWeight: Typography.fontWeight.semiBold,
    color: '#F8FAFC',
  },

  optionSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },

  primaryButton: {
    backgroundColor: '#6366F1',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    ...Shadows.md,
    alignSelf: 'flex-start',
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: Typography.fontWeight.semiBold,
    fontSize: 12,
  },

  secondaryButton: {
    backgroundColor: '#10B981',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    ...Shadows.md,
    alignSelf: 'flex-start',
  },

  secondaryButtonText: {
    color: '#FFFFFF',
    fontWeight: Typography.fontWeight.semiBold,
    fontSize: 12,
  },
});
