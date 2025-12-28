import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
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

export default function WelcomeScreen() {
  const router = useRouter();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <>
      <StatusBar style="light" backgroundColor="#374353" />
      <View style={styles.container}>

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

          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => router.push('/profile')}
          >
            <Text style={styles.menuIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* ===== CONTENT ===== */}
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
    </>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Dark slate background
  },

  /* HEADER */
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Remove vertical centering
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg, // Increased from Spacing.sm
    backgroundColor: 'rgba(55, 66, 83, 0.95)', // Semi-transparent dark (same as chat)
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 102, 241, 0.2)',
    ...Shadows.lg,
  },

  /* CONTENT */
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg, // Gap between header and content
    paddingBottom: Spacing.lg,
    justifyContent: 'center', // Center the card vertically
    alignItems: 'center', // Center the card horizontally
  },

  welcomeContainer: {
    flex: 1,
  },

  menuButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    // Removed background color
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
    fontSize: 22, // Increased from 18
    fontWeight: Typography.fontWeight.bold,
    color: '#F8FAFC',
  },

  welcomeContainer: {
    flex: 1,
    marginLeft: Spacing.md, // Add gap between profile pic and username
  },

  // User Section (Profile + Username)
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  // Profile Picture Styles
  profilePicContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF', // White background
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },

  defaultProfilePic: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
    backgroundColor: '#FFFFFF', // White background
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileInitial: {
    fontSize: 20,
    fontWeight: Typography.fontWeight.bold,
    color: '#374151', // Dark text on white background
  },

  /* CARD */
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    ...Shadows.xl,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: 6,
    color: '#F8FAFC',
  },

  cardDescription: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: Spacing.md,
  },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(51, 65, 85, 0.6)',
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
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
