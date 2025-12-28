# Ability AI Chatbot

A modern React Native chatbot application built with Expo, featuring voice recording, real-time chat, and AI-powered responses using Google's Gemini API.

## Features

- 🤖 **AI-Powered Chat**: Integrated with Google Gemini API for intelligent responses
- 🎙️ **Voice Recording**: Voice-to-text functionality with speech recognition
- 💬 **Real-time Chat**: Instant messaging with typing indicators
- 📱 **Cross-Platform**: Works on both iOS and Android
- 🔐 **User Authentication**: Secure login and signup system
- 💾 **Chat History**: Persistent chat sessions with local storage
- 🎨 **Modern UI**: Clean, responsive design with dark theme
- 🔍 **Google Search Grounding**: Real-time information beyond AI's knowledge cutoff

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

### 3. API Configuration
The app uses Google Gemini API keys that are already configured in the code. No additional API setup is required.

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
- **Google Gemini API** - AI responses with search grounding
- **Expo Speech Recognition** - Voice-to-text functionality
- **Expo Speech** - Text-to-speech for voice responses
- **AsyncStorage** - Local data persistence
- **Expo Haptics** - Tactile feedback

## Features Overview

### Authentication System
- User registration and login
- Secure session management
- Password reset functionality

### Chat Features
- Real-time messaging interface
- AI-powered responses using Gemini API
- Voice recording with speech-to-text
- Text-to-speech for AI responses
- Chat history and session management
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