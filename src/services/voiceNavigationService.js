import * as Speech from 'expo-speech';
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";

class VoiceNavigationService {
  constructor() {
    this.isEnabled = false;
    this.isListening = false;
    this.router = null;
    this.currentSpeech = null;
    this.voiceRecorderRef = null; // Reference to voice recorder component
    this.currentPage = 'welcome'; // Track current page
    this.interimCommandTimeout = null; // For debouncing interim commands
    this.lastInterimCommand = ''; // Store last interim command
    this.isWakeWordDetected = false; // Track if "ability" was detected
    this.wakeWordTimeout = null; // Timeout for wake word detection
    this.lastErrorTime = 0; // Track last error message time
    this.errorCooldown = 3000; // 3 seconds cooldown between error messages
    this.isExecutingCommand = false; // Prevent multiple command executions
    this.lastExecutedCommand = ''; // Track last executed command
    this.commandCooldown = 2000; // 2 seconds cooldown between same commands
    this.lastCommandTime = 0; // Track last command execution time
    this.isVoiceInputMode = false; // Track if in voice input mode for chat
    this.voiceInputText = ''; // Store voice input text
    this.voiceInputTimeout = null; // Timeout for voice input
    this.onSendMessage = null; // Callback to send message
    this.autoRestartTimer = null; // Timer for auto-restart
  }

  // Initialize with router and optional voice recorder reference
  initialize(router, voiceRecorderRef = null, currentPage = 'welcome', logoutCallback = null, onSendMessage = null) {
    this.router = router;
    this.voiceRecorderRef = voiceRecorderRef;
    this.currentPage = currentPage;
    this.logoutCallback = logoutCallback;
    this.onSendMessage = onSendMessage; // Callback to send message to chat
  }

  // Set voice navigation state (for persistence across pages)
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  // Silently enable voice navigation (for loading saved state)
  setSilentEnabled(enabled) {
    this.isEnabled = enabled;
  }

  // Announce page opened (only if voice navigation is enabled)
  announcePage(pageName) {
    if (!this.isEnabled) {
      console.log("Voice disabled, not announcing page:", pageName);
      return;
    }

    const messages = {
      'welcome': 'Home page opened',
      'voice-chat': 'Voice chat opened',
      'text-chat': 'Text chat opened',
      'profile': 'Settings opened'
    };

    if (messages[pageName]) {
      // Longer delay for chat pages to wait for loading to complete
      const delay = (pageName === 'voice-chat' || pageName === 'text-chat') ? 2000 : 500;

      setTimeout(() => {
        this.speak(messages[pageName]);
      }, delay);
    }
  }

