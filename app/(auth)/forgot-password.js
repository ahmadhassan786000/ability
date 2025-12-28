import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import { useAuth } from '../../src/hooks/useAuth';
import { updatePassword } from '../../src/services/authService';
import { BorderRadius, Shadows, Spacing, Typography } from '../../src/styles/designSystem';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [errors, setErrors] = useState({});

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePasswordForm = () => {
    const newErrors = {};
    
    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
    
    // Small delay to help with keyboard dismissal
    setTimeout(async () => {
      try {
        await resetPassword(email.trim());
        // If email is correct, go directly to password reset screen
        setShowPasswordReset(true);
      } catch (err) {
        setErrors({ email: err.message || 'Failed to verify email. Please try again.' });
      } finally {
        setLoading(false);
      }
    }, 100);
  };

  const handleSetNewPassword = async () => {
    if (!validatePasswordForm()) return;

    setLoading(true);
    
    // Small delay to help with keyboard dismissal
    setTimeout(async () => {
      try {
        // Update password in auth service
        await updatePassword(email.trim(), newPassword);
        
        Alert.alert(
          'Password Updated Successfully! 🎉',
          'Your password has been changed. You can now sign in with your new password.',
          [{
            text: 'Continue to Login',
            onPress: () => {
              router.push({
                pathname: '/(auth)/login',
                params: { email: email.trim() }
              });
            }
          }]
        );
      } catch (err) {
        setErrors({ general: err.message || 'Failed to update password. Please try again.' });
      } finally {
        setLoading(false);
      }
    }, 100);
  };

  const handleBackToLogin = () => {
    router.back();
  };

  // Show password reset form after email verification
  if (showPasswordReset) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Text style={styles.logo}>🔑</Text>
              </View>
              <Text style={styles.title}>Set New Password</Text>
              <Text style={styles.subtitle}>
                Enter your new password
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {errors.general && (
                <Text style={styles.errorText}>{errors.general}</Text>
              )}
              
              <Input
                label="New Password"
                placeholder="Enter new password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.newPassword}
                leftIcon={<Text style={styles.inputIcon}>🔒</Text>}
              />

              <Input
                label="Confirm Password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.confirmPassword}
                leftIcon={<Text style={styles.inputIcon}>🔐</Text>}
              />

              <Button
                title="Update Password"
                onPress={handleSetNewPassword}
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
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logo}>🔐</Text>
            </View>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              Enter your email to reset password
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
              title="verify"
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
  
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
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
  },
  
  errorText: {
    fontSize: 14,
    color: '#F87171', // Light red for error
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
});