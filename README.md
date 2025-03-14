# Aibo AI Chat

Aibo is a modern, multilingual AI chat application that allows users to communicate with various AI models through a clean, intuitive interface. Built with Ionic React and Capacitor, it works seamlessly across web, Android, and iOS platforms.

## Features

- **Multiple AI Model Support**: Configure and use different AI providers with custom base URLs and models
- **Multilingual Interface**: Full support for English and Chinese languages
- **Chat History Management**: Save, view, and manage past conversations
- **Dark Mode Support**: Choose between light, dark, or system-based theme
- **Token Usage Tracking**: Monitor prompt and completion token usage
- **Responsive Design**: Works on mobile and desktop devices
- **Offline Storage**: All conversations and settings are stored locally on your device

## Installation

### Prerequisites

- Node.js 16 or higher
- npm or yarn
- For mobile development: Android Studio (for Android) or Xcode (for iOS)

### Web

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Android

```bash
# Install dependencies
npm install

# Build the web assets
npm run build

# Sync the web assets with the native project
npx cap sync android

# Open in Android Studio
npx cap open android
```

### iOS

```bash
# Install dependencies
npm install

# Build the web assets
npm run build

# Sync the web assets with the native project
npx cap sync ios

# Open in Xcode
npx cap open ios
```

## Usage

1. **First Launch**: On first launch, navigate to the Settings tab to configure your AI provider
2. **API Configuration**: Add your API key and select or configure your preferred AI model
3. **Start Chatting**: Return to the Chat tab and start sending messages
4. **Save Conversations**: Use the "Save Chat" button to store important conversations
5. **Manage History**: Access past conversations from the sidebar

## Privacy

Aibo respects your privacy:
- All data is stored locally on your device
- API keys are never sent to our servers
- No analytics or tracking code is included

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [Ionic Framework](https://ionicframework.com/)
- Powered by [Capacitor](https://capacitorjs.com/)
- Uses [OpenAI API](https://platform.openai.com/) compatible endpoints