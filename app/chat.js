import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
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
import { ChatBubble } from '../src/components/ChatBubble';
import { TextInputBox } from '../src/components/TextInputBox';
import { VoiceRecorder } from '../src/components/VoiceRecorder';
import { useAuth } from '../src/hooks/useAuth';
import { chatService } from '../src/services/chatService';
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
  const scrollViewRef = useRef(null);

  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = chatService.getChats(user.uid, (msgs) => {
        setMessages(msgs);
        setLoading(false);
        
        // Get active chat ID
        getActiveChatId();
      });
      return unsubscribe;
    }
  }, [user?.uid]);

  useEffect(() => {
    // Create new chat when component mounts (when coming from welcome page)
    if (user?.uid && !loading) {
      handleAutoNewChat();
    }

    // Cleanup function: Remove "New Chat" entries when component unmounts
    return () => {
      if (user?.uid) {
        handleCleanupNewChats();
      }
      
      // Stop any ongoing speech when leaving the screen
      chatService.stopSpeech();
    };
  }, [user?.uid, loading]);


  const handleCleanupNewChats = async () => {
    if (user?.uid) {
      try {
        // Get current chat history
        const history = await chatService.getChatHistory(user.uid);
        
        // Find all chats with title "New Chat"
        const newChatEntries = history.filter(chat => chat.title === 'New Chat');
        
        // Delete each "New Chat" entry
        for (const chat of newChatEntries) {
          await chatService.deleteChat(user.uid, chat.chatId);
          console.log("Removed 'New Chat' from history:", chat.chatId);
        }
      } catch (error) {
        console.error("Error cleaning up 'New Chat' entries:", error);
      }
    }
  };

  const handleAutoNewChat = async () => {
    if (user?.uid) {
      try {
        // Check if current chat has messages
        if (messages.length > 0) {
          // If current chat has messages, create a new empty chat
          const newChatId = await chatService.createNewChat(user.uid);
          setActiveChatId(newChatId);
          loadChatHistory();
        }
        // If current chat is already empty, do nothing (keep the empty chat)
      } catch (error) {
        console.error("Error creating auto new chat:", error);
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
      try {
        await chatService.sendMessage(user.uid, text, messageType);
        loadChatHistory(); // Refresh sidebar history
      } catch (error) {
        console.error("Error sending message:", error);
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
      
      try {
        await chatService.switchToChat(user.uid, chatId);
        setActiveChatId(chatId); // Update active chat ID
        setSidebarVisible(false); // Close sidebar
      } catch (error) {
        console.error('Error switching to chat:', error);
      }
    }
  };

  const handleChatDelete = async (chatId) => {
    if (user?.uid) {
      try {
        await chatService.deleteChat(user.uid, chatId);
        loadChatHistory(); // Refresh sidebar history
      } catch (error) {
        console.error('Error deleting chat:', error);
      }
    }
  };

  const handleClearHistory = async () => {
    if (user?.uid) {
      try {
        await chatService.clearAllChats(user.uid);
        setChatHistory([]);
        setSidebarVisible(false);
      } catch (error) {
        console.error('Error clearing chat history:', error);
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
          style={styles.deleteChatButton}
          onPress={() => handleChatDelete(item.chatId)}
        >
          <Text style={styles.deleteChatText}>×</Text>
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
      <View style={styles.container}>
        <View style={styles.statusBarSpacer} />
        <View style={styles.header}>
          <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {mode === 'voice' ? '🎙️ Voice Chat' : '💬 Text Chat'}
          </Text>
          <TouchableOpacity onPress={handleNewChat} style={styles.newChatButton}>
            <Text style={styles.newChatText}>+</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Status bar spacer */}
        <View style={styles.statusBarSpacer} />
        
        {/* Main Chat Interface */}
        <View style={styles.header}>
          <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {mode === 'voice' ? '🎙️ Voice Chat' : '💬 Text Chat'}
          </Text>
          <TouchableOpacity onPress={handleNewChat} style={styles.newChatButton}>
            <Text style={styles.newChatText}>+</Text>
          </TouchableOpacity>
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

        {mode === 'text' ? (
          <TextInputBox onSend={handleSend} />
        ) : (
          <VoiceRecorder onSend={(text) => handleSend(text, 'voice')} />
        )}
      </KeyboardAvoidingView>

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
                  <Text style={styles.closeButtonText}>×</Text>
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
                  <TouchableOpacity
                    style={styles.clearHistoryButton}
                    onPress={handleClearHistory}
                  >
                    <Text style={styles.clearHistoryText}>Clear All History</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0F172A', // Dark slate background
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(55, 66, 83, 0.95)', // Semi-transparent dark
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 102, 241, 0.2)',
    ...Shadows.lg,
  },
  menuButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  menuIcon: {
    fontSize: Typography.fontSize.xl,
    color: '#A78BFA', // Light purple
    fontWeight: Typography.fontWeight.bold,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: '#F8FAFC', // Light text
  },
  newChatButton: {
    backgroundColor: '#6366F1', // Purple gradient
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
    borderWidth: 2,
    borderColor: 'rgba(242, 242, 242, 0.3)',
  },
  newChatText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
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
    paddingTop: Spacing.lg, // Minimal top padding
    backgroundColor: '#0F172A',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: '#F8FAFC',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: Typography.fontSize.lg,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
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
    backgroundColor: 'rgba(51, 65, 85, 0.6)',
    marginVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 2,
    borderLeftColor: '#6366F1',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    ...Shadows.sm,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sidebarChatItemActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.3)', // Highlighted background for active chat
    borderColor: 'rgba(99, 102, 241, 0.6)',
    borderLeftColor: '#A78BFA',
    borderLeftWidth: 3,
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
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  clearHistoryText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semiBold,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  deleteChatText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    lineHeight: Typography.fontSize.base,
  },
});