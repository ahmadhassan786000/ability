# Ability AI Chatbot

A modern React Native chatbot application built with Expo, featuring voice recording, real-time chat, and AI-powered responses using Google's Gemini API.

## Features

- 🤖 **AI-Powered Chat**: Integrated with Google Gemini API for intelligent responses
- 🎙️ **Voice Recording**: Voice-to-text functionality with speech recognition
- 💬 **Real-time Chat**: Instant messaging with typing indicators
- 📱 **Cross-Platform**: Works on both iOS and Android
- 🔐 **Firebase Authentication**: Secure user authentication with Firebase Auth
- � **CloudH Storage**: Chat data stored in Firebase Firestore
- 💾 **Real-time Sync**: Chat history synced across devices
- 🎨 **Modern UI**: Clean, responsive design with dark theme
- 🔍 **Google Search Grounding**: Real-time information beyond AI's knowledge cutoff

## Quick Setup Checklist

Before you start, make sure you complete these steps:

- [ ] Clone the repository
- [ ] Install dependencies (`npm install`)
- [ ] Create Firebase project
- [ ] Enable Email/Password authentication in Firebase
- [ ] Create Firestore database
- [ ] Update Firebase config in `src/config/firebase.js`
- [ ] Set up Firestore security rules
- [ ] (Optional) Add your own Gemini API key
- [ ] Start the development server (`npm start`)

## Prerequisites

Before running this project, make sure you have the following installed:

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Expo CLI**: `npm install -g @expo/cli`
- **Git**

### For Mobile Development:
- **Expo Go** app on your mobile device (iOS/Android)
- OR **Android Studio** (for Android emulator)
- OR **Xcode** (for iOS simulator - macOS only)

## Installation & Setup

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd ability-chatbot
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Firebase Setup (Required)

This app uses Firebase for authentication and data storage. You need to create your own Firebase project and configure it:

#### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter your project name (e.g., "my-chatbot-app")
4. Enable Google Analytics (optional)
5. Click "Create project"

#### Step 2: Enable Authentication
1. In your Firebase project, go to **Authentication** → **Sign-in method**
2. Enable **Email/Password** provider
3. Click "Save"

#### Step 3: Create Firestore Database
1. Go to **Firestore Database** → **Create database**
2. Choose **Start in test mode** (for development)
3. Select your preferred location
4. Click "Done"

#### Step 4: Get Firebase Configuration
1. Go to **Project Settings** (gear icon) → **General** tab
2. Scroll down to "Your apps" section
3. Click **Web app** icon (`</>`)
4. Register your app with a name (e.g., "Chatbot Web App")
5. Copy the `firebaseConfig` object

