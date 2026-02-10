# Ability Chatbot - AI Voice & Text Assistant

A React Native Expo application that provides an intelligent chatbot with both voice and text interaction capabilities. Built with Firebase backend and modern React Native architecture.

## 📱 Project Overview

Ability Chatbot is a cross-platform mobile application that allows users to interact with an AI assistant through both voice commands and text input. The app features real-time chat functionality, voice recognition, text-to-speech, and comprehensive chat history management.

## 🏗️ Project Structure

```
ability-chatbot/
├── .expo/                          # Expo configuration and cache
│   ├── devices.json                # Connected devices info
│   ├── README.md                   # Expo setup instructions
│   └── settings.json               # Expo project settings
├── .git/                           # Git version control
├── .vscode/                        # VS Code workspace settings
├── app/                            # Main application screens (Expo Router)
│   ├── (auth)/                     # Authentication flow
│   │   ├── forgot-password.js      # Password reset screen
│   │   ├── login.js                # User login screen
│   │   ├── signup.js               # User registration screen
│   │   └── _layout.js              # Auth layout wrapper
│   ├── chat-history.js             # Chat history management screen
│   ├── chat.js                     # Main chat interface
│   ├── index.js                    # App entry point & routing logic
│   ├── profile.js                  # User profile management
│   ├── welcome.js                  # Welcome/onboarding screen
│   └── _layout.js                  # Root layout with providers
├── assets/                         # Static assets
│   └── images/
│       └── ability_logo.jpg        # App logo and branding
├── src/                            # Source code organization
│   ├── components/                 # Reusable UI components
│   │   ├── Button.js               # Custom button component
│   │   ├── ChatBubble.js           # Message display component
│   │   ├── CircleLoader.js         # Loading animation
│   │   ├── ErrorBoundary.js        # Error handling wrapper
│   │   ├── Input.js                # Text input component
│   │   ├── LoadingScreen.js        # Full-screen loading
│   │   ├── TextInputBox.js         # Chat text input
│   │   └── VoiceRecorder.js        # Voice recording interface
│   ├── config/                     # Configuration files
│   │   └── firebase.js             # Firebase setup & initialization
│   ├── context/                    # React Context providers
│   │   └── AuthContext.js          # Authentication state management
│   ├── hooks/                      # Custom React hooks
│   │   └── useAuth.js              # Authentication hook
│   ├── services/                   # Business logic & API services
│   │   ├── authService.js          # Authentication operations
│   │   ├── chatService.js          # Chat & messaging logic
│   │   ├── voiceNavigationService.js # Voice command processing
│   │   └── voiceService.js         # Voice recording & TTS
│   ├── styles/                     # Design system & styling
│   └── utils/                      # Utility functions & helpers
├── app.json                        # Expo app configuration
├── eas.json                        # EAS Build configuration
├── eslint.config.js                # ESLint configuration
├── package.json                    # Dependencies & scripts
└── package-lock.json               # Dependency lock file
```

## 🚀 Key Features

### 🎯 Core Functionality
- **Dual Interface**: Text and voice chat modes
- **Real-time Messaging**: Instant chat with AI assistant
- **Voice Recognition**: Speech-to-text input processing
- **Text-to-Speech**: AI responses with voice output
- **Chat History**: Persistent conversation management
- **User Authentication**: Secure Firebase authentication

### 🎙️ Voice Features
- Voice command navigation
- Hands-free chat interaction
- Voice input mode for messages
- Automatic speech recognition
- Voice navigation between screens

### 💬 Chat Features
- Real-time message synchronization
- Chat session management
- Message history persistence
- Chat search functionality
- Conversation summarization

## 📂 Detailed File Structure

### `/app` - Application Screens (Expo Router)
The main application screens using Expo Router for navigation:

- **`_layout.js`**: Root layout providing authentication context and navigation setup
- **`index.js`**: Entry point handling authentication routing logic
- **`welcome.js`**: Onboarding screen with voice navigation setup
- **`chat.js`**: Main chat interface supporting both text and voice modes
- **`chat-history.js`**: Chat history management and search
- **`profile.js`**: User profile and settings management

#### `/app/(auth)` - Authentication Flow
- **`_layout.js`**: Authentication layout wrapper
- **`login.js`**: User login with email/password
- **`signup.js`**: User registration with validation
- **`forgot-password.js`**: Password reset functionality

### `/src/components` - Reusable UI Components
Modular, reusable React Native components:

- **`Button.js`**: Customizable button with loading states
- **`ChatBubble.js`**: Message display with user/AI differentiation
- **`CircleLoader.js`**: Animated loading indicator
- **`ErrorBoundary.js`**: Error handling and recovery
- **`Input.js`**: Styled text input with validation
- **`LoadingScreen.js`**: Full-screen loading with customization
- **`TextInputBox.js`**: Chat-specific text input with send functionality
- **`VoiceRecorder.js`**: Voice recording interface with visual feedback

