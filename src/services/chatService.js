import AsyncStorage from "@react-native-async-storage/async-storage";

const CHAT_SESSIONS_KEY = "chat_sessions_";
const ACTIVE_CHAT_KEY = "active_chat_";
const MAX_HISTORY_ITEMS = 50;

// ChatGPT-style chat service with session management
export class ChatService {
  constructor() {
    this.listeners = new Map();
    this.currentChatId = null;
    this.currentSpeech = null; // Track current speech instance
  }

  // Create new chat session
  async createNewChat(userId) {
    try {
      const chatId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      const newChat = {
        chatId,
        userId,
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        title: null, // Will be generated after first meaningful message
        summary: null,
        isActive: true
      };

      // Save new chat session
      const sessionsKey = CHAT_SESSIONS_KEY + userId;
      const existingSessions = await AsyncStorage.getItem(sessionsKey);
      const sessions = existingSessions ? JSON.parse(existingSessions) : [];
      
      sessions.unshift(newChat); // Add to beginning
      await AsyncStorage.setItem(sessionsKey, JSON.stringify(sessions));
      
      // Set as active chat
      this.currentChatId = chatId;
      await AsyncStorage.setItem(ACTIVE_CHAT_KEY + userId, chatId);
      
      // Notify listeners with empty messages for new chat
      this.notifyListeners(userId, []);
      
      console.log("New chat created:", chatId);
      return chatId;
    } catch (error) {
      console.error("Error creating new chat:", error);
      throw error;
    }
  }

  // Get or create active chat
  async getActiveChat(userId) {
    try {
      const activeChatId = await AsyncStorage.getItem(ACTIVE_CHAT_KEY + userId);
      
      if (activeChatId) {
        const sessionsKey = CHAT_SESSIONS_KEY + userId;
        const sessions = await AsyncStorage.getItem(sessionsKey);
        const chatSessions = sessions ? JSON.parse(sessions) : [];
        
        const activeChat = chatSessions.find(chat => chat.chatId === activeChatId);
        if (activeChat) {
          this.currentChatId = activeChatId;
          return activeChat;
        }
      }
      
      // No active chat found, create new one
      const newChatId = await this.createNewChat(userId);
      return await this.getChatById(userId, newChatId);
    } catch (error) {
      console.error("Error getting active chat:", error);
      return null;
    }
  }

  // Get specific chat by ID
  async getChatById(userId, chatId) {
    try {
      const sessionsKey = CHAT_SESSIONS_KEY + userId;
      const sessions = await AsyncStorage.getItem(sessionsKey);
      const chatSessions = sessions ? JSON.parse(sessions) : [];
      
      return chatSessions.find(chat => chat.chatId === chatId) || null;
    } catch (error) {
      console.error("Error getting chat by ID:", error);
      return null;
    }
  }

  // Generate smart title after first meaningful message
  generateChatTitle(firstMessage) {
    const text = firstMessage.toLowerCase().trim();
    
    // Skip generic greetings for title generation
    const genericGreetings = ['hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening'];
    if (genericGreetings.some(greeting => text === greeting || text.startsWith(greeting + ' '))) {
      return null; // Don't generate title for generic greetings
    }

    // Extract key topics and generate concise titles
    const titlePatterns = [
      { keywords: ['react', 'native', 'expo', 'javascript', 'js'], title: 'React Native Help' },
      { keywords: ['python', 'django', 'flask'], title: 'Python Development' },
      { keywords: ['css', 'html', 'web', 'frontend'], title: 'Web Development' },
      { keywords: ['error', 'bug', 'fix', 'problem'], title: 'Troubleshooting Help' },
      { keywords: ['learn', 'tutorial', 'how to'], title: 'Learning Guide' },
      { keywords: ['design', 'ui', 'ux', 'interface'], title: 'Design Discussion' },
      { keywords: ['database', 'sql', 'mongodb'], title: 'Database Help' },
      { keywords: ['api', 'rest', 'graphql'], title: 'API Development' },
      { keywords: ['math', 'calculation', 'formula'], title: 'Math Help' },
      { keywords: ['health', 'medical', 'doctor'], title: 'Health Questions' },
    ];

    // Find matching pattern
    for (const pattern of titlePatterns) {
      if (pattern.keywords.some(keyword => text.includes(keyword))) {
        return pattern.title;
      }
    }

    // Generate title from first few words
    const words = text.split(' ').slice(0, 4);
    const title = words.map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    return title.length > 25 ? title.substring(0, 25) + '...' : title;
  }

