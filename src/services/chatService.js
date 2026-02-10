
import * as Speech from 'expo-speech';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';

// Firebase Firestore chat service with session management
export class ChatService {
  constructor() {
    this.listeners = new Map();
    this.currentChatId = null;
    this.currentSpeech = null; // Track current speech instance
    this.unsubscribers = new Map(); // Track Firestore listeners
    this.onSpeechComplete = null; // Callback for when AI speech completes
    this.onSpeechStart = null; // Callback for when AI speech starts
  }

  // Create new chat session
  async createNewChat(userId) {
    try {
      // Clean up any empty chats before creating a new one (non-blocking, with throttling)
      // Only run cleanup occasionally to avoid performance issues
      const shouldCleanup = Math.random() < 0.3; // 30% chance
      if (shouldCleanup) {
        this.cleanupEmptyNewChats(userId).catch(error => {
          console.warn("Background cleanup warning:", error.message || error);
        });
      }

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

      // Debug: Check Firebase Auth state
      const { auth } = require('../config/firebase');
      console.log("Firebase Auth current user:", auth.currentUser ? auth.currentUser.uid : "No user");
      console.log("Passed userId:", userId);

      if (!auth.currentUser) {
        throw new Error("No authenticated user found in Firebase Auth");
      }

      if (auth.currentUser.uid !== userId) {
        console.warn("User ID mismatch:", auth.currentUser.uid, "vs", userId);
      }

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
        text: "",
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
      // Generate AI response in background (fire and forget)
      this.processAIResponse(userId, activeChat, text, messageType, loadingMessage, timestamp);

      console.log("User message sent, processing AI response in background");
      return activeChat.messages;
    } catch (err) {
      console.error("Error sending message:", err);
      throw err;
    }
  }