  // Enable voice navigation
  async enable() {
    try {
      // Request permissions
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        this.speakForced("Microphone permission is required for voice navigation");
        return false;
      }

      this.isEnabled = true;
      this.speakForced("Voice enabled");

      // Don't start listening here - let the React component handle it
      console.log("Voice enabled, waiting for React component to start listening");
      return true;
    } catch (error) {
      console.error("Error enabling voice navigation:", error);
      return false;
    }
  }

  // Disable voice navigation (only disable command listening, not all voice functionality)
  disable() {
    this.isEnabled = false;
    this.stopListening();

    // Allow this specific announcement even when disabled
    this.speakForced("Voice disabled");

    // Note: This only disables voice navigation commands.
    // Normal voice chat functionality (VoiceRecorder component) will continue to work
    // because it has its own speech recognition that's independent of this service.
  }

  // Start listening for voice commands (called by React component)
  async startListening() {
    if (!this.isEnabled || this.isListening) return;

    try {
      this.isListening = true;
      console.log("Starting voice recognition...");

      const options = {
        lang: "en-US",
        interimResults: true,
        continuous: true,
        maxAlternatives: 1,
        timeout: 0, // No timeout - keep listening indefinitely
        requiresOnDeviceRecognition: false,
        addsPunctuation: false,
        contextualStrings: ["ability", "open", "voice", "chat", "start", "recording"]
      };

      ExpoSpeechRecognitionModule.start(options);

      // Set up auto-restart mechanism in case recognition ends unexpectedly
      this.setupAutoRestart();
    } catch (error) {
      console.warn("Error starting voice recognition:", error.message || error);
      this.isListening = false;

      // Retry after a delay if enabled
      if (this.isEnabled) {
        setTimeout(() => {
          console.log("Retrying voice recognition after error...");
          this.startListening();
        }, 3000);
      }
    }
  }

  // Setup automatic restart mechanism
  setupAutoRestart() {
    // Clear any existing restart timer
    if (this.autoRestartTimer) {
      clearTimeout(this.autoRestartTimer);
    }

    // Set a timer to check if recognition is still active
    this.autoRestartTimer = setTimeout(() => {
      if (this.isEnabled && !this.isListening) {
        console.log("Auto-restarting voice recognition...");
        this.startListening();
      } else if (this.isEnabled && this.isListening) {
        // If still listening, set up another check
        this.setupAutoRestart();
      }
    }, 5000); // Check every 5 seconds
  }

  // Stop listening
  stopListening() {
    if (this.isListening) {
      try {
        console.log("Stopping voice recognition...");
        ExpoSpeechRecognitionModule.stop();
        this.isListening = false;

        // Clear auto-restart timer
        if (this.autoRestartTimer) {
          clearTimeout(this.autoRestartTimer);
          this.autoRestartTimer = null;
        }

        // Clear any pending timeouts and reset all states
        if (this.interimCommandTimeout) {
          clearTimeout(this.interimCommandTimeout);
          this.interimCommandTimeout = null;
        }
        if (this.wakeWordTimeout) {
          clearTimeout(this.wakeWordTimeout);
          this.wakeWordTimeout = null;
        }
        this.isWakeWordDetected = false;
        this.isExecutingCommand = false;
      } catch (error) {
        console.error("Error stopping voice recognition:", error);
        this.isListening = false;
        this.isWakeWordDetected = false;
        this.isExecutingCommand = false;
      }
    }
  }

  // Process interim command with wake word detection
  processInterimCommand(transcript) {
    const command = transcript.toLowerCase().trim();

    // Prevent processing if already executing a command
    if (this.isExecutingCommand) {
      console.log("Command already executing, ignoring:", command);
      return;
    }

    // Prevent command processing if in voice input mode (for chat)
    if (this.isVoiceInputMode) {
      console.log("In voice input mode, ignoring command processing for:", command);
      // However, we should pass this to processVoiceInput if it's coming from the same listener
      // (This depends on implementation, but safer to just return here as processVoiceInput handles it)
      this.processVoiceInput(transcript);
      return;
    }

    // First check if wake word "ability" is detected
    if (!this.isWakeWordDetected && command.includes('ability')) {
      console.log("Wake word 'ability' detected, now listening for command...");
      this.isWakeWordDetected = true;

      // Clear any existing wake word timeout
      if (this.wakeWordTimeout) {
        clearTimeout(this.wakeWordTimeout);
      }

      // Set timeout to reset wake word detection if no command follows
      this.wakeWordTimeout = setTimeout(() => {
        console.log("No command after wake word, resetting...");
        this.isWakeWordDetected = false;
      }, 5000); // 5 seconds to say command after "ability"

      return; // Don't process yet, wait for the actual command
    }

    // If wake word not detected, we still process potential commands
    // to give feedback like "I didn't understand" if needed.

    // Only process if wake word was detected OR it's a valid direct command
    // (We skipped the ability check here to allow direct commands)

    // Check for duplicate command within cooldown period
    const currentTime = Date.now();
    if (command === this.lastExecutedCommand &&
      currentTime - this.lastCommandTime < this.commandCooldown) {
      console.log("Duplicate command within cooldown, ignoring:", command);
      return;
    }

    // Store the interim command
    this.lastInterimCommand = command;

    // Check for trigger keywords that should execute immediately
    const triggerKeywords = ['open', 'start', 'go', 'logout', 'help', 'show', 'guide'];
    const hasKeyword = triggerKeywords.some(keyword => command.includes(keyword));

    if (hasKeyword && this.isValidCommand(command)) {
      // Execute immediately if it's a known valid command with a keyword
      // e.g. "open home" -> executes now
      // "open..." -> falls through to timeout wait

      // Clear any existing timeouts
      if (this.interimCommandTimeout) {
        clearTimeout(this.interimCommandTimeout);
        this.interimCommandTimeout = null;
      }
      if (this.wakeWordTimeout) {
        clearTimeout(this.wakeWordTimeout);
        this.wakeWordTimeout = null;
      }

      // Reset wake word detection and set execution lock
      this.isWakeWordDetected = false;
      this.isExecutingCommand = true;
      this.lastExecutedCommand = command;
      this.lastCommandTime = currentTime;

      // Execute immediately when keyword is detected
      console.log("Keyword detected, executing immediately:", command);
      this.processVoiceCommand(command);
      return;
    }

    // Clear existing timeout for non-keyword commands
    if (this.interimCommandTimeout) {
      clearTimeout(this.interimCommandTimeout);
      this.interimCommandTimeout = null;
    }

    // Set a timeout for commands without keywords (like just "ability")
    this.interimCommandTimeout = setTimeout(() => {
      if (this.lastInterimCommand && !this.isExecutingCommand) {
        console.log("Processing interim command after timeout:", this.lastInterimCommand);
        this.isExecutingCommand = true;
        this.lastExecutedCommand = this.lastInterimCommand;
        this.lastCommandTime = Date.now();
        this.processVoiceCommand(this.lastInterimCommand);
        this.lastInterimCommand = '';
        this.interimCommandTimeout = null;
        this.isWakeWordDetected = false; // Reset wake word detection
      }
    }, 1000); // Wait 2 seconds for more speech if no keyword detected
  }

  // Validate if the command makes sense
  isValidCommand(command) {
    const validPatterns = [
      // Home commands
      /((ability\s*)?)(home\s*page\s*open|open\s*home\s*page|open\s*home|home\s*open)/,
      // Setting commands
      /((ability\s*)?)(setting\s*page\s*open|open\s*setting\s*page|open\s*setting|setting\s*open)/,
      // Voice commands
      /((ability\s*)?)(voice\s*page\s*open|open\s*voice\s*page|open\s*voice|voice\s*open)/,
      // Text commands
      /((ability\s*)?)(text\s*page\s*open|open\s*text\s*page|open\s*text|text\s*open)/,

      // Voice recording commands (keep as they are essential for functionality)
      /((ability\s*)?)(start\s*input|record)/,

      // Other commands
      /((ability\s*)?)(logout|show\s*help|guide\s*me)/
    ];

    return validPatterns.some(pattern => pattern.test(command));
  }

  // Reset wake word state
  resetWakeWordState() {
    this.isWakeWordDetected = false;
    if (this.wakeWordTimeout) {
      clearTimeout(this.wakeWordTimeout);
      this.wakeWordTimeout = null;
    }
    if (this.interimCommandTimeout) {
      clearTimeout(this.interimCommandTimeout);
      this.interimCommandTimeout = null;
    }
  }

  // Process voice command
  processVoiceCommand(transcript) {
    try {
      // Prevent command processing if in voice input mode
      if (this.isVoiceInputMode) {
        console.log("In voice input mode, ignoring command processing for:", transcript);
        this.processVoiceInput(transcript);
        return;
      }

      // Clear any pending interim command processing and wake word timeouts
      if (this.wakeWordTimeout) {
        clearTimeout(this.wakeWordTimeout);
        this.wakeWordTimeout = null;
      }

      // Reset wake word detection
      this.isWakeWordDetected = false;

      const command = transcript.toLowerCase().trim();
      console.log("Voice command received:", command);

      // Check if command starts with activation phrase (Optional now)
      // if (!command.includes('ability')) { ... }

      // Extract the actual command after activation phrase if present
      let actualCommand = command;
      if (command.includes('ability')) {
        actualCommand = command.split('ability')[1]?.trim() || '';
        // If empty after split (just "ability"), don't process yet
        if (!actualCommand) actualCommand = command;
      }

      if (!actualCommand) {
        this.speak("Yes, I'm listening. What would you like to do?");
        return;
      }

      // Add a small delay to ensure we have the complete command
      // and stop listening to prevent processing multiple partial results
      this.stopListening();

      setTimeout(() => {
        this.executeCommand(actualCommand);
      }, 500);
    } catch (error) {
      console.error("Error processing voice command:", error);
      // Reset wake word detection on error
      this.isWakeWordDetected = false;
      // Restart listening on error
      setTimeout(() => {
        if (this.isEnabled) {
          this.startListening();
        }
      }, 2000);
    }
  }

  // Execute the actual command (separated from processVoiceCommand)
  executeCommand(actualCommand) {
    try {
      // Process navigation commands with flexible word order
      // Process navigation commands based on requested list
      if (actualCommand.includes('voice') && actualCommand.includes('open')) {
        this.router?.push('/chat?mode=voice');
      } else if (actualCommand.includes('text') && actualCommand.includes('open')) {
        this.router?.push('/chat?mode=text');
      } else if (actualCommand.includes('setting') && actualCommand.includes('open')) {
        this.router?.push('/profile');
      } else if (actualCommand.includes('home') && actualCommand.includes('open')) {
        this.router?.push('/welcome');
      } else if (actualCommand.includes('logout') || actualCommand.includes('sign out')) {
        if (this.logoutCallback) {
          this.logoutCallback();
        }
      } else if (actualCommand.includes('show help') || actualCommand.includes('guide me')) {
        this.announceCommands();
      }
      // Voice recording commands (only work in voice chat when voice navigation is enabled)
      else if (this.currentPage === 'voice-chat') {
        if (actualCommand.includes('start') && actualCommand.includes('input')) {
          // Start voice input mode for chat
          // Note: This command only works when voice navigation is enabled
          // When disabled, users should use the manual recording button instead
          this.startVoiceInputMode();
        } else {
          // Only show error message if cooldown period has passed
          this.showErrorWithCooldown("I didn't understand. Try again.");
        }
      } else {
        // Only show error message if cooldown period has passed
        this.showErrorWithCooldown("I didn't understand. Try again.");
      }

      // Release execution lock and restart listening after processing command
      setTimeout(() => {
        this.isExecutingCommand = false;
        if (this.isEnabled) {
          this.startListening();
        }
      }, 2000);
    } catch (error) {
      console.error("Error executing command:", error);
      // Reset all states on error
      this.isWakeWordDetected = false;
      this.isExecutingCommand = false;
      // Restart listening on error
      setTimeout(() => {
        if (this.isEnabled) {
          this.startListening();
        }
      }, 2000);
    }
  }

  // Show error message with cooldown to prevent spam
  showErrorWithCooldown(message) {
    const currentTime = Date.now();
    if (currentTime - this.lastErrorTime > this.errorCooldown) {
      this.speak(message);
      this.lastErrorTime = currentTime;
      console.log("Error message shown:", message);
    } else {
      console.log("Error message suppressed due to cooldown");
    }
  }

  // Start voice input mode for chat messages
  startVoiceInputMode() {
    console.log("Starting voice input mode for chat...");
    this.isVoiceInputMode = true;
    this.voiceInputText = '';
    this.stopListening(); // Stop command listening

    console.log("Voice input mode activated, about to say 'Speak'");

    // Say "Speak" to prompt user
    this.speak("Speak");

    // Start listening specifically for chat input after saying "Speak"
    setTimeout(() => {
      console.log("Starting voice input listening after 'Speak' delay...");
      this.startVoiceInputListening();
    }, 1500); // Wait for "Speak" to finish
  }

  // Start listening for voice input (chat messages)
  async startVoiceInputListening() {
    try {
      console.log("Starting voice input listening...");

      const options = {
        lang: "en-US",
        interimResults: true,
        continuous: true,
        maxAlternatives: 1,
        timeout: 0, // No timeout for voice input
        requiresOnDeviceRecognition: false,
        addsPunctuation: true
      };

      ExpoSpeechRecognitionModule.start(options);
      this.isListening = true; // Mark as listening for voice input
      console.log("Voice input listening started successfully");
    } catch (error) {
      console.warn("Error starting voice input listening:", error.message || error);
      this.isVoiceInputMode = false;
      this.isListening = false;
      // Restart normal command listening after a delay
      setTimeout(() => {
        if (this.isEnabled) {
          console.log("Restarting normal voice recognition after voice input error...");
          this.startListening();
        }
      }, 2000);
    }
  }

  // Process voice input for chat
  processVoiceInput(transcript) {
    if (!this.isVoiceInputMode) return;

    this.voiceInputText = transcript;
    console.log("Voice input received:", transcript);

    // Clear existing timeout
    if (this.voiceInputTimeout) {
      clearTimeout(this.voiceInputTimeout);
    }

    // Set timeout to send message when voice stops
    this.voiceInputTimeout = setTimeout(() => {
      this.sendVoiceInput();
    }, 2000); // Send after 2 seconds of silence
  }

  // Send the voice input as chat message
  sendVoiceInput() {
    if (this.voiceInputText.trim() && this.onSendMessage) {
      console.log("Sending voice input:", this.voiceInputText);

      // Stop voice navigation while AI is responding
      this.stopListening();

      this.onSendMessage(this.voiceInputText.trim());

      // Reset voice input mode
      this.isVoiceInputMode = false;
      this.voiceInputText = '';

      // Clear timeout
      if (this.voiceInputTimeout) {
        clearTimeout(this.voiceInputTimeout);
        this.voiceInputTimeout = null;
      }

      // Don't restart listening here - let the AI response complete first
      // The chat service will restart listening after AI speech is done
    } else {
      console.log("No voice input to send, restarting command listening");
      this.isVoiceInputMode = false;
      this.voiceInputText = '';

      // Restart normal command listening
      setTimeout(() => {
        if (this.isEnabled) {
          this.startListening();
        }
      }, 1000);
    }
  }

  // Announce available commands
  announceCommands() {
    let commands = `
      Available voice commands:
      Say "Open home".
      Say "Open setting".
      Say "Open voice".
      Say "Open text".
    `;

    // Add voice recording commands if in voice chat
    if (this.currentPage === 'voice-chat') {
      commands += `
      Say "start input".
      `;
    }

    commands += `Say "show help" or "guide me" to hear these commands again.`;

    this.speak(commands);
  }

  // Text-to-speech (only if voice navigation is enabled)
  async speak(text) {
    if (!this.isEnabled) {
      console.log("Voice disabled, not speaking:", text);
      return;
    }

    return this.speakForced(text);
  }

  // Force text-to-speech regardless of enabled state (for system messages)
  async speakForced(text) {
    try {
      // Always stop any current speech before starting new one
      await Speech.stop();
      this.currentSpeech = true;

      await Speech.speak(text, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.8,
        onDone: () => {
          this.currentSpeech = null;
        },
        onStopped: () => {
          this.currentSpeech = null;
        },
        onError: (error) => {
          console.error("Speech error:", error);
          this.currentSpeech = null;
        }
      });
    } catch (error) {
      console.error('Speech error:', error);
    }
  }

  // Check if voice navigation is enabled and listening
  isActivelyListening() {
    return this.isEnabled && this.isListening;
  }

  // Get current status for debugging
  getStatus() {
    return {
      isEnabled: this.isEnabled,
      isListening: this.isListening,
      currentPage: this.currentPage
    };
  }
}

// Create singleton instance
export const voiceNavigationService = new VoiceNavigationService();