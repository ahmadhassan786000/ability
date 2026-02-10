import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Keyboard, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import {
  BorderRadius,
  Shadows,
  Spacing,
  Typography
} from '../styles/designSystem';

export default function TextInputBox({ onSend, loading = false }) {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (text.trim() && !loading) {
      onSend(text.trim());
      setText('');
      Keyboard.dismiss(); // Dismiss keyboard after sending message
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor="#94A3B8" // Light gray for dark theme
          style={[styles.textInput, loading && styles.textInputDisabled]}
          multiline
          maxLength={1000}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
          enablesReturnKeyAutomatically={true}
          editable={!loading}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            { opacity: (text.trim() && !loading) ? 1 : 0.6, backgroundColor: (text.trim() && !loading) ? '#6366F1' : '#334155' }
          ]}
          onPress={handleSend}
          disabled={!text.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={18} color="#FFFFFF" style={{ marginLeft: 2 }} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Named export for compatibility
export { TextInputBox };

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A', // Dark slate background to match chat
    paddingHorizontal: Spacing.lg,
    paddingVertical: 2, // Further reduced
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(51, 65, 85, 0.8)', // Dark gray background
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs, // Reduced from sm
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)', // Purple border
    ...Shadows.md,
  },
  textInput: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: '#F8FAFC', // Light text color
    maxHeight: 100,
    paddingVertical: Spacing.xs,
    paddingRight: Spacing.sm,
  },
  textInputDisabled: {
    opacity: 0.6,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18, // Circular
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
    marginBottom: 2, // Align with text input bottom
    ...Shadows.sm,
  },
});
