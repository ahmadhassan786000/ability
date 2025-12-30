import { Ionicons } from '@expo/vector-icons';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    View,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import { useAuth } from '../../src/hooks/useAuth';
import { BorderRadius, Shadows, Spacing, Typography } from '../../src/styles/designSystem';

export default function LoginScreen() {
  const router = useRouter();
  const { email: prefilledEmail } = useLocalSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Pre-fill email if coming from signup
  useEffect(() => {
    if (prefilledEmail) {
      setEmail(prefilledEmail);
    }
  }, [prefilledEmail]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      router.replace('/welcome');
    } catch (err) {
      // Show specific error message with helpful suggestions
      const errorMessage = err.message || 'Please check your credentials and try again.';
      
      if (err.message && err.message.includes('No account found')) {
        Alert.alert(
          'Account Not Found', 
          'No account exists with this email address. Would you like to create a new account?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Sign Up', 
              onPress: () => router.push('/(auth)/signup')
            }
          ]
        );
      } else {
        Alert.alert('Login Failed', errorMessage);
      }
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
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
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
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>
                Sign in to continue with Ability AI
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <Input
                label="Email Address"
                placeholder="email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                error={errors.email}
                leftIcon={<Ionicons name="mail" size={20} color="#3B82F6" />}
              />

              <Input
                label="Password"
                placeholder="password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                error={errors.password}
                leftIcon={<Ionicons name="lock-closed" size={20} color="#3B82F6" />}
              />

              <Button
                title="Sign In"
                onPress={handleLogin}
                loading={loading}
                dismissKeyboard={true}
                style={styles.loginButton}
              />

              {/* Forgot Password Link */}
              <View style={styles.forgotPasswordContainer}>
                <Link href="/(auth)/forgot-password">
                  <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
                </Link>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Don't have an account?{' '}
                <Link href="/(auth)/signup">
                  <Text style={styles.linkText}>Sign Up</Text>
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
    borderColor: 'rgba(99, 102, 241, 0.2)',
    ...Shadows.xl,
    backdropFilter: 'blur(10px)',
  },
  
  loginButton: {
    marginTop: Spacing.md,
    backgroundColor: '#6366F1',
    borderRadius: BorderRadius.lg,
    ...Shadows.lg,
    elevation: 6,
    paddingVertical: Spacing.md,
  },
  
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  
  forgotPasswordText: {
    fontSize: Typography.fontSize.base,
    color: '#A78BFA', // Light purple for better visibility
    fontWeight: Typography.fontWeight.medium,
    textDecorationLine: 'underline',
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
    color: '#A78BFA', // Light purple accent for better visibility
    fontWeight: Typography.fontWeight.semiBold,
    textDecorationLine: 'underline',
  },
});