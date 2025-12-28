import { useState } from 'react';
import { Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
    BorderRadius,
    Shadows,
    Spacing,
    Typography
} from '../styles/designSystem';

export default function TextInputBox({ onSend }) {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (text.trim()) {
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
          style={styles.textInput}
          multiline
          maxLength={1000}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
          enablesReturnKeyAutomatically={true}
        />
        <TouchableOpacity 
          style={[
            styles.sendButton, 
            { opacity: text.trim() ? 1 : 0.5 }
          ]} 
          onPress={handleSend}
          disabled={!text.trim()}
        >
          <Text style={styles.sendButtonText}>Send</Text>
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
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(99, 102, 241, 0.2)', // Purple border
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(51, 65, 85, 0.8)', // Dark gray background
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
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
  sendButton: {
    backgroundColor: '#6366F1', // Purple primary color
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginLeft: Spacing.sm,
    ...Shadows.sm,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
});
