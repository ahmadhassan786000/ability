import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
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
import { BorderRadius, Shadows, Spacing, Typography } from '../../src/styles/designSystem';

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
        `We've sent password reset instructions to ${email.trim()}.\n\n⚠️ IMPORTANT: Check your SPAM/JUNK folder if you don't see the email in your inbox within 2-3 minutes.\n\nThe email will come from: noreply@ability-59841.firebaseapp.com`,
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
      <SafeAreaView style={styles.container}>
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
    <SafeAreaView style={styles.container}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Dark slate background
  },
  
  keyboardView: {
    flex: 1,
  },
  
  scrollContent: {
    flexGrow: 1,
    minHeight: Platform.OS === 'web' ? '100vh' : undefined,
    justifyContent: 'center',
    paddingVertical: Platform.OS === 'web' ? 40 : 20,
  },
  
  content: {
    paddingHorizontal: Spacing.md,
    maxWidth: Platform.OS === 'web' ? 400 : undefined,
    alignSelf: 'center',
    width: '100%',
  },
  
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.full,
    backgroundColor: '#F59E0B', // Orange for forgot password
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.xl,
    borderWidth: 3,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  
  logo: {
    fontSize: 28,
  },
  
  title: {
    fontSize: 28,
    fontWeight: Typography.fontWeight.bold,
    color: '#F8FAFC', // Light text
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  
  subtitle: {
    fontSize: 16,
    color: '#94A3B8', // Muted light text
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '400',
  },
  
  form: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)', // Semi-transparent dark card
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)', // Orange accent border
    ...Shadows.xl,
    backdropFilter: 'blur(10px)',
  },
  
  inputIcon: {
    fontSize: 18,
  },
  
  resetButton: {
    marginTop: Spacing.md,
    backgroundColor: '#F59E0B', // Orange button
    borderRadius: BorderRadius.lg,
    ...Shadows.lg,
    elevation: 6,
    paddingVertical: Spacing.md,
  },
  
  secondaryButton: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    marginTop: Spacing.md,
    backgroundColor: 'rgba(15, 23, 42, 0.8)', // Slightly different background
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
  },
  
  footerText: {
    fontSize: 16, // Larger text
    color: '#CBD5E1', // Lighter gray for better visibility
    textAlign: 'center',
  },
  
  linkText: {
    color: '#FCD34D', // Bright yellow-orange for better visibility
    fontWeight: Typography.fontWeight.semiBold,
    textDecorationLine: 'underline',
  },
  
  instructionText: {
    fontSize: 14,
    color: '#94A3B8', // Muted light text
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  
  errorText: {
    fontSize: 14,
    color: '#F87171', // Light red for error
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
});