  // Generate relevant prompt summary
  generatePromptSummary(userMessage) {
    const text = userMessage.trim();
    
    if (text.length <= 50) {
      return text;
    }
    
    // Create concise summary
    const summary = text.length > 80 ? text.substring(0, 80) + '...' : text;
    return summary;
  }
  // Send message to active chat
  async sendMessage(userId, text, messageType = 'text') {
    try {
      console.log("Sending message:", text, "for user:", userId);
      
      // Get or create active chat
      let activeChat = await this.getActiveChat(userId);
      if (!activeChat) {
        const newChatId = await this.createNewChat(userId);
        activeChat = await this.getChatById(userId, newChatId);
      }
      
      const timestamp = Date.now();
      
      // Add user message immediately
      const userMessage = {
        id: `user_${timestamp}`,
        text: text.trim(),
        userId,
        timestamp,
        role: 'user',
        type: messageType,
        status: 'sent',
      };
      
      activeChat.messages.push(userMessage);
      
      // Generate title and summary after first meaningful message
      if (!activeChat.title && activeChat.messages.length === 1) {
        const title = this.generateChatTitle(text);
        if (title) {
          activeChat.title = title;
          activeChat.summary = this.generatePromptSummary(text);
        }
      }
      
      // Save user message and notify listeners immediately
      await this.updateChatSession(userId, activeChat);
      this.notifyListeners(userId, activeChat.messages);
      
      // Add loading message for AI response
      const loadingMessage = {
        id: `ai_loading_${timestamp}`,
        text: "typing...",
        userId: 'ai',
        timestamp: timestamp + 100,
        role: 'assistant',
        type: 'loading',
        status: 'loading',
      };
      
      activeChat.messages.push(loadingMessage);
      await this.updateChatSession(userId, activeChat);
      this.notifyListeners(userId, activeChat.messages);
      
      // Generate AI response in background
      try {
        const aiResponseText = await this.generateResponse(text);
        
        // Remove loading message
        activeChat.messages = activeChat.messages.filter(msg => msg.id !== loadingMessage.id);
        
        // Add actual AI response
        const aiResponse = {
          id: `ai_${timestamp + 1}`,
          text: aiResponseText,
          userId: 'ai',
          timestamp: Date.now(),
          role: 'assistant',
          type: 'text',
          status: 'delivered',
        };
        
        activeChat.messages.push(aiResponse);
        activeChat.updatedAt = Date.now();
        
        // Save updated chat session
        await this.updateChatSession(userId, activeChat);
        
        // Notify listeners with final messages
        this.notifyListeners(userId, activeChat.messages);
        
        // If it's a voice message, speak the AI response
        if (messageType === 'voice') {
          // Stop any previous speech first
          try {
            if (this.currentSpeech) {
              this.currentSpeech.stop();
            }
          } catch (error) {
            console.log("No previous speech to stop");
          }
          
          // Import Speech here to avoid circular dependency
          const Speech = require('expo-speech');
          this.currentSpeech = Speech;
          
          Speech.speak(aiResponseText, {
            language: 'en',
            pitch: 1.0,
            rate: 0.8,
            onDone: () => {
              console.log("Speech completed");
              this.currentSpeech = null;
            },
            onStopped: () => {
              console.log("Speech stopped");
              this.currentSpeech = null;
            },
            onError: (error) => {
              console.error("Speech error:", error);
              this.currentSpeech = null;
            }
          });
        }
        
      } catch (error) {
        console.error("Error generating AI response:", error);
        
        // Remove loading message
        activeChat.messages = activeChat.messages.filter(msg => msg.id !== loadingMessage.id);
        
        // Add error message
        const errorMessage = {
          id: `ai_error_${timestamp}`,
          text: "Sorry, I'm having trouble responding right now. Please try again.",
          userId: 'ai',
          timestamp: Date.now(),
          role: 'assistant',
          type: 'error',
          status: 'error',
        };
        
        activeChat.messages.push(errorMessage);
        await this.updateChatSession(userId, activeChat);
        this.notifyListeners(userId, activeChat.messages);
      }
      
      console.log("Message processing completed");
      return activeChat.messages;
    } catch (err) {
      console.error("Error sending message:", err);
      throw err;
    }
  }

  // Update chat session in storage
  async updateChatSession(userId, updatedChat) {
    try {
      const sessionsKey = CHAT_SESSIONS_KEY + userId;
      const sessions = await AsyncStorage.getItem(sessionsKey);
      const chatSessions = sessions ? JSON.parse(sessions) : [];
      
      const index = chatSessions.findIndex(chat => chat.chatId === updatedChat.chatId);
      if (index !== -1) {
        chatSessions[index] = updatedChat;
        // Move updated chat to top
        const [updatedChatSession] = chatSessions.splice(index, 1);
        chatSessions.unshift(updatedChatSession);
      } else {
        chatSessions.unshift(updatedChat);
      }
      
      await AsyncStorage.setItem(sessionsKey, JSON.stringify(chatSessions));
    } catch (error) {
      console.error("Error updating chat session:", error);
    }
  }

  // Get messages for active chat with real-time updates
  getChats(userId, callback) {
    try {
      console.log("Setting up chat listener for user:", userId);
      
      const loadMessages = async () => {
        try {
          const activeChat = await this.getActiveChat(userId);
          const messages = activeChat ? activeChat.messages : [];
          console.log("Received messages:", messages.length);
          callback(messages);
        } catch (err) {
          console.error("Error loading messages:", err);
          callback([]);
        }
      };
      
      loadMessages();
      
      // Store listener for future notifications
      this.listeners.set(userId, callback);
      
      // Return unsubscribe function
      return () => {
        this.listeners.delete(userId);
        console.log("Unsubscribed from chat updates");
      };
    } catch (err) {
      console.error("Error setting up chat listener:", err);
      callback([]);
      return () => {};
    }
  }

  // Get chat history list for UI
  async getChatHistory(userId) {
    try {
      const sessionsKey = CHAT_SESSIONS_KEY + userId;
      const sessions = await AsyncStorage.getItem(sessionsKey);
      const chatSessions = sessions ? JSON.parse(sessions) : [];
      
      // Return only necessary data for history list
      return chatSessions.map(chat => ({
        chatId: chat.chatId,
        title: chat.title || 'New Chat',
        summary: chat.summary || 'Start a conversation...',
        updatedAt: chat.updatedAt,
        messageCount: chat.messages.length
      })).sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      console.error("Error getting chat history:", error);
      return [];
    }
  }

  // Switch to existing chat
  async switchToChat(userId, chatId) {
    try {
      const chat = await this.getChatById(userId, chatId);
      if (chat) {
        this.currentChatId = chatId;
        await AsyncStorage.setItem(ACTIVE_CHAT_KEY + userId, chatId);
        
        // Notify listeners with new chat messages
        this.notifyListeners(userId, chat.messages);
        return chat.messages;
      }
      return [];
    } catch (error) {
      console.error("Error switching to chat:", error);
      return [];
    }
  }

  // Stop any ongoing speech
  stopSpeech() {
    try {
      if (this.currentSpeech) {
        this.currentSpeech.stop();
        this.currentSpeech = null;
        console.log("Speech manually stopped");
      }
    } catch (error) {
      console.error("Error stopping speech:", error);
    }
  }

  // Clear all chat history
  async clearAllChats(userId) {
    try {
      const sessionsKey = CHAT_SESSIONS_KEY + userId;
      const activeChatKey = ACTIVE_CHAT_KEY + userId;
      
      await AsyncStorage.removeItem(sessionsKey);
      await AsyncStorage.removeItem(activeChatKey);
      
      this.currentChatId = null;
      
      // Notify listeners
      this.notifyListeners(userId, []);
      
      return true;
    } catch (error) {
      console.error("Error clearing all chats:", error);
      return false;
    }
  }

  // Notify all listeners for a user
  notifyListeners(userId, messages) {
    const callback = this.listeners.get(userId);
    if (callback) {
      callback(messages);
    }
  }

  // Delete specific chat session
  async deleteChat(userId, chatId) {
    try {
      const sessionsKey = CHAT_SESSIONS_KEY + userId;
      const sessions = await AsyncStorage.getItem(sessionsKey);
      const chatSessions = sessions ? JSON.parse(sessions) : [];
      
      const updatedSessions = chatSessions.filter(chat => chat.chatId !== chatId);
      await AsyncStorage.setItem(sessionsKey, JSON.stringify(updatedSessions));
      
      // If deleted chat was active, create new one
      if (this.currentChatId === chatId) {
        await this.createNewChat(userId);
      }
      
      return true;
    } catch (error) {
      console.error("Error deleting chat:", error);
      return false;
    }
  }

  // Enhanced AI response generation using multiple Gemini models with fallback
  async generateResponse(text) {
    const API_KEYS = [
      'AIzaSyBjkEJDmM_08gpalLDtFRvF1QrvKV5Spco',
    ];
    
    // Multiple models with fallback priority
    const MODELS = [
      'gemini-2.5-pro',           // Primary model
      'gemini-2.5-flash',           // Primary model
      'gemini-2.5-flash-lite',      // Fallback 1 (current)
      'gemini-3-flash-preview'      // Fallback 2 (experimental)
    ];
    
    const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
    
    // Try each model with each API key
    for (let modelIndex = 0; modelIndex < MODELS.length; modelIndex++) {
      const model = MODELS[modelIndex];
      console.log(`Trying model: ${model}`);
      
      for (let keyIndex = 0; keyIndex < API_KEYS.length; keyIndex++) {
        try {
          const API_URL = `${BASE_URL}/${model}:generateContent`;
          
          const response = await fetch(`${API_URL}?key=${API_KEYS[keyIndex]}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              system_instruction: {
                parts: [{
                  text: "You are a friendly, casual AI assistant. Respond naturally like you're having a normal conversation with a friend. Don't use any markdown formatting, headings, bullet points, or asterisks. Don't structure your responses with sections or categories. Just answer directly and naturally in plain text. Keep it simple, conversational, and helpful without being overly formal or professional. When you have access to real-time information through search, use it to provide current and accurate answers."
                }]
              },
              contents: [{
                parts: [{
                  text: text
                }]
              }],
              tools: [{
                googleSearchRetrieval: {
                  dynamicRetrievalConfig: {
                    mode: "MODE_DYNAMIC",
                    dynamicThreshold: 0.7
                  }
                }
              }],
              generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
              }
            })
          });

          // Check if response is successful
          if (response.status === 200) {
            const data = await response.json();
            
            // Extract the text from the complex JSON structure
            if (data.candidates && 
                data.candidates[0] && 
                data.candidates[0].content && 
                data.candidates[0].content.parts && 
                data.candidates[0].content.parts[0] && 
                data.candidates[0].content.parts[0].text) {
              
              console.log(`✅ Success with model: ${model}, API key: ${keyIndex + 1}`);
              return data.candidates[0].content.parts[0].text.trim();
            } else {
              throw new Error('Invalid response structure from API');
            }
          } else if (response.status === 429) {
            // Rate limit hit, try next key with same model
            console.log(`⚠️ Model ${model} - API key ${keyIndex + 1} rate limited, trying next key...`);
            continue;
          } else if (response.status === 404) {
            // Model not found, try next model
            console.log(`❌ Model ${model} not available, trying next model...`);
            break; // Break inner loop to try next model
          } else {
            // Other error, try next key with same model
            console.log(`❌ Model ${model} - API key ${keyIndex + 1} failed with status ${response.status}, trying next key...`);
            continue;
          }
        } catch (error) {
          console.error(`❌ Error with model ${model}, API key ${keyIndex + 1}:`, error.message);
          // Try next key with same model
          continue;
        }
      }
    }
    
    // If all models and keys failed, return friendly fallback message
    console.log("❌ All models and API keys failed");
    return "I'm sorry, I'm having trouble connecting to my AI service right now. Please try again in a moment. In the meantime, I'm here to help with any questions you might have!";
  }
}

// Create singleton instance
const chatService = new ChatService();

// Export both the class and instance for compatibility
export { chatService };
export const sendMessage = (userId, text) => chatService.sendMessage(userId, text);
export const getChats = (userId, callback) => chatService.getChats(userId, callback);
export const generateResponse = (text) => {
  const chatServiceInstance = new ChatService();
  return chatServiceInstance.generateResponse(text);
};
export const createNewChat = (userId) => chatService.createNewChat(userId);
export const getChatHistory = (userId) => chatService.getChatHistory(userId);
export const switchToChat = (userId, chatId) => chatService.switchToChat(userId, chatId);
export const clearAllChats = (userId) => chatService.clearAllChats(userId);