#### Step 5: Update Firebase Configuration
1. Open `src/config/firebase.js` in your project
2. Replace the existing `firebaseConfig` object with your configuration:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key-here",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.firebasestorage.app",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
  measurementId: "your-measurement-id" // Optional
};
```

**Security Note**: For production apps, consider using environment variables to store sensitive configuration. However, for Expo development, the config file approach is standard and secure enough since Firebase client SDKs are designed to be used with public API keys.

#### Step 6: Configure Firestore Security Rules (Important)
1. Go to **Firestore Database** → **Rules** tab
2. Replace the default rules with these secure rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /chats/{chatId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    // Active chats - users can only access their own
    match /activeChats/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // User profiles - users can only access their own
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Click **Publish** to save the rules

#### Step 7: Set Up Gemini AI API (Optional but Recommended)
The app uses Google's Gemini API for AI responses. To use your own API key:

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Open `src/services/chatService.js`
4. Replace the API key in the `API_KEYS` array:

```javascript
const API_KEYS = [
  'your-gemini-api-key-here',
];
```

**Note**: The current API key in the code is for demonstration purposes and may have usage limits.

#### Firebase Services Used:
- **Firebase Authentication**: Email/password user authentication
- **Firebase Firestore**: Real-time chat data storage and synchronization
- **Security Rules**: Protect user data with proper access controls

#### Testing Your Firebase Setup:
1. Start the app: `npm start`
2. Create a new account using the signup screen
3. Try logging in with your credentials
4. Send a test message in the chat
5. Check your Firebase Console:
   - **Authentication** → **Users** (should show your account)
   - **Firestore Database** → **Data** (should show chat collections)

If everything works, your Firebase setup is complete! 🎉

### 4. Start the Development Server
```bash
npm start
# or
yarn start
# or
expo start
```

### 5. Run on Device/Emulator

#### Option A: Physical Device (Recommended)
1. Install **Expo Go** app from App Store (iOS) or Google Play Store (Android)
2. Scan the QR code displayed in terminal/browser
3. App will load on your device

#### Option B: iOS Simulator (macOS only)
```bash
npm run ios
# or
yarn ios
```

#### Option C: Android Emulator
```bash
npm run android
# or
yarn android
```

## Project Structure

```
ability-chatbot/
├── app/                          # App screens (Expo Router)
│   ├── (auth)/                   # Authentication screens
│   │   ├── login.js             # Login screen
│   │   ├── signup.js            # Signup screen
│   │   ├── forgot-password.js   # Password reset
│   │   └── _layout.js           # Auth layout
│   ├── chat.js                  # Main chat screen
│   ├── chat-history.js          # Chat history screen
│   ├── profile.js               # User profile
│   ├── welcome.js               # Welcome screen
│   ├── index.js                 # Home/redirect screen
│   └── _layout.js               # Root layout
├── src/
│   ├── components/              # Reusable components
│   │   ├── ChatBubble.js        # Chat message bubbles
│   │   ├── VoiceRecorder.js     # Voice recording component
│   │   └── TextInputBox.js      # Text input component
│   ├── context/                 # React Context
│   │   └── AuthContext.js       # Authentication context
│   ├── hooks/                   # Custom hooks
│   │   └── useAuth.js           # Authentication hook
│   ├── services/                # API services
│   │   └── chatService.js       # Chat and AI service
│   └── styles/                  # Styling
│       └── designSystem.js      # Design tokens
├── assets/                      # Static assets
│   └── images/                  # App images and icons
├── package.json                 # Dependencies
├── app.json                     # Expo configuration
└── eas.json                     # Expo Application Services config
```

## Key Technologies

- **React Native** - Mobile app framework
- **Expo** - Development platform and tools
- **Expo Router** - File-based routing
- **Firebase Authentication** - User authentication and management
- **Firebase Firestore** - Real-time cloud database
- **Google Gemini API** - AI responses with search grounding
- **Expo Speech Recognition** - Voice-to-text functionality
- **Expo Speech** - Text-to-speech for voice responses
- **Expo Haptics** - Tactile feedback

## Features Overview

### Authentication System
- Firebase Authentication with email/password
- Secure user registration and login
- Real-time authentication state management
- Password reset functionality
- User profile management

### Chat Features
- Real-time messaging interface with Firestore
- AI-powered responses using Gemini API
- Voice recording with speech-to-text
- Text-to-speech for AI responses
- Cloud-based chat history and session management
- Real-time synchronization across devices
- Typing indicators and loading states

### Voice Integration
- Voice recording with visual feedback
- Speech recognition for message input
- AI response playback with speech synthesis
- Automatic speech cleanup on navigation

### UI/UX Features
- Dark theme design
- Smooth animations and transitions
- Responsive layout for different screen sizes
- Professional chat interface
- Loading states and error handling

## Troubleshooting

### Common Issues

1. **Metro bundler issues**:
   ```bash
   npx expo start --clear
   ```

2. **Node modules issues**:
   ```bash
   rm -rf node_modules
   npm install
   ```

3. **Expo cache issues**:
   ```bash
   npx expo install --fix
   ```

4. **iOS simulator not working**:
   - Make sure Xcode is installed (macOS only)
   - Try: `npx expo run:ios`

5. **Android emulator not working**:
   - Make sure Android Studio is installed
   - Start an Android Virtual Device (AVD)
   - Try: `npx expo run:android`

### Firebase Issues

6. **Authentication not working**:
   - Verify your Firebase config in `src/config/firebase.js`
   - Check if Email/Password is enabled in Firebase Console
   - Ensure your app domain is authorized in Firebase Authentication settings

7. **Firestore permission denied**:
   - Check your Firestore security rules
   - Make sure users are authenticated before accessing data
   - Verify the rules match the structure provided in setup

8. **Firebase initialization errors**:
   - Clear app data/cache on your device
   - Restart the development server
   - Check for typos in your Firebase configuration

9. **Chat data not syncing**:
   - Check your internet connection
   - Verify Firestore rules allow read/write for authenticated users
   - Check browser/device console for Firebase errors

10. **Gemini AI not responding**:
    - Verify your Gemini API key is valid
    - Check API key usage limits in Google AI Studio
    - Ensure you have internet connection for API calls

### Performance Tips

- Use physical device for better performance
- Close other apps while testing
- Use `--dev false` flag for production-like performance
- Clear Expo cache if experiencing issues

## Development Commands

```bash
# Start development server
npm start

# Start with cache cleared
npx expo start --clear

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web (limited functionality)
npm run web

# Check for issues
npx expo doctor

# Update Expo SDK
npx expo install --fix
```

## Building for Production

### Using Expo Application Services (EAS)

1. **Install EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**:
   ```bash
   eas login
   ```

3. **Configure build**:
   ```bash
   eas build:configure
   ```

4. **Build for Android**:
   ```bash
   eas build --platform android
   ```

5. **Build for iOS**:
   ```bash
   eas build --platform ios
   ```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Commit: `git commit -m 'Add feature'`
5. Push: `git push origin feature-name`
6. Create a Pull Request

## License

This project is licensed under the MIT License.

## Support

If you encounter any issues or have questions:

1. Check the troubleshooting section above
2. Review Expo documentation: https://docs.expo.dev/
3. Check React Native documentation: https://reactnative.dev/
4. Create an issue in the repository

---

**Happy Coding! 🚀**