import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import { useAuth } from '../../src/hooks/useAuth';
import { BorderRadius, Spacing } from '../../src/styles/designSystem';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [emailSent, setEmailSent] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const safeAlert = (title, message, buttons = []) => {
    if (Platform.OS === 'web') {
      alert(`${title}\n\n${message}`);
      if (buttons.length > 0 && buttons[0].onPress) {
        buttons[0].onPress();
      }
    } else {
      Alert.alert(title, message, buttons);
    }
  };

  const handleResetPassword = async () => {
    setErrors({});

    if (!email.trim()) {
      setErrors({ email: 'Email address is required' });
      return;
    }

    if (!validateEmail(email.trim())) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }

    setLoading(true);

    try {
      console.log('Attempting to send reset email to:', email.trim());
      const result = await resetPassword(email.trim());
      console.log('Reset password result:', result);

      setEmailSent(true);

      safeAlert(
        'Password Reset Email Sent!',
        `We've sent password reset instructions to ${email.trim()}.\n\n⚠️ IMPORTANT: Check your SPAM/JUNK folder if you don't see the email in your inbox within 2-3 minutes.`,
        [{
          text: 'Back to Login',
          onPress: () => {
            router.push({
              pathname: '/(auth)/login',
              params: { email: email.trim() }
            });
          }
        }]
      );
    } catch (err) {
      console.error('Reset password error:', err);
      setErrors({ email: err.message || 'Failed to send reset email. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // Show success screen if email was sent
  if (emailSent) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={Platform.OS === 'ios' ? ['top', 'bottom'] : ['bottom']}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logo}>📧</Text>
            </View>
            <Text style={styles.title}>Check Your Email</Text>
            <Text style={styles.subtitle}>
              We've sent password reset instructions to {email}
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.instructionText}>
              Please check your spam folder at email and click the reset link to set a new password. The link will expire in 1 hour.
              {'\n\n'}
              ⚠️ If you don't see the email in your inbox, please check your SPAM/JUNK folder. The email comes from: noreply@ability-59841.firebaseapp.com
            </Text>

            <Button
              title="Back to Login"
              onPress={() => router.push('/(auth)/login')}
              style={styles.resetButton}
            />

            <Button
              title="Resend Email"
              onPress={() => {
                setEmailSent(false);
                handleResetPassword();
              }}
              style={[styles.resetButton, styles.secondaryButton]}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={Platform.OS === 'ios' ? ['top', 'bottom'] : ['bottom']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Text style={styles.logo}>🔐</Text>
              </View>
              <Text style={styles.title}>Forgot Password?</Text>
              <Text style={styles.subtitle}>
                Enter your email to receive a password reset link
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <Input
                label="Email Address"
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.email}
                leftIcon={<Text style={styles.inputIcon}>✉️</Text>}
              />

              <Button
                title="Send Reset Email"
                onPress={handleResetPassword}
                loading={loading}
                style={styles.resetButton}
              />
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Remember your password?{' '}
                <Link href="/(auth)/login">
                  <Text style={styles.linkText}>Back to Login</Text>
                </Link>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },

  content: {
    paddingHorizontal: Spacing.lg,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },

  header: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },

  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(245, 158, 11, 0.1)', // Orange tint
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },

  logo: {
    fontSize: 40,
  },

  title: {
    fontSize: Math.min(28, width * 0.08),
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing.sm,
  },

  form: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)', // Orange border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },

  inputIcon: {
    fontSize: 20,
  },

  resetButton: {
    marginTop: Spacing.lg,
    backgroundColor: '#F59E0B',
    borderRadius: BorderRadius.full,
    paddingVertical: 14,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#F59E0B',
    marginTop: Spacing.md,
  },

  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginTop: Spacing.md,
  },

  footerText: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
  },

  linkText: {
    color: '#F59E0B',
    fontWeight: '700',
  },

  instructionText: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.lg,
  },

  errorText: {
    fontSize: 14,
    color: '#F87171',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
});