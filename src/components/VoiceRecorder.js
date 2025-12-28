import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function VoiceRecorder({ onSend }) {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const [recordingTimer, setRecordingTimer] = useState(0);
  const [previousText, setPreviousText] = useState(""); // Store previous text for appending

  // Speech recognition event listeners
  useSpeechRecognitionEvent("start", () => {
    setIsRecording(true);
    console.log("Speech recognition started");
  });

  useSpeechRecognitionEvent("end", () => {
    setIsRecording(false);
    console.log("Speech recognition ended");
  });

  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results[0]?.transcript || "";
    
    // If we have previous text, append the new transcript
    if (previousText) {
      setRecognizedText(previousText + " " + transcript);
    } else {
      setRecognizedText(transcript);
    }
    
    console.log("Recognized:", transcript);
  });

  useSpeechRecognitionEvent("error", (event) => {
    // Handle different types of errors gracefully
    if (event.error === "no-speech") {
      // Don't show alert or error for no-speech, just reset state
      console.log("No speech detected, resetting...");
      setIsRecording(false);
      setRecognizedText("");
    } else if (event.error === "aborted") {
      // User cancelled, just reset state
      console.log("Speech recognition aborted");
      setIsRecording(false);
      setRecognizedText("");
    } else if (event.error === "network") {
      // Network error - show user-friendly message
      console.log("Network error during speech recognition");
      Alert.alert(
        "Connection Issue", 
        "Unable to connect to speech recognition service. Please check your internet connection and try again.",
        [{ text: "OK", style: "default" }]
      );
      setIsRecording(false);
      setRecognizedText("");
    } else {
      // Show alert and log error for other genuine issues
      console.error("Speech recognition error:", event.error, event.message);
      Alert.alert("Error", `Speech recognition failed: ${event.message || event.error}`);
      setIsRecording(false);
    }
  });

  useEffect(() => {
    checkPermissions();
  }, []);

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTimer(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingTimer(0);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const checkPermissions = async () => {
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      setHasPermission(result.granted);
      
      if (!result.granted) {
        Alert.alert(
          'Permission Required', 
          'Microphone permission is required for voice recording'
        );
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      setHasPermission(false);
    }
  };

  const startRecording = async () => {
    if (!hasPermission) {
      await checkPermissions();
      return;
    }

    try {
      setRecognizedText("");
      setPreviousText(""); // Reset previous text for new recording

      const options = {
        lang: "en-US",
        interimResults: true,
        continuous: true, // Try continuous mode for longer recording
        maxAlternatives: 1,
        timeout: 10000, // 10 seconds timeout
      };

      // Start speech recognition
      ExpoSpeechRecognitionModule.start(options);

    } catch (error) {
      console.error("Failed to start speech recognition:", error);
      Alert.alert("Error", "Failed to start voice recording");
      setIsRecording(false);
    }
  };

  const resumeRecording = async () => {
    if (!hasPermission) {
      await checkPermissions();
      return;
    }

    try {
      // Store the current recognized text to append to later
      setPreviousText(recognizedText);

      const options = {
        lang: "en-US",
        interimResults: true,
        continuous: true, // Try continuous mode for longer recording
        maxAlternatives: 1,
        timeout: 10000, // 10 seconds timeout
      };

      // Start speech recognition
      ExpoSpeechRecognitionModule.start(options);
      
    } catch (error) {
      console.error("Failed to resume speech recognition:", error);
      Alert.alert("Error", "Failed to resume voice recording");
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch (error) {
      console.error("Failed to stop speech recognition:", error);
      setIsRecording(false);
    }
  };

  const sendRecognizedText = async () => {
    if (!recognizedText.trim()) {
      Alert.alert("No Speech", "No speech was recognized. Please try again.");
      return;
    }

    try {
      // Send the recognized text to chat (chat service will handle AI response)
      onSend(recognizedText);
      
      // Reset state
      setRecognizedText("");
      setPreviousText(""); // Reset previous text after sending
      
    } catch (error) {
      console.error("Failed to process recognized text:", error);
      Alert.alert("Error", "Failed to process your message");
    }
  };

  const cancelRecording = async () => {
    try {
      ExpoSpeechRecognitionModule.stop();
      setRecognizedText("");
      setPreviousText(""); // Reset previous text when canceling
    } catch (error) {
      console.error("Failed to cancel recording:", error);
      setIsRecording(false);
      setRecognizedText("");
      setPreviousText("");
    }
  };

  return (
    <View style={styles.container}>
      {!isRecording && !recognizedText && (
        <TouchableOpacity
          onPress={startRecording}
          style={styles.recordButton}
          disabled={!hasPermission}
        >
          <Text style={styles.buttonText}>
            {hasPermission ? "🎙️ Tap to Record" : "🚫 Permission Required"}
          </Text>
        </TouchableOpacity>
      )}

      {isRecording && (
        <View style={styles.recordingContainer}>
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Listening... {recordingTimer}s</Text>
          </View>
          
          {recognizedText ? (
            <View style={styles.transcriptContainer}>
              <Text style={styles.transcriptText}>"{recognizedText}"</Text>
            </View>
          ) : null}
          
          <TouchableOpacity
            onPress={stopRecording}
            style={styles.stopButton}
          >
            <Text style={styles.buttonText}>⏹️ Stop</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isRecording && recognizedText && (
        <View style={styles.resultContainer}>
          <View style={styles.transcriptContainer}>
            <Text style={styles.transcriptLabel}>Recognized:</Text>
            <Text style={styles.transcriptText}>"{recognizedText}"</Text>
          </View>
          
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={cancelRecording}
              style={[styles.actionButton, styles.deleteButton]}
            >
              <Text style={styles.actionButtonText}>✕</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.microphoneContainer}
              onPress={resumeRecording}
            >
              <Text style={styles.microphoneIcon}>🔄</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={sendRecognizedText}
              style={[styles.actionButton, styles.sendButton]}
            >
              <Text style={styles.actionButtonText}>➤</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// Named export for compatibility
export { VoiceRecorder };

const styles = StyleSheet.create({
  container: { 
    padding: 16, 
    borderTopWidth: 1, 
    borderColor: "rgba(99, 102, 241, 0.2)", 
    backgroundColor: '#0F172A' // Changed from light gray to dark background
  },
  recordButton: { 
    padding: 16, 
    backgroundColor: "#6366F1", // Reverted back to blue
    borderRadius: 12, 
    alignItems: "center",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recordingContainer: {
    alignItems: 'center',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  resultContainer: {
    alignItems: 'center',
  },
  transcriptContainer: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  transcriptLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  transcriptText: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  sendButton: {
    backgroundColor: '#25D366', // WhatsApp green
  },
  actionButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  microphoneContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  microphoneIcon: {
    fontSize: 24,
    color: '#25D366', // WhatsApp green
  },
  stopButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonText: { 
    color: "#FFFFFF", 
    fontWeight: "600", 
    fontSize: 14 
  },
});