### `/src/services` - Business Logic Layer
Core application services and API integrations:

- **`authService.js`**: Firebase authentication operations
  - User registration, login, logout
  - Password reset functionality
  - Profile management
  
- **`chatService.js`**: Chat and messaging operations
  - Real-time message synchronization
  - Chat session management
  - Message history and search
  - AI response integration
  
- **`voiceNavigationService.js`**: Voice command processing
  - Voice command recognition
  - Navigation control via voice
  - Voice input mode management
  
- **`voiceService.js`**: Voice recording and text-to-speech
  - Audio recording functionality
  - Speech synthesis for AI responses

### `/src/config` - Configuration
- **`firebase.js`**: Firebase initialization and configuration
  - Authentication setup
  - Firestore database connection
  - Platform-specific persistence

### `/src/context` - State Management
- **`AuthContext.js`**: Global authentication state
  - User session management
  - Authentication status tracking
  - Profile data synchronization

### `/src/hooks` - Custom React Hooks
- **`useAuth.js`**: Authentication hook providing user state and auth methods

## 🛠️ Technology Stack

### Frontend
- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and build system
- **Expo Router**: File-based navigation system
- **React Context**: State management
- **React Hooks**: Component logic organization

### Backend & Services
- **Firebase Authentication**: User management
- **Firebase Firestore**: Real-time database
- **Expo Speech**: Text-to-speech functionality
- **Expo Speech Recognition**: Voice input processing
- **Expo Audio**: Voice recording capabilities

### Development Tools
- **EAS Build**: Cloud build service
- **ESLint**: Code linting and formatting
- **TypeScript**: Type checking (configured)
- **Expo Dev Client**: Development builds

## 📱 App Flow

### Authentication Flow
1. **App Launch** → `app/index.js` checks authentication status
2. **Unauthenticated** → Redirect to `app/(auth)/login.js`
3. **Registration** → `app/(auth)/signup.js` → Email verification
4. **Login** → `app/(auth)/login.js` → Authentication via Firebase
5. **Authenticated** → Redirect to `app/welcome.js`

### Main App Flow
1. **Welcome Screen** → Voice navigation setup and mode selection
2. **Chat Interface** → `app/chat.js` with text/voice modes
3. **Voice Commands** → Processed by `voiceNavigationService.js`
4. **Messages** → Managed by `chatService.js` with real-time sync
5. **Chat History** → Accessible via sidebar or `app/chat-history.js`

### Voice Interaction Flow
1. **Voice Activation** → User enables voice navigation
2. **Command Recognition** → Speech-to-text processing
3. **Command Processing** → Navigation or message handling
4. **AI Response** → Text-to-speech output
5. **Continuous Listening** → Auto-restart for hands-free operation

## 🔧 Configuration Files

### `app.json`
Expo application configuration including:
- App metadata (name, version, icon)
- Platform-specific settings (iOS/Android)
- Plugin configurations (audio, speech recognition)
- Build and deployment settings

### `eas.json`
EAS Build configuration for:
- Development builds with dev client
- Preview builds for testing
- Production builds for app stores

### `package.json`
Project dependencies and scripts:
- Expo and React Native core
- Firebase SDK
- Audio and speech libraries
- Development and build tools

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- Expo CLI
- iOS Simulator or Android Emulator
- Firebase project setup

### Installation
```bash
# Clone the repository
git clone <repository-url>

# Install dependencies
npm install

# Start development server
npx expo start

# For development builds
eas build --profile development --platform all
```

### Development Builds
The app uses Expo Dev Client for development builds that support both platforms from a single QR code:

```bash
# Build for both platforms
eas build --profile development --platform all

# Build for specific platform
eas build --profile development --platform ios
eas build --profile development --platform android
```

## 🔐 Environment Setup

### Firebase Configuration
1. Create a Firebase project
2. Enable Authentication and Firestore
3. Update `src/config/firebase.js` with your config
4. Configure authentication providers

### Voice Services
The app requires microphone permissions for voice functionality:
- iOS: Configured in `app.json` with usage descriptions
- Android: Permissions declared in `app.json`

## 📋 Features in Detail

### Chat Management
- Real-time message synchronization
- Persistent chat history
- Chat search and filtering
- Conversation summarization
- Multi-session support

### Voice Navigation
- Hands-free app navigation
- Voice command processing
- Context-aware responses
- Automatic listening restart
- Speech interruption handling

### User Experience
- Dark theme optimized design
- Smooth animations and transitions
- Keyboard handling
- Loading states and error handling
- Responsive layout for different screen sizes

This README provides a comprehensive overview of the Ability Chatbot project structure, making it easy for developers to understand the codebase organization and contribute to the project.