  // Process AI response in background
  async processAIResponse(userId, activeChat, text, messageType, loadingMessage, timestamp) {
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

        // Clean the text for speech (remove emojis and special characters)
        const cleanTextForSpeech = this.cleanTextForSpeech(aiResponseText);
        console.log("About to speak AI response:", cleanTextForSpeech);

        // Store reference for stopping later
        this.currentSpeech = { stop: () => Speech.stop() };

        Speech.speak(cleanTextForSpeech, {
          language: 'en',
          pitch: 1.0,
          rate: 0.8,
          onStart: () => {
            // Trigger barge-in recording support once speech actually starts
            console.log("Speech started, enabling barge-in recording...");
            if (this.onSpeechStart) {
              this.onSpeechStart();
            }
          },
          onDone: () => {
            console.log("Speech completed");
            this.currentSpeech = null;
            // Call the callback to restart voice navigation
            if (this.onSpeechComplete) {
              console.log("Calling speech complete callback...");
              setTimeout(() => {
                this.onSpeechComplete();
              }, 500); // Small delay before restarting voice navigation
            } else {
              console.log("No speech complete callback set");
            }
          },
          onStopped: () => {
            console.log("Speech stopped");
            this.currentSpeech = null;
            // Also call callback when speech is stopped
            if (this.onSpeechComplete) {
              console.log("Calling speech complete callback (stopped)...");
              setTimeout(() => {
                this.onSpeechComplete();
              }, 500);
            } else {
              console.log("No speech complete callback set (stopped)");
            }
          },
          onError: (error) => {
            console.error("Speech error:", error);
            this.currentSpeech = null;
            // Call callback even on error
            if (this.onSpeechComplete) {
              console.log("Calling speech complete callback (error)...");
              setTimeout(() => {
                this.onSpeechComplete();
              }, 500);
            } else {
              console.log("No speech complete callback set (error)");
            }
          }
        });
      }

    } catch (error) {
      console.error("Error generating AI response:", error);

      // Remove loading message
      activeChat.messages = activeChat.messages.filter(msg => msg.id !== loadingMessage.id);

      // Check if it's a quota error and handle gracefully
      let errorText = "Sorry, I'm having trouble responding right now. Please try again.";

      if (error.message && (error.message.includes('429') || error.message.includes('quota') || error.message.includes('exceeded'))) {
        // For quota errors, provide a more helpful message without exposing technical details
        errorText = "I'm currently experiencing high demand. Please try again in a moment, and I'll be happy to help!";
      }

      // Add error message
      const errorMessage = {
        id: `ai_error_${timestamp}`,
        text: errorText,
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
      return () => { };
    }
  }

  // Get chat history list for UI
  async getChatHistory(userId) {
    try {
      // Simple query without orderBy to test
      const chatsQuery = query(
        collection(db, 'chats'),
        where('userId', '==', userId)
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

      // Sort in JavaScript instead of Firestore
      chatHistory.sort((a, b) => b.updatedAt - a.updatedAt);

      // Limit to 50 results
      return chatHistory.slice(0, 50);
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

  // Clean text for speech (remove emojis and special characters)
  cleanTextForSpeech(text) {
    // Remove emojis using regex
    let cleanText = text.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');

    // Remove other emoji ranges
    cleanText = cleanText.replace(/[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}]/gu, '');

    // Remove extra whitespace created by emoji removal
    cleanText = cleanText.replace(/\s+/g, ' ').trim();

    // Replace common symbols that might cause speech issues
    cleanText = cleanText.replace(/[*_~`]/g, ''); // Remove markdown symbols
    cleanText = cleanText.replace(/[#@$%^&]/g, ''); // Remove special characters

    return cleanText;
  }

  // Set callback for when AI speech completes
  setSpeechCompleteCallback(callback) {
    this.onSpeechComplete = callback;
  }

  // Set callback for when AI speech starts
  setSpeechStartCallback(callback) {
    this.onSpeechStart = callback;
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
      // Check if user is still authenticated
      const currentUser = auth.currentUser;
      if (!currentUser || currentUser.uid !== userId) {
        console.log("User not authenticated or userId mismatch, skipping cleanup");
        return 0;
      }

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Cleanup timeout')), 10000); // 10 second timeout
      });

      const cleanupPromise = this.performCleanup(userId);

      return await Promise.race([cleanupPromise, timeoutPromise]);
    } catch (error) {
      console.error("Error cleaning up empty new chats:", error);
      // Don't throw the error, just log it and return 0
      return 0;
    }
  }

  // Separate method for the actual cleanup logic
  async performCleanup(userId) {
    const chatsQuery = query(
      collection(db, 'chats'),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(chatsQuery);
    let deletedCount = 0;

    // Delete chats one by one instead of using batch to avoid permission issues
    for (const doc of querySnapshot.docs) {
      try {
        const chat = doc.data();
        // Delete chats that have "New Chat" title and no messages or only empty messages
        if ((chat.title === 'New Chat' || chat.title === null || !chat.title) &&
          (!chat.messages || chat.messages.length === 0)) {
          await deleteDoc(doc.ref);
          deletedCount++;
        }
      } catch (deleteError) {
        console.warn(`Failed to delete chat ${doc.id}:`, deleteError.message);
        // Continue with other chats even if one fails
      }
    }

    if (deletedCount > 0) {
      console.log(`Cleaned up ${deletedCount} empty new chats`);
    }

    return deletedCount;
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

  // Enhanced AI response generation using Google Gemini REST API with real-time data and semantic analysis
  async generateResponse(text) {
    try {
      const API_KEY = 'AIzaSyCHJjAx5DrajxLLn6SvF4JboK2GTRqkBnI';
      const MODEL = 'gemini-2.5-flash';

      // Perform semantic analysis on the input
      const semanticContext = this.performSemanticAnalysis(text);

      // Fetch real-time data if needed
      const realTimeData = await this.fetchRealTimeData(text);

      // Construct enhanced prompt with semantic analysis and real-time data
      let enhancedPrompt = text;

      if (semanticContext.intent || semanticContext.emotion !== 'neutral') {
        let contextInfo = '\n\nSemantic Context:';

        if (semanticContext.intent) {
          contextInfo += `\n- User Intent: ${semanticContext.intent}`;
        }

        if (semanticContext.emotion !== 'neutral') {
          contextInfo += `\n- User Emotion: ${semanticContext.emotion}`;
        }

        if (semanticContext.sentiment !== 'neutral') {
          contextInfo += `\n- Sentiment: ${semanticContext.sentiment}`;
        }

        if (semanticContext.topics.length > 0) {
          contextInfo += `\n- Topics: ${semanticContext.topics.join(', ')}`;
        }

        if (semanticContext.responseStyle !== 'casual') {
          contextInfo += `\n- Suggested Response Style: ${semanticContext.responseStyle}`;
        }

        if (semanticContext.suggestedEmojis.length > 0) {
          contextInfo += `\n- Relevant Emojis: ${semanticContext.suggestedEmojis.slice(0, 5).join(' ')}`;
        }

        enhancedPrompt += contextInfo;
      }

      if (realTimeData) {
        enhancedPrompt += `\n\nReal-time context: ${realTimeData}`;
      }

      enhancedPrompt += '\n\nIMPORTANT: Respond as a friendly AI chatbot using ONLY plain text. NO emojis, NO markdown formatting (no **bold** or *italic*), NO symbols. Use descriptive words to express emotions. Emojis are strictly forbidden except in extremely rare cases (less than 1% of responses).';

      // Make direct REST API call to Google Gemini
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{
              text: `You are a friendly, intelligent AI chatbot assistant. Your behavior guidelines:

PERSONALITY & TONE:
- Be conversational, warm, and approachable like talking to a helpful friend
- Show enthusiasm and genuine interest in helping users
- Use a casual, natural speaking style without being overly formal
- Be empathetic and understanding of user needs and emotions

COMMUNICATION STYLE - CRITICAL EMOJI RULES:
- ABSOLUTELY NO EMOJIS in 99% of your responses
- Express ALL emotions through descriptive words, not symbols
- Only use emojis in extremely rare cases (less than 1% of responses) when absolutely necessary for clarity
- When you feel like adding an emoji, use descriptive words instead
- Keep responses conversational and easy to understand
- Avoid overly technical jargon unless specifically requested

FORMATTING RULES - VERY IMPORTANT:
- NEVER use markdown formatting like **bold**, *italic*, or ***bold italic***
- NEVER use asterisks (*) around text for emphasis
- NEVER use underscores (_) for formatting
- NEVER use hashtags (#) for headings
- NEVER use backticks (\`) for code formatting
- STRICTLY AVOID emojis and emoticons
- Write everything in plain text only
- Use CAPITAL LETTERS sparingly for emphasis if needed
- Use natural language for emphasis instead of formatting symbols

EMOJI REPLACEMENT GUIDE:
- Instead of 😊 say "I'm happy to help"
- Instead of 🤔 say "Let me think about this"
- Instead of 💡 say "Here's an idea"
- Instead of 🎉 say "That's fantastic" or "Congratulations"
- Instead of ❤️ say "I really appreciate"
- Instead of 😔 say "I understand that's disappointing"
- Instead of 🚀 say "This will boost your progress"
- Instead of ⚡ say "This is powerful"

SEMANTIC ANALYSIS & RESPONSES:
- Analyze the user's intent, emotion, and context before responding
- Adapt your response style based on the user's mood and needs
- If user seems frustrated, be more supportive and patient
- If user is excited, match their energy with enthusiasm through words
- For questions, provide clear and helpful answers
- For problems, offer practical solutions and alternatives

RESPONSE STRUCTURE:
- Start with an appropriate greeting or acknowledgment
- Address the user's specific question or concern
- Provide helpful, accurate information in plain text
- End with encouragement or offer further assistance when appropriate
- Express emotions through descriptive language, never symbols

EXAMPLES OF GOOD RESPONSES:
- "Hey there! I'd be happy to help you with that..."
- "That's a great question! Let me break this down for you..."
- "I understand that can be frustrating. Here's what I suggest..."
- "That's awesome! You're on the right track. Here's how to..."
- "I'm excited to help you solve this problem..."

WHAT ABSOLUTELY NOT TO DO:
- Don't write: "**Important:** This is bold text"
- Don't write: "*Here's* some italic text"
- Don't write: "# This is a heading"
- Don't write: "\`code example\`"
- Don't use: ANY emojis like 😊 🎉 💡 🚀 ❤️ 🤔 😔 ⚡ 🌟 etc.

WHAT TO DO INSTEAD:
- Write: "Important: This is emphasized text"
- Write: "Here's some important information"
- Write: "Main Topic: Your heading here"
- Write: "Here's the code: your code here"
- Express happiness with "That's wonderful!" instead of 😊
- Express thinking with "Let me consider this" instead of 🤔

FINAL RULE: If you catch yourself about to use an emoji, STOP and use descriptive words instead. Emojis should be used less than 1% of the time and only when absolutely critical for understanding.

Remember: Be helpful, friendly, and write in plain text without any markdown formatting symbols or emojis!`
            }]
          },
          contents: [{
            parts: [{
              text: enhancedPrompt
            }]
          }],
          generationConfig: {
            temperature: 0.9,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        })
      });

      if (response.ok) {
        const data = await response.json();

        // Extract the text from the response
        if (data.candidates &&
          data.candidates[0] &&
          data.candidates[0].content &&
          data.candidates[0].content.parts &&
          data.candidates[0].content.parts[0] &&
          data.candidates[0].content.parts[0].text) {

          console.log(`✅ Success with Google Gemini REST API model: ${MODEL}`);
          return data.candidates[0].content.parts[0].text.trim();
        } else {
          console.log('Invalid response structure from API');
          return "I'm having trouble processing your request right now. Please try again.";
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = `API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`;

        // Check if it's a quota error (429) and handle silently
        if (response.status === 429) {
          console.log(`Google Gemini API Quota Exceeded: ${errorMessage}`);
          return "I'm currently experiencing high demand. Please try again in a moment, and I'll be happy to help!";
        } else {
          console.log(`Google Gemini API Error: ${errorMessage}`);
          return "I'm sorry, I'm having trouble connecting to my AI service right now. Please try again in a moment.";
        }
      }

    } catch (error) {
      // Handle network errors and other exceptions silently
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.log('Network error connecting to Google Gemini API');
        return "I'm having trouble connecting right now. Please check your internet connection and try again.";
      }

      // Handle any other errors silently
      console.log('Unexpected error with Google Gemini API:', error.message || error);
      return "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment.";
    }
  }

  // Perform semantic analysis on user input
  performSemanticAnalysis(text) {
    const analysis = {
      intent: null,
      topics: [],
      sentiment: 'neutral',
      emotion: 'neutral',
      entities: [],
      keywords: [],
      suggestedEmojis: [],
      responseStyle: 'casual'
    };

    const lowerText = text.toLowerCase();

    // Intent detection
    const intentPatterns = {
      question: ['what', 'how', 'why', 'when', 'where', 'who', '?', 'explain', 'tell me'],
      request: ['please', 'can you', 'could you', 'help me', 'i need', 'show me'],
      information: ['tell me', 'explain', 'describe', 'define', 'what is'],
      problem: ['error', 'issue', 'problem', 'bug', 'not working', 'broken', 'fix'],
      greeting: ['hello', 'hi', 'hey', 'good morning', 'good evening', 'greetings'],
      gratitude: ['thank', 'thanks', 'appreciate', 'grateful'],
      complaint: ['hate', 'terrible', 'awful', 'worst', 'annoying', 'frustrated'],
      excitement: ['awesome', 'amazing', 'great', 'fantastic', 'love', 'excited']
    };

    for (const [intent, patterns] of Object.entries(intentPatterns)) {
      if (patterns.some(pattern => lowerText.includes(pattern))) {
        analysis.intent = intent;
        break;
      }
    }

    // Enhanced topic extraction
    const topicPatterns = {
      technology: ['code', 'programming', 'software', 'app', 'website', 'api', 'database', 'react', 'javascript'],
      health: ['health', 'medical', 'doctor', 'medicine', 'symptoms', 'treatment', 'fitness'],
      education: ['learn', 'study', 'school', 'university', 'course', 'tutorial', 'teach'],
      business: ['business', 'company', 'market', 'finance', 'money', 'investment', 'work'],
      science: ['science', 'research', 'experiment', 'theory', 'physics', 'chemistry', 'biology'],
      travel: ['travel', 'trip', 'vacation', 'hotel', 'flight', 'destination', 'visit'],
      food: ['food', 'recipe', 'cooking', 'restaurant', 'eat', 'meal', 'dinner'],
      entertainment: ['movie', 'music', 'game', 'book', 'show', 'fun', 'entertainment']
    };

    for (const [topic, keywords] of Object.entries(topicPatterns)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        analysis.topics.push(topic);
      }
    }

    // Enhanced sentiment and emotion analysis
    const emotionPatterns = {
      happy: ['happy', 'joy', 'excited', 'great', 'awesome', 'amazing', 'love', 'wonderful'],
      sad: ['sad', 'depressed', 'down', 'upset', 'disappointed', 'hurt'],
      angry: ['angry', 'mad', 'furious', 'annoyed', 'frustrated', 'hate'],
      worried: ['worried', 'anxious', 'concerned', 'nervous', 'scared', 'afraid'],
      confused: ['confused', 'lost', 'unclear', 'dont understand', "don't get"],
      surprised: ['surprised', 'shocked', 'wow', 'unbelievable', 'incredible']
    };

    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'like', 'happy', 'awesome', 'fantastic'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'sad', 'angry', 'frustrated', 'annoying'];

    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;

    if (positiveCount > negativeCount) {
      analysis.sentiment = 'positive';
    } else if (negativeCount > positiveCount) {
      analysis.sentiment = 'negative';
    }

    // Detect specific emotions
    for (const [emotion, patterns] of Object.entries(emotionPatterns)) {
      if (patterns.some(pattern => lowerText.includes(pattern))) {
        analysis.emotion = emotion;
        break;
      }
    }

    // Suggest appropriate emojis based on intent and emotion
    const emojiSuggestions = {
      question: ['🤔', '❓', '💭'],
      greeting: ['👋', '😊', '🙂'],
      gratitude: ['🙏', '😊', '❤️'],
      problem: ['😔', '🔧', '💡'],
      excitement: ['🎉', '😄', '🌟'],
      happy: ['😊', '😄', '🎉', '❤️'],
      sad: ['😔', '💙', '🤗'],
      angry: ['😤', '🤯', '😠'],
      worried: ['😰', '🤗', '💙'],
      confused: ['🤔', '😕', '❓'],
      surprised: ['😲', '🤯', '😮'],
      technology: ['💻', '⚡', '🚀'],
      health: ['🏥', '💊', '🩺'],
      food: ['🍽️', '🍕', '🥗'],
      travel: ['✈️', '🌍', '🗺️']
    };

    // Add suggested emojis
    if (analysis.intent && emojiSuggestions[analysis.intent]) {
      analysis.suggestedEmojis.push(...emojiSuggestions[analysis.intent]);
    }
    if (analysis.emotion && emojiSuggestions[analysis.emotion]) {
      analysis.suggestedEmojis.push(...emojiSuggestions[analysis.emotion]);
    }
    analysis.topics.forEach(topic => {
      if (emojiSuggestions[topic]) {
        analysis.suggestedEmojis.push(...emojiSuggestions[topic]);
      }
    });

    // Remove duplicates
    analysis.suggestedEmojis = [...new Set(analysis.suggestedEmojis)];

    // Determine response style
    if (analysis.emotion === 'sad' || analysis.emotion === 'worried') {
      analysis.responseStyle = 'supportive';
    } else if (analysis.emotion === 'happy' || analysis.emotion === 'excited') {
      analysis.responseStyle = 'enthusiastic';
    } else if (analysis.intent === 'problem') {
      analysis.responseStyle = 'helpful';
    } else if (analysis.intent === 'question') {
      analysis.responseStyle = 'informative';
    }

    // Extract keywords (simple approach)
    const words = text.split(/\s+/).filter(word => word.length > 3);
    analysis.keywords = words.slice(0, 5); // Top 5 keywords

    return analysis;
  }

  // Fetch real-time data based on user query
  async fetchRealTimeData(text) {
    try {
      const lowerText = text.toLowerCase();

      // Check if query needs real-time data
      const realTimeIndicators = [
        'current', 'latest', 'now', 'today', 'recent', 'update',
        'news', 'weather', 'price', 'stock', 'time', 'date'
      ];

      const needsRealTime = realTimeIndicators.some(indicator =>
        lowerText.includes(indicator)
      );

      if (!needsRealTime) {
        return null;
      }

      // Get current date and time
      const now = new Date();
      const currentDateTime = now.toLocaleString();

      let realTimeInfo = `Current date and time: ${currentDateTime}`;

      // Add specific real-time context based on query type
      if (lowerText.includes('weather')) {
        realTimeInfo += '. Note: For accurate weather information, please specify your location.';
      } else if (lowerText.includes('news')) {
        realTimeInfo += '. Note: I can provide general information, but for latest news, please check current news sources.';
      } else if (lowerText.includes('price') || lowerText.includes('stock')) {
        realTimeInfo += '. Note: For current market prices, please check financial websites or apps.';
      }

      return realTimeInfo;

    } catch (error) {
      console.error('Error fetching real-time data:', error);
      return null;
    }
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