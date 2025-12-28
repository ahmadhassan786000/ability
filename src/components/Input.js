import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BorderRadius, Spacing, Typography } from '../styles/designSystem';

export default function Input({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  leftIcon,
  rightIcon,
  style,
  ...props
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputContainerFocused,
        error && styles.inputContainerError,
      ]}>
        {leftIcon && (
          <View style={styles.leftIcon}>
            {leftIcon}
          </View>
        )}
        
        <TextInput
          style={[
            styles.input,
            leftIcon && styles.inputWithLeftIcon,
            (rightIcon || secureTextEntry) && styles.inputWithRightIcon,
          ]}
          placeholder={placeholder}
          placeholderTextColor="#64748B" // Muted light text for placeholder
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        
        {secureTextEntry && (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={togglePasswordVisibility}
          >
            <Text style={styles.eyeIcon}>
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </Text>
          </TouchableOpacity>
        )}
        
        {rightIcon && !secureTextEntry && (
          <View style={styles.rightIcon}>
            {rightIcon}
          </View>
        )}
      </View>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm, // کم margin between inputs
  },
  
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: '#F1F5F9', // Light text for dark theme
    marginBottom: Spacing.xs,
  },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(51, 65, 85, 0.6)', // Semi-transparent dark background
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)', // Subtle purple border
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    minHeight: 48, // کم height
  },
  
  inputContainerFocused: {
    borderColor: '#6366F1', // Purple focus
    borderWidth: 2,
    backgroundColor: 'rgba(51, 65, 85, 0.8)',
  },
  
  inputContainerError: {
    borderColor: '#EF4444', // Red error
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  
  input: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: '#F8FAFC', // Light text
    paddingVertical: Spacing.sm,
  },
  
  inputWithLeftIcon: {
    marginLeft: Spacing.sm,
  },
  
  inputWithRightIcon: {
    marginRight: Spacing.sm,
  },
  
  leftIcon: {
    marginRight: Spacing.xs,
  },
  
  rightIcon: {
    marginLeft: Spacing.xs,
    padding: Spacing.xs,
  },
  
  eyeIcon: {
    fontSize: 18,
  },
  
  errorText: {
    fontSize: Typography.fontSize.sm,
    color: '#F87171', // Light red for error
    marginTop: Spacing.xs,
  },
});