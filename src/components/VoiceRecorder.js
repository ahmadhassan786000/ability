import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { chatService } from '../services/chatService';
import { BorderRadius, Shadows, Spacing } from '../styles/designSystem';
import { safeAlert } from '../utils/alertUtils';

const VoiceRecorder = forwardRef(({ onSend, loading = false }, ref) => {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const [recordingTimer, setRecordingTimer] = useState(0);
  const [previousText, setPreviousText] = useState(""); // Store previous text for appending
  const [isManuallyStopped, setIsManuallyStopped] = useState(false); // Track manual stop

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    startRecording: () => {
      if (!isRecording && !recognizedText) {
        startRecording();
      }
    },
    stopAndSend: () => {
      if (isRecording) {
        stopRecording();
      } else if (recognizedText) {
        sendRecognizedText();
      }
    }
  }));

  // Speech recognition event listeners - always active for voice chat
  useSpeechRecognitionEvent("start", () => {
    setIsRecording(true);
    console.log("Speech recognition started");
  });

  useSpeechRecognitionEvent("end", () => {
    // Only set as not recording if manually stopped or if we are not in auto-restart mode
    // However, for this UI, we usually reflect the engine state.
    // If we want it to "stay started" effectively, we might need to restart it.
    console.log("Speech recognition ended");
    setIsRecording(false);

    // If not manually stopped, we might want to restart?
    // For now, let's respect the engine state but handle the "barge-in" in 'result'
  });

  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results[0]?.transcript || "";

    // BARGE-IN: If user starts speaking, stop any AI speech immediately
    if (transcript.trim()) {
      chatService.stopSpeech();
    }

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
      console.warn("Network error during speech recognition - connection issue");
      safeAlert(
        "Connection Issue",
        "Unable to connect to speech recognition service. Please check your internet connection and try again."
      );
      setIsRecording(false);
      setRecognizedText("");
    } else {
      // Show alert and log error for other genuine issues
      console.warn("Speech recognition error:", event.error, event.message || "Unknown error");
      safeAlert("Error", `Speech recognition failed: ${event.message || event.error}`);
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

  // Component to safely handle KeepAwake hook conditionally
  const KeepAwakeAgent = () => {
    useKeepAwake();
    return null;
  };

  const checkPermissions = async () => {
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      setHasPermission(result.granted);

      if (!result.granted) {
        safeAlert(
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
      setIsManuallyStopped(false); // Reset manual stop flag

      const options = {
        lang: "en-US",
        interimResults: true,
        continuous: true, // Try continuous mode for longer recording
        maxAlternatives: 1,
        requiresOnDeviceRecognition: false,
        // timeout: 10000, // REMOVED timeout to keep listening longer
      };

      // Start speech recognition
      await ExpoSpeechRecognitionModule.start(options);

    } catch (error) {
      console.error("Failed to start speech recognition:", error);
      safeAlert("Error", "Failed to start voice recording");
      setIsRecording(false);
    }
  };

  const handleManualRecord = async () => {
    // Stop any ongoing AI speech when user manually starts recording
    chatService.stopSpeech();
    await startRecording();
  };

  const resumeRecording = async () => {
    if (!hasPermission) {
      await checkPermissions();
      return;
    }

    try {
      // Stop any ongoing AI speech when user resumes recording
      chatService.stopSpeech();

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
      safeAlert("Error", "Failed to resume voice recording");
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      setIsManuallyStopped(true); // Mark as manually stopped
      ExpoSpeechRecognitionModule.stop();
    } catch (error) {
      console.error("Failed to stop speech recognition:", error);
      setIsRecording(false);
    }
  };

  const sendRecognizedText = async () => {
    if (!recognizedText.trim() || loading) {
      if (!recognizedText.trim()) {
        safeAlert("No Speech", "No speech was recognized. Please try again.");
      }
      return;
    }

    try {
      // Send the recognized text to chat (chat service will handle AI response)
      await onSend(recognizedText);

      // Reset state for NEXT recording
      setRecognizedText("");
      setPreviousText("");

      // AUTO-RESTART: Immediately start listening again after sending
      // This fulfills "started hi rhy" (keep it started/restarted)
      startRecording();

    } catch (error) {
      console.error("Failed to process recognized text:", error);
      safeAlert("Error", "Failed to process your message");
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
      {isRecording && <KeepAwakeAgent />}
      {!isRecording && !recognizedText && (
        <TouchableOpacity
          onPress={handleManualRecord}
          style={styles.recordButton}
          disabled={!hasPermission}
          accessible={true}
          accessibilityLabel={hasPermission ? "Start voice recording" : "Microphone permission required"}
          accessibilityHint={hasPermission ? "Double tap to start recording your voice message" : "Grant microphone permission to use voice recording"}
          accessibilityRole="button"
        >
          <Ionicons name={hasPermission ? "mic" : "mic-off"} size={24} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.recordButtonText}>
            {hasPermission ? "Tap to Record" : "Permission Required"}
          </Text>
        </TouchableOpacity>
      )}

      {isRecording && (
        <View style={styles.recordingContainer}>
          <View
            style={styles.recordingIndicator}
            accessible={true}
            accessibilityLabel={`Recording in progress, ${recordingTimer} seconds`}
            accessibilityLiveRegion="polite"
          >
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Listening...</Text>
          </View>

          {recognizedText ? (
            <View
              style={styles.transcriptContainer}
              accessible={true}
              accessibilityLabel={`Recognized text: ${recognizedText}`}
            >
              <Text style={styles.transcriptText}>"{recognizedText}"</Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={stopRecording}
            style={styles.stopButton}
            accessible={true}
            accessibilityLabel="Stop recording"
            accessibilityHint="Double tap to stop voice recording"
            accessibilityRole="button"
          >
            <View style={styles.stopIconInner} />
            <Text style={styles.stopButtonText}>Stop Recording</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isRecording && recognizedText && (
        <View style={styles.resultContainer}>
          <View
            style={styles.transcriptContainer}
            accessible={true}
            accessibilityLabel={`Your message: ${recognizedText}`}
          >
            <Text style={styles.transcriptLabel}>Recognized:</Text>
            <Text style={styles.transcriptText}>"{recognizedText}"</Text>
          </View>

          <View style={styles.actionRow}>
            {/* Cancel / Delete Button */}
            <TouchableOpacity
              onPress={cancelRecording}
              style={[styles.circleButton, styles.deleteButton]}
              accessible={true}
              accessibilityLabel="Delete message"
              accessibilityHint="Double tap to delete the recorded message"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Resume / Redo Button */}
            <TouchableOpacity
              style={[styles.circleButton, styles.resumeButton]}
              onPress={resumeRecording}
              accessible={true}
              accessibilityLabel="Record more"
              accessibilityHint="Double tap to continue recording and add more to your message"
              accessibilityRole="button"
            >
              <Ionicons name="refresh" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Send Button */}
            <TouchableOpacity
              onPress={sendRecognizedText}
              style={[
                styles.circleButton,
                styles.sendButton,
                loading && styles.buttonDisabled
              ]}
              disabled={loading}
              accessible={true}
              accessibilityLabel={loading ? "Sending message" : "Send message"}
              accessibilityHint={loading ? "Message is being sent" : "Double tap to send your voice message"}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={22} color="#FFFFFF" style={{ marginLeft: 2 }} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
});

// Named export for compatibility
export { VoiceRecorder };

const styles = StyleSheet.create({
  container: {
    padding: Spacing.sm,
    backgroundColor: '#0F172A',
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.xs,
  },
  recordButton: {
    flexDirection: 'row',
    paddingVertical: 14,
    backgroundColor: "#6366F1",
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: 'center',
    ...Shadows.md,
    width: '100%',
  },
  recordButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  recordingContainer: {
    alignItems: 'center',
    width: '100%',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  resultContainer: {
    alignItems: 'center',
    width: '100%',
  },
  transcriptContainer: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    padding: 12,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
  },
  transcriptLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A78BFA',
    marginBottom: 4,
  },
  transcriptText: {
    fontSize: 15,
    color: '#F8FAFC',
    lineHeight: 22,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly', // Evenly distribute buttons
    width: '100%',
    paddingHorizontal: 10,
  },
  circleButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)', // Red
  },
  resumeButton: {
    backgroundColor: 'rgba(245, 158, 11, 0.9)', // Amber/Orange
  },
  sendButton: {
    backgroundColor: '#10B981', // Green
    width: 60, // Slightly larger send button
    height: 60,
    borderRadius: 30,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  stopButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  stopIconInner: {
    width: 14,
    height: 14,
    backgroundColor: '#EF4444',
    borderRadius: 2,
    marginRight: 8,
  },
  stopButtonText: {
    color: "#EF4444",
    fontWeight: "600",
    fontSize: 15
  },
});