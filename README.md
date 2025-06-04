# Movya Wallet 🚀

**The AI-Powered Crypto Wallet That Makes Blockchain Simple**

Movya is a revolutionary cryptocurrency wallet that transforms complex blockchain interactions into natural conversations. Built on Avalanche with sponsored transactions and AI-powered assistance, it's crypto made as easy as texting.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Android-blue.svg)](https://expo.dev/)
[![Blockchain](https://img.shields.io/badge/Blockchain-Avalanche-red.svg)](https://www.avax.network/)

---

## 🎯 **What Makes Movya Different**

### **🤖 Conversational AI Interface**
- Natural language commands: *"Send 50 USDC to Sarah"* or *"What's my balance?"*
- Smart transaction interpretation and execution
- Contextual help and crypto education
- Multi-language support with consistent language handling

### **⛽ Zero-Friction Experience**
- **Sponsored Gas Fees** - We cover all transaction costs
- **Abstract Transactions** - No complex signing flows
- **Auto-Detection** - Incoming transactions detected automatically
- **Contact Management** - Send to friends by name, not addresses

### **🔐 Non-Custodial Security**
- Users control their private keys
- Device-level encryption (MMKV)
- Biometric authentication support
- Full on-chain transparency

---

## 🏗️ **Architecture Overview**

### **📱 Mobile Application (`/app`)**
React Native + Expo application with AI-powered conversational interface

```
app/
├── (app)/                 # Main authenticated app screens
│   ├── home/             # Portfolio dashboard & transaction history
│   ├── chat.tsx          # AI conversational interface
│   ├── settings.tsx      # User settings & security
│   ├── send/             # Send transactions
│   ├── receive/          # Receive crypto with QR codes
│   ├── swap/             # Token swapping interface
│   ├── contacts/         # Contact management
│   └── history/          # Transaction history
├── (auth)/               # Authentication flow
├── core/                 # Core wallet functionality
│   ├── services/         # Business logic services
│   ├── storage.ts        # Secure MMKV storage
│   └── walletActions/    # Blockchain interaction handlers
├── internal/             # Internal services
│   ├── walletService.ts  # Wallet creation & management
│   ├── contactService.ts # Contact management
│   └── faucetService.ts  # Testnet faucet integration
└── types/                # TypeScript definitions
```

### **🖥️ Backend Services (`/backend`)**
Node.js/TypeScript backend with AI agent and blockchain integration

```
backend/
├── cmd/                  # Application entry points
├── config/              # Configuration management
├── internal/            # Core business logic
│   ├── agent/          # AI conversational agent
│   ├── users/          # User management
│   ├── contacts/       # Contact services
│   ├── firestore/      # Database layer
│   ├── http/           # HTTP handlers
│   └── openrouter/     # AI model integration
├── types/              # Shared type definitions
└── utils/              # Utility functions
```

---

## 🚀 **Core Features**

### **💬 AI Conversational Interface**
- **Natural Language Processing**: Understand complex crypto requests
- **Smart Actions**: Execute multi-step blockchain operations
- **Educational Responses**: Learn about crypto while using it
- **Context Awareness**: Remember conversation history and user preferences

### **💰 Multi-Token Portfolio Management**
- **Real-Time Balances**: Live portfolio tracking across Avalanche
- **Token Support**: AVAX, WAVAX, USDC with automatic detection
- **Portfolio Analytics**: Track value changes and transaction history
- **Auto-Refresh**: Background monitoring with transaction detection

### **🔄 Advanced Transaction Features**
- **Contact-Based Sending**: Send to friends by name or email
- **Token Wrapping/Unwrapping**: AVAX ↔ WAVAX conversion
- **Smart Contract Swapping**: Automated token exchanges
- **Sponsored Transactions**: Zero gas fees for users

### **🔒 Enterprise-Grade Security**
- **Non-Custodial**: Private keys never leave user's device
- **Encrypted Storage**: MMKV with device-level encryption
- **Biometric Auth**: Face ID / Touch ID support
- **Backup & Recovery**: Secure private key export

---

## 🛠️ **Technology Stack**

### **Frontend**
- **Framework**: React Native + Expo SDK 52
- **Language**: TypeScript
- **State Management**: React Context + Hooks
- **Navigation**: Expo Router (file-based)
- **Blockchain**: Viem (Ethereum/Avalanche integration)
- **Storage**: MMKV (secure, fast key-value storage)
- **UI Components**: Custom themed components with video backgrounds

### **Backend**
- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js with custom routing
- **Database**: Google Firestore
- **AI Integration**: OpenRouter API for conversational AI
- **Authentication**: Google OAuth 2.0
- **Blockchain RPC**: Avalanche C-Chain integration

### **Blockchain Integration**
- **Network**: Avalanche C-Chain (Mainnet)
- **Testnet**: Avalanche Fuji for development
- **Wallet**: HD wallet generation with mnemonic support
- **Gas Sponsorship**: Backend-sponsored transaction execution
- **Smart Contracts**: ERC-20 token interaction (USDC, WAVAX)

---

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+ LTS
- Expo CLI: `npm install -g @expo/eas-cli`
- Android Studio (for Android development)
- Xcode (for iOS development)

### **Frontend Setup**

```bash
# Clone repository
git clone <repository-url>
cd movya-wallet

# Install dependencies
npm install

# Configure environment
cp app.json.example app.json
# Update Google OAuth credentials and backend URL

# Start development server
npx expo start --dev-client

# Or run on specific platform
npx expo run:android
npx expo run:ios
```

### **Backend Setup**

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Update API keys, database credentials, etc.

# Start development server
npm run dev

# Or build and run production
npm run build
npm start
```

### **Environment Configuration**

**Frontend (`app.json`):**
```json
{
  "expo": {
    "extra": {
      "googleOAuth": {
        "webClientId": "your-google-web-client-id"
      },
      "backendUrl": "https://your-backend-url.com"
    }
  }
}
```

**Backend (`.env`):**
```bash
PORT=8080
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FIRESTORE_PROJECT_ID=your-firestore-project
OPENROUTER_API_KEY=your-openrouter-key
AVALANCHE_RPC_URL=https://api.avax.network/ext/bc/C/rpc
```

---

## 📱 **Building for Production**

### **Mobile App (EAS Build)**

```bash
# Configure EAS
eas build:configure

# Build APK for testing
eas build --platform android --profile preview

# Build for app stores
eas build --platform all --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

### **Backend Deployment**

```bash
# Build Docker image
docker build -t movya-backend .

# Deploy to cloud provider
# (Google Cloud Run, AWS ECS, etc.)
```

---

## 🧪 **Development & Testing**

### **Running Tests**

```bash
# Frontend tests
npm test

# Backend tests
cd backend && npm test

# E2E tests
npm run test:e2e
```

### **Development Workflow**

1. **Feature Development**: Work on feature branches
2. **Testing**: Test on real devices for blockchain functionality
3. **Code Review**: All changes reviewed before merge
4. **Deployment**: Automated CI/CD pipeline

---

## 🔗 **Blockchain Integration**

### **Supported Networks**
- **Avalanche Mainnet** (Chain ID: 43114)
- **Avalanche Fuji Testnet** (Chain ID: 43113)

### **Supported Tokens**
- **AVAX**: Native Avalanche token
- **WAVAX**: Wrapped AVAX (ERC-20)
- **USDC**: USD Coin on Avalanche

### **Smart Contract Features**
- ERC-20 token transfers
- Token wrapping/unwrapping
- Balance querying
- Transaction history tracking

---

## 🤝 **Contributing**

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### **Development Setup**
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🔗 **Links**

- **Website**: [movya.ai](https://movya.ai)
- **Documentation**: [docs.movya.ai](https://docs.movya.ai)
- **Support**: [support@movya.ai](mailto:support@movya.ai)
- **Discord**: [discord.gg/movya](https://discord.gg/movya)

---

## ⚠️ **Disclaimer**

Movya is experimental software. While we've implemented extensive security measures, users should understand the risks involved in cryptocurrency transactions. Always verify transaction details and keep your private keys secure.

---

*Built with ❤️ by the Movya Team*
