import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSpeechRecognitionEvent } from "expo-speech-recognition";
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../src/components/Button';
import { ChatBubble } from '../src/components/ChatBubble';
import LoadingScreen from '../src/components/LoadingScreen';
import { TextInputBox } from '../src/components/TextInputBox';
import { VoiceRecorder } from '../src/components/VoiceRecorder';
import { useAuth } from '../src/hooks/useAuth';
import { chatService } from '../src/services/chatService';
import { voiceNavigationService } from '../src/services/voiceNavigationService';
import {
  BorderRadius,
  Colors,
  Shadows,
  Spacing,
  Typography,
} from '../src/styles/designSystem';

const { width } = Dimensions.get('window');

export default function ChatScreen() {
  const { user } = useAuth();
  // Remove unconditional useKeepAwake()
  const router = useRouter();
  const { mode = 'text' } = useLocalSearchParams();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [sidebarAnimation] = useState(new Animated.Value(-width * 0.8));
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmptyChatMessage, setShowEmptyChatMessage] = useState(false);
  const [activeChatId, setActiveChatId] = useState(null);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [deletingChats, setDeletingChats] = useState(new Set());
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const scrollViewRef = useRef(null);
  const voiceRecorderRef = useRef(null);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  useEffect(() => {
    if (user?.uid) {
      // Wait for the new chat to be created before subscribing
      // This prevents flashing old messages for both voice and text modes
      if (!activeChatId) {
        setMessages([]);
        setLoading(false); // Stop loading spinner initially
        return;
      }

      const unsubscribe = chatService.getChats(user.uid, (msgs) => {
        setMessages(msgs);
        setLoading(false);

        // Get active chat ID
        getActiveChatId();
      });
      return unsubscribe;
    }
  }, [user?.uid, activeChatId, mode]);

  // Initialize voice navigation service for chat
  useEffect(() => {
    const initializeVoiceNavigation = async () => {
      const currentPage = mode === 'voice' ? 'voice-chat' : 'text-chat';

      // Initialize with message sending callback
      voiceNavigationService.initialize(
        router,
        voiceRecorderRef.current,
        currentPage,
        null, // no logout callback for chat
        (text) => handleSend(text, 'voice') // callback to send messages with voice type
      );

      // Set up chat service callbacks
      // IMPORTANT: We do NOT stop voice navigation when AI starts speaking
      // This allows the user to interrupt (barge-in) the AI
      chatService.setSpeechStartCallback(() => {
        console.log("AI speech starting, ensuring voice input is active for barge-in...");
        // Force start recording if not already (and if we are in voice mode)
        if (mode === 'voice' && voiceRecorderRef.current) {
          voiceRecorderRef.current.startRecording();
        }
      });

      // Set up callback to restart voice navigation after AI speech
      chatService.setSpeechCompleteCallback(() => {
        console.log("Speech complete callback triggered");
        // Check service state directly instead of React state to avoid sync issues
        if (voiceNavigationService.isEnabled) {
          console.log("AI speech completed, restarting voice navigation...");
          voiceNavigationService.startListening();
        } else {
          console.log("Voice navigation service not enabled:", {
            serviceEnabled: voiceNavigationService.isEnabled
          });
        }
      });

      // Load saved voice navigation state (will be enabled if user enabled it on welcome page)
      const { getVoiceNavigationState } = await import('../src/utils/voiceNavigationStorage');
      const savedState = await getVoiceNavigationState();
      console.log("Loading saved voice navigation state for chat:", savedState);

      voiceNavigationService.setSilentEnabled(savedState);

      // Only start listening if voice navigation is enabled
      if (savedState) {
        // Auto-start listening with longer delay for chat pages
        setTimeout(() => {
          console.log("Starting voice recognition on chat page...");
          voiceNavigationService.startListening();
        }, 2500);

        // Announce that chat is open
        voiceNavigationService.announcePage(currentPage);
      } else {
        console.log("Voice navigation disabled, not starting listening");
      }
    };

    initializeVoiceNavigation();

    // Cleanup function to stop listening when leaving the page
    return () => {
      console.log("Leaving chat page, stopping voice recognition");
      voiceNavigationService.stopListening();
      // Clear the speech callbacks
      chatService.setSpeechCompleteCallback(null);
      chatService.setSpeechStartCallback(null);
    };
  }, [router, mode]);

  // Stop speech when navigating away
  useEffect(() => {
    return () => {
      // Stop any ongoing speech when leaving the screen
      if (voiceNavigationService.currentSpeech) {
        voiceNavigationService.currentSpeech.stop();
      }
    };
  }, []);

  // Setup voice recognition event listeners
  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results[0]?.transcript || "";
    const isFinal = event.results[0]?.isFinal || false;

    console.log("Voice recognition result:", transcript, "Final:", isFinal);

    if (transcript.trim()) {
      // Check if in voice input mode for chat (priority over voice navigation state)
      if (voiceNavigationService.isVoiceInputMode) {
        console.log("Processing voice input:", transcript);
        voiceNavigationService.processVoiceInput(transcript);
      } else if (voiceNavigationService.isEnabled) {
        // Normal command processing only if service is enabled
        if (isFinal) {
          // Process immediately if final
          voiceNavigationService.processVoiceCommand(transcript);
        } else {
          // For interim results, use debounced processing
          voiceNavigationService.processInterimCommand(transcript);
        }
      } else {
        console.log("Voice disabled, ignoring command:", transcript);
      }
    }
  });

  useSpeechRecognitionEvent("end", () => {
    // Handle end differently based on mode
    if (voiceNavigationService.isVoiceInputMode) {
      console.log("Voice input ended, processing message...");
      // Don't restart listening - let voice input mode handle it
    } else {
      console.log("Voice recognition ended");
      // Mark as not listening and let auto-restart handle it
      if (voiceNavigationService.isListening) {
        voiceNavigationService.isListening = false;
      }
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    // Handle different types of errors gracefully
    if (event.error === "no-speech") {
      // Don't restart for no-speech, just log it
      console.log("No speech detected, continuing to listen...");
      // Don't restart - let it continue listening
    } else if (event.error === "aborted") {
      // User cancelled, restart if enabled
      console.log("Speech recognition aborted");
      if (voiceNavigationService.isEnabled) {
        setTimeout(() => {
          voiceNavigationService.startListening();
        }, 2000);
      }
    } else if (event.error === "network") {
      // Network error - handle gracefully without showing error to user
      console.warn("Network error during speech recognition - this is normal and will retry automatically");
      if (voiceNavigationService.isEnabled) {
        // Retry after a longer delay for network issues
        setTimeout(() => {
          console.log("Retrying speech recognition after network error...");
          voiceNavigationService.startListening();
        }, 5000); // 5 second delay for network issues
      }
    } else {
      // Log other errors but still restart - don't show error to user
      console.warn("Speech recognition error:", event.error, event.message || "Unknown error");
      if (voiceNavigationService.isEnabled) {
        setTimeout(() => {
          console.log("Restarting after error...");
          voiceNavigationService.startListening();
        }, 3000);
      }
    }
  });

  // Stop speech when navigating away - Cleanup only
  useEffect(() => {
    return () => {
      chatService.stopSpeech();
    };
  }, []);

  // Initialize chat when user loads
  useEffect(() => {
    if (user?.uid) {
      initializeChat();
    }
  }, [user?.uid]);


  const initializeChat = async () => {
    if (user?.uid) {
      try {
        // Always force create a new chat when entering the screen (voice or text)
        const newChatId = await chatService.createNewChat(user.uid);
        setActiveChatId(newChatId);

        loadChatHistory();
      } catch (error) {
        console.error("Error initializing chat:", error);
      }
    }
  };

  const getActiveChatId = async () => {
    if (user?.uid) {
      try {
        const activeChat = await chatService.getActiveChat(user.uid);
        if (activeChat) {
          setActiveChatId(activeChat.chatId);
        }
      } catch (error) {
        console.error('Error getting active chat ID:', error);
      }
    }
  };

  useEffect(() => {
    loadChatHistory();
  }, [user?.uid]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const loadChatHistory = async () => {
    if (user?.uid) {
      try {
        const history = await chatService.getChatHistory(user.uid);
        setChatHistory(history);
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    }
  };

  const toggleSidebar = () => {
    const toValue = sidebarVisible ? -width * 0.8 : 0;

    // Load chat history when opening sidebar
    if (!sidebarVisible) {
      loadChatHistory();
    } else {
      // Clear search when closing sidebar
      setSearchQuery('');
    }

    Animated.timing(sidebarAnimation, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setSidebarVisible(!sidebarVisible);
  };

  const handleSend = async (text, messageType = 'text') => {
    if (user?.uid && text.trim()) {
      setSendingMessage(true);
      try {
        await chatService.sendMessage(user.uid, text, messageType);
        loadChatHistory(); // Refresh sidebar history
      } catch (error) {
        console.error("Error sending message:", error);
      } finally {
        setSendingMessage(false);
      }
    }
  };

  const handleNewChat = async () => {
    if (user?.uid) {
      // Stop any ongoing speech when creating new chat
      chatService.stopSpeech();

      // Check if current chat is empty
      if (messages.length === 0) {
        // Show message that chat is already empty
        setShowEmptyChatMessage(true);
        setTimeout(() => setShowEmptyChatMessage(false), 3000); // Hide after 3 seconds
        return;
      }

      try {
        const newChatId = await chatService.createNewChat(user.uid);
        setActiveChatId(newChatId); // Update active chat ID
        loadChatHistory(); // Refresh sidebar history
        setSidebarVisible(false); // Close sidebar
      } catch (error) {
        console.error("Error creating new chat:", error);
      }
    }
  };

  const handleChatSelect = async (chatId) => {
    if (user?.uid) {
      // Stop any ongoing speech when switching to different chat
      chatService.stopSpeech();

      setLoading(true); // Show loading screen
      setSidebarVisible(false); // Close sidebar

      try {
        await chatService.switchToChat(user.uid, chatId);
        setActiveChatId(chatId); // Update active chat ID
        // Loading will be set to false by the useEffect listener when messages are received
      } catch (error) {
        console.error('Error switching to chat:', error);
        setLoading(false); // Ensure loading stops on error
      }
    }
  };

  const handleChatDelete = async (chatId) => {
    if (user?.uid) {
      // Add chatId to deleting set
      setDeletingChats(prev => new Set([...prev, chatId]));

      try {
        await chatService.deleteChat(user.uid, chatId);
        loadChatHistory(); // Refresh sidebar history
      } catch (error) {
        console.error('Error deleting chat:', error);
      } finally {
        // Remove chatId from deleting set
        setDeletingChats(prev => {
          const newSet = new Set(prev);
          newSet.delete(chatId);
          return newSet;
        });
      }
    }
  };

  const handleClearHistory = async () => {
    if (user?.uid) {
      setClearingHistory(true);
      try {
        await chatService.clearAllChats(user.uid);
        setChatHistory([]);
        setSidebarVisible(false);
      } catch (error) {
        console.error('Error clearing chat history:', error);
      } finally {
        setClearingHistory(false);
      }
    }
  };

  const formatDate = (timestamp) => {
    // Convert to Pakistani time (PKT - UTC+5)
    const date = new Date(timestamp);
    const pakistaniTime = new Date(date.getTime() + (5 * 60 * 60 * 1000)); // Add 5 hours for PKT
    const now = new Date();
    const pakistaniNow = new Date(now.getTime() + (5 * 60 * 60 * 1000)); // Current time in PKT

    // Calculate difference in Pakistani time
    const diffTime = Math.abs(pakistaniNow - pakistaniTime);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Check if it's the same day in Pakistani time
    const isSameDay = pakistaniTime.toDateString() === pakistaniNow.toDateString();
    const isYesterday = diffDays === 1 ||
      (pakistaniNow.getDate() - pakistaniTime.getDate() === 1 &&
        pakistaniNow.getMonth() === pakistaniTime.getMonth() &&
        pakistaniNow.getFullYear() === pakistaniTime.getFullYear());

    if (isSameDay) return 'Today';
    if (isYesterday) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;

    // For older dates, show the actual date in Pakistani format
    return pakistaniTime.toLocaleDateString('en-PK', {
      timeZone: 'Asia/Karachi',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const filteredChatHistory = chatHistory.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (chat.summary && chat.summary.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderChatItem = ({ item }) => {
    const isActive = item.chatId === activeChatId;

    return (
      <View style={[
        styles.sidebarChatItem,
        isActive && styles.sidebarChatItemActive
      ]}>
        <TouchableOpacity
          style={styles.sidebarChatContent}
          onPress={() => handleChatSelect(item.chatId)}
        >
          <Text style={[
            styles.sidebarChatTitle,
            isActive && styles.sidebarChatTitleActive
          ]} numberOfLines={1}>
            {item.title || 'Untitled Chat'}
          </Text>
          <Text style={[
            styles.sidebarChatDate,
            isActive && styles.sidebarChatDateActive
          ]}>
            {formatDate(item.updatedAt)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.deleteChatButton,
            deletingChats.has(item.chatId) && styles.deleteChatButtonLoading
          ]}
          onPress={() => handleChatDelete(item.chatId)}
          disabled={deletingChats.has(item.chatId)}
        >
          {deletingChats.has(item.chatId) ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="close" size={18} color="#EF4444" />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderMessage = ({ item }) => (
    <ChatBubble message={item} currentUserId={user?.uid} />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>
        {mode === 'voice' ? '🎙️' : '💬'}
      </Text>
      <Text style={styles.emptyTitle}>Start a Conversation</Text>
      <Text style={styles.emptySubtitle}>
        {mode === 'text'
          ? 'Type a message below to begin chatting with your AI assistant'
          : 'Tap the microphone to start speaking with your AI assistant'
        }
      </Text>
    </View>
  );

  if (loading) {
    return (
      <LoadingScreen
        message="Loading chat..."
        size={70}
        color="#6366F1"
        backgroundColor="#0F172A"
        textColor="#94A3B8"
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        enabled={true}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 35 : 35}
      >
        <View style={styles.container}>
          {/* Safe area for status bar */}
          <SafeAreaView
            edges={Platform.OS === 'ios' ? ['top'] : []}
            style={styles.safeAreaTop}
          />

          {/* Main Chat Interface */}
          <View style={styles.header}>
            <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
              <Ionicons name="menu" size={28} color="#A78BFA" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {mode === 'voice' ? '🎙️ Voice Chat' : '💬 Text Chat'}
            </Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity onPress={handleNewChat} style={styles.newChatButton}>
                <Ionicons name="add" size={24} color="#38BDF8" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Empty Chat Message */}
          {showEmptyChatMessage && (
            <View style={styles.emptyChatMessageContainer}>
              <Text style={styles.emptyChatMessageText}>
                Chat is already empty. Start typing to begin a conversation.
              </Text>
            </View>
          )}

          {messages.length === 0 ? (
            renderEmptyState()
          ) : (
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesScrollView}
              contentContainerStyle={styles.messagesScrollContent}
              showsVerticalScrollIndicator={true}
              indicatorStyle="white"
              scrollIndicatorInsets={{ right: 1 }}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.map((message) => (
                <ChatBubble key={message.id} message={message} currentUserId={user?.uid} />
              ))}
            </ScrollView>
          )}

          <SafeAreaView
            edges={['bottom']}
            style={styles.inputSafeArea}
          >
            <View style={styles.inputContainer}>
              {mode === 'text' ? (
                <TextInputBox onSend={handleSend} loading={sendingMessage} />
              ) : (
                <VoiceRecorder
                  ref={voiceRecorderRef}
                  onSend={(text) => handleSend(text, 'voice')}
                  loading={sendingMessage}
                />
              )}
            </View>
          </SafeAreaView>
        </View>

        {/* Sidebar Modal */}
        <Modal
          visible={sidebarVisible}
          transparent={true}
          animationType="none"
          onRequestClose={toggleSidebar}
        >
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={toggleSidebar}
          >
            <Animated.View
              style={[
                styles.sidebar,
                { transform: [{ translateX: sidebarAnimation }] }
              ]}
            >
              <TouchableOpacity activeOpacity={1} style={styles.sidebarContent}>
                <View style={styles.sidebarHeader}>
                  <Text style={styles.sidebarTitle}>Chat History</Text>
                  <TouchableOpacity onPress={toggleSidebar} style={styles.closeButton}>
                    <Ionicons name="close" size={20} color="#F87171" />
                  </TouchableOpacity>
                </View>

                <View style={styles.searchContainer}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search chats..."
                    placeholderTextColor={Colors.gray500}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.sidebarBody}>
                  {filteredChatHistory.length === 0 ? (
                    <View style={styles.sidebarEmptyState}>
                      <Text style={styles.sidebarEmptyText}>
                        {searchQuery ? 'No chats found' : 'No chat history yet'}
                      </Text>
                      <Text style={styles.sidebarEmptySubtext}>
                        {searchQuery ? 'Try a different search term' : 'Start a conversation to see your chats here'}
                      </Text>
                    </View>
                  ) : (
                    <FlatList
                      data={filteredChatHistory}
                      renderItem={renderChatItem}
                      keyExtractor={(item) => item.chatId}
                      style={styles.sidebarChatList}
                      contentContainerStyle={styles.sidebarChatListContent}
                      showsVerticalScrollIndicator={false}
                    />
                  )}
                </View>

                {chatHistory.length > 0 && (
                  <View style={styles.sidebarFooter}>
                    <Button
                      title="Clear All History"
                      onPress={handleClearHistory}
                      loading={clearingHistory}
                      disabled={clearingHistory}
                      variant="outline"
                      size="sm"
                      style={styles.clearHistoryButton}
                      textStyle={styles.clearHistoryButtonText}
                    />
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </Modal>
      </KeyboardAvoidingView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Dark slate background
    paddingTop: Platform.OS === 'android' ? 0 : 20, // Android status bar compensation
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  safeAreaTop: {
    backgroundColor: 'transparent',
  },
  inputSafeArea: {
    backgroundColor: '#0F172A',
    paddingBottom: 0,
  },
  inputContainer: {
    // marginBottom removed
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 15,
    backgroundColor: '#374353',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 102, 241, 0.2)',
    minHeight: 60, // Increased height
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuButton: {
    padding: 8,
    borderRadius: BorderRadius.full,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    fontSize: 24,
    color: '#A78BFA',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: Math.min(20, width * 0.05), // Responsive font size
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },

  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  // Voice Navigation Button
  voiceButton: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  voiceButtonActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)', // Green background when active
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },

  voiceIcon: {
    fontSize: 16,
    color: '#94A3B8', // Muted color when inactive
  },

  voiceIconActive: {
    color: '#22C55E', // Green color when active
  },

  newChatButton: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)', // Light Blue tint
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  newChatText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: Typography.fontSize.xl,
    includeFontPadding: false,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  loadingText: {
    fontSize: Typography.fontSize.lg,
    color: '#94A3B8', // Muted light text
  },

  messagesScrollView: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  messagesScrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  messagesWrapper: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  latestMessageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    backgroundColor: '#0F172A',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl, // Increased top padding
    backgroundColor: '#0F172A',
    justifyContent: 'center', // Center vertically as well
    paddingBottom: 100, // Offset for input area
  },
  emptyIcon: {
    fontSize: Math.min(80, width * 0.2), // Responsive icon size
    marginBottom: Spacing.lg,
    textShadowColor: 'rgba(99, 102, 241, 0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  emptyTitle: {
    fontSize: Math.min(28, width * 0.07), // Responsive title
    fontWeight: Typography.fontWeight.bold,
    color: '#F8FAFC',
    marginBottom: Spacing.sm,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  emptySubtitle: {
    fontSize: Math.min(16, width * 0.045), // Responsive subtitle
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: '80%',
  },
  // Sidebar Styles
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Darker overlay
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 50, // Add top margin to avoid notification area
    bottom: 0,
    width: width * 0.85,
    backgroundColor: 'rgba(30, 41, 59, 0.98)', // Dark sidebar
    ...Shadows.xl,
    borderRightWidth: 1,
    borderRightColor: 'rgba(99, 102, 241, 0.2)',
    paddingBottom: Platform.OS === 'android' ? 0 : 0, // Avoid gesture nav
  },
  sidebarContent: {
    flex: 1,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 102, 241, 0.2)',
    backgroundColor: 'rgba(51, 65, 85, 0.8)',
  },
  sidebarBody: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
  },
  sidebarFooter: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(99, 102, 241, 0.2)',
    backgroundColor: 'rgba(51, 65, 85, 0.8)',
  },
  searchContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 102, 241, 0.2)',
    backgroundColor: 'rgba(51, 65, 85, 0.6)',
  },
  searchInput: {
    backgroundColor: 'rgba(51, 65, 85, 0.8)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.fontSize.sm,
    color: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  sidebarTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: '#F8FAFC',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  closeButtonText: {
    fontSize: Typography.fontSize.lg,
    color: '#F87171',
    fontWeight: Typography.fontWeight.bold,
  },
  sidebarChatList: {
    flex: 1,
  },
  sidebarChatListContent: {
    padding: Spacing.md,
  },
  sidebarChatItem: {
    backgroundColor: 'rgba(51, 65, 85, 0.4)',
    marginVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent', // Default transparent
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: Spacing.xs,
  },
  sidebarChatItemActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)', // Subtle highlight
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderLeftColor: '#A78BFA', // Purple accent
  },
  sidebarChatContent: {
    flex: 1,
    padding: Spacing.sm,
  },
  sidebarChatTitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: '#F8FAFC',
    marginBottom: 2,
  },
  sidebarChatTitleActive: {
    color: '#FFFFFF',
    fontWeight: Typography.fontWeight.semiBold,
  },
  sidebarChatSummary: {
    fontSize: Typography.fontSize.sm,
    color: '#94A3B8',
    marginBottom: Spacing.xs,
    lineHeight: 18,
  },
  sidebarChatDate: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: Typography.fontWeight.normal,
  },
  sidebarChatDateActive: {
    color: '#CBD5E1',
    fontWeight: Typography.fontWeight.medium,
  },
  sidebarEmptyState: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  sidebarEmptyText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semiBold,
    color: '#F8FAFC',
    marginBottom: Spacing.xs,
  },
  sidebarEmptySubtext: {
    fontSize: Typography.fontSize.sm,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  clearHistoryButton: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(239, 68, 68, 0.6)',
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingVertical: 12,
  },
  clearHistoryButtonText: {
    color: '#EF4444',
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
  },
  // Empty Chat Message Styles
  emptyChatMessageContainer: {
    backgroundColor: 'rgba(251, 191, 36, 0.9)', // Amber background
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    ...Shadows.sm,
  },
  emptyChatMessageText: {
    color: '#92400E', // Dark amber text
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    textAlign: 'center',
  },
  // Delete Chat Button Styles
  deleteChatButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.xs,
    backgroundColor: 'rgba(239, 68, 68, 0.1)', // Subtle red background
  },
  deleteChatButtonLoading: {
    opacity: 0.7,
  },
  deleteChatText: {
    color: '#EF4444', // Red text
    fontSize: 20,
    fontWeight: '300', // Thinner cross
    lineHeight: 22,
    marginTop: -2, // Center visually
  },
});