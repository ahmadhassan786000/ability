import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    Image,
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
import { BorderRadius, Shadows, Spacing, Typography } from '../../src/styles/designSystem';

export default function SignupScreen() {
  const router = useRouter();
  const { signup } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username.trim())) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await signup(formData.username.trim(), formData.email.trim(), formData.password);
      Alert.alert(
        'Account Created Successfully! 🎉', 
        `Welcome ${formData.username}! Your account has been created. You can now sign in with your credentials.`,
        [{ 
          text: 'Continue to Login', 
          onPress: () => {
            // Navigate to login with pre-filled email
            router.push({
              pathname: '/(auth)/login',
              params: { email: formData.email.trim() }
            });
          }
        }]
      );
    } catch (err) {
      Alert.alert('Signup Failed', err.message || 'Unable to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
              <Image 
                source={require('../../assets/images/ability_logo.jpg')} 
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Join us today
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Username"
              placeholder="username"
              value={formData.username}
              onChangeText={(value) => updateFormData('username', value)}
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.username}
              leftIcon={<Ionicons name="person" size={20} color="#3B82F6" />}
            />

            <Input
              label="Email Address"
              placeholder="email"
              value={formData.email}
              onChangeText={(value) => updateFormData('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.email}
              leftIcon={<Ionicons name="mail" size={20} color="#3B82F6" />}
            />

            <Input
              label="Password"
              placeholder="password"
              value={formData.password}
              onChangeText={(value) => updateFormData('password', value)}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.password}
              leftIcon={<Ionicons name="lock-closed" size={20} color="#3B82F6" />}
            />

            <Input
              label="Confirm Password"
              placeholder="password"
              value={formData.confirmPassword}
              onChangeText={(value) => updateFormData('confirmPassword', value)}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.confirmPassword}
              leftIcon={<Ionicons name="lock-closed" size={20} color="#3B82F6" />}
            />

            <Button
              title="Create Account"
              onPress={handleSignup}
              loading={loading}
              style={styles.signupButton}
            />
          </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Already have an account?{' '}
                <Link href="/(auth)/login">
                  <Text style={styles.linkText}>Sign In</Text>
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
    paddingVertical: Spacing.sm, // کم padding
  },
  
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40, // Half of width/height for perfect circle
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.xl,
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    overflow: 'hidden', // This ensures image stays within circle bounds
  },
  
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 40, // Make the image itself circular
  },
  
  title: {
    fontSize: 24, // چھوٹا title
    fontWeight: Typography.fontWeight.bold,
    color: '#F8FAFC', // Light text
    marginBottom: Spacing.xs, // کم margin
    textAlign: 'center',
  },
  
  subtitle: {
    fontSize: 14, // چھوٹا subtitle
    color: '#94A3B8', // Muted light text
    textAlign: 'center',
    lineHeight: 18, // کم line height
    fontWeight: '400',
  },
  
  form: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)', // Semi-transparent dark card
    padding: Spacing.md, // کم padding
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.sm, // کم margin
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)', // Green accent border
    ...Shadows.xl,
    backdropFilter: 'blur(10px)',
  },
  
  signupButton: {
    marginTop: Spacing.sm, // کم margin
    backgroundColor: '#10B981', // Green button
    borderRadius: BorderRadius.lg,
    ...Shadows.lg,
    elevation: 6,
    paddingVertical: Spacing.sm, // کم padding
  },
  
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.sm, // کم padding
    marginTop: Spacing.sm, // کم margin
  },
  
  footerText: {
    fontSize: 16, // Larger text
    color: '#CBD5E1', // Lighter gray for better visibility
    textAlign: 'center',
  },
  
  linkText: {
    color: '#22D3EE', // Bright cyan for better visibility
    fontWeight: Typography.fontWeight.semiBold,
    textDecorationLine: 'underline',
  },
});