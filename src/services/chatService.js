
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    setDoc,
    updateDoc,
    where,
    writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Firebase Firestore chat service with session management
export class ChatService {
  constructor() {
    this.listeners = new Map();
    this.currentChatId = null;
    this.currentSpeech = null; // Track current speech instance
    this.unsubscribers = new Map(); // Track Firestore listeners
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

      // Save new chat session to Firestore
      await setDoc(doc(db, 'chats', chatId), newChat);
      
      // Set as active chat
      this.currentChatId = chatId;
      await setDoc(doc(db, 'activeChats', userId), { chatId, updatedAt: Date.now() });
      
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
      const activeChatDoc = await getDoc(doc(db, 'activeChats', userId));
      
      if (activeChatDoc.exists()) {
        const { chatId } = activeChatDoc.data();
        const chatDoc = await getDoc(doc(db, 'chats', chatId));
        
        if (chatDoc.exists()) {
          this.currentChatId = chatId;
          return chatDoc.data();
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
      const chatDoc = await getDoc(doc(db, 'chats', chatId));
      return chatDoc.exists() ? chatDoc.data() : null;
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
      
      // Show user message immediately in UI (notify listeners first)
      this.notifyListeners(userId, activeChat.messages);
      
      // Save user message to database in background (don't await)
      this.updateChatSession(userId, activeChat).catch(error => {
        console.error("Error saving user message to database:", error);
      });
      
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
      
      // Show loading message immediately in UI
      this.notifyListeners(userId, activeChat.messages);
      
      // Save loading message to database in background
      this.updateChatSession(userId, activeChat).catch(error => {
        console.error("Error saving loading message to database:", error);
      });
      
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

  // Update chat session in Firestore
  async updateChatSession(userId, updatedChat) {
    try {
      await updateDoc(doc(db, 'chats', updatedChat.chatId), updatedChat);
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
      const chatsQuery = query(
        collection(db, 'chats'),
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc'),
        limit(50)
      );
      
      const querySnapshot = await getDocs(chatsQuery);
      const chatHistory = [];
      
      querySnapshot.forEach((doc) => {
        const chat = doc.data();
        // Only include chats that have messages or a proper title (not "New Chat" with no messages)
        if (chat.messages && chat.messages.length > 0) {
          chatHistory.push({
            chatId: chat.chatId,
            title: chat.title || 'New Chat',
            summary: chat.summary || 'Start a conversation...',
            updatedAt: chat.updatedAt,
            messageCount: chat.messages.length
          });
        }
      });
      
      return chatHistory;
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
        await setDoc(doc(db, 'activeChats', userId), { chatId, updatedAt: Date.now() });
        
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
      // Get all user chats
      const chatsQuery = query(
        collection(db, 'chats'),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(chatsQuery);
      const batch = writeBatch(db);
      
      // Delete all chats
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      // Delete active chat reference
      batch.delete(doc(db, 'activeChats', userId));
      
      await batch.commit();
      
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

  // Clean up empty chats with "New Chat" title
  async cleanupEmptyNewChats(userId) {
    try {
      const chatsQuery = query(
        collection(db, 'chats'),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(chatsQuery);
      const batch = writeBatch(db);
      let deletedCount = 0;
      
      querySnapshot.forEach((doc) => {
        const chat = doc.data();
        // Delete chats that have "New Chat" title and no messages or only empty messages
        if ((chat.title === 'New Chat' || chat.title === null || !chat.title) && 
            (!chat.messages || chat.messages.length === 0)) {
          batch.delete(doc.ref);
          deletedCount++;
        }
      });
      
      if (deletedCount > 0) {
        await batch.commit();
        console.log(`Cleaned up ${deletedCount} empty new chats`);
      }
      
      return deletedCount;
    } catch (error) {
      console.error("Error cleaning up empty new chats:", error);
      return 0;
    }
  }

  // Delete specific chat session
  async deleteChat(userId, chatId) {
    try {
      await deleteDoc(doc(db, 'chats', chatId));
      
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
export const cleanupEmptyNewChats = (userId) => chatService.cleanupEmptyNewChats(userId);