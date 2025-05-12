# Movya Wallet 👛

Movya Wallet is a modern and secure cryptocurrency wallet mobile application, built with React Native and Expo. It allows users to manage their digital assets, interact with contacts, and more.

---

## ✨ Key Features

*   🔐 **Secure Wallet Management:**
    *   Secure generation and storage of private keys using MMKV.
    *   Loading of existing wallets.
*   👤 **User Authentication:**
    *   Login with Google OAuth, integrated with a backend service for a robust authentication flow.
    *   User ID management linked to the wallet.
*   👥 **Contact Management:**
    *   Add, view, and delete contacts (with nicknames and address/email).
    *   Contacts linked to the user ID.
*   📥 **Receive Cryptocurrencies (AVAX):**
    *   Clear display of the wallet address.
    *   QR code generation for easy address sharing.
    *   Functions to copy and share the address.
*   📱 **Modern User Interface:**
    *   Themed components (light/dark mode).
    *   Use of background videos and gradients for an attractive visual experience.
    *   Subtle animations to enhance interaction.
*   🧭 **Intuitive Navigation:**
    *   File-system-based routing with Expo Router.
    *   Separate navigation flows for authentication and the main application.

---

## 🚀 Technologies Used

### Frontend (📱 Movya Wallet App)

*   **Framework:** React Native with Expo (💙)
*   **Language:** TypeScript (🔷)
*   **Navigation:** Expo Router (📁➡️)
*   **Secure Storage:** MMKV (🔒)
*   **Blockchain Interaction (Basic):** Viem (for account generation from private key) (🔗)
*   **QR Codes:** `react-native-qrcode-svg` (📊)
*   **Clipboard:** `@react-native-clipboard/clipboard` (📋)
*   **Multimedia:** `expo-av` (for background videos) (🎬), `expo-linear-gradient` (for gradients) (🎨)
*   **UI Components:** Custom themed components.
*   **Context API:** For global state management (Theme, Authentication).

### Backend (⚙️ Support Service)

*(User can complete this section with more detail based on their specific implementation)*

*   **Platform:** (e.g., Node.js with Express.js, Python with Flask/Django, Go, etc.)
*   **OAuth Authentication:** Integration with Google Sign-In.
*   **Database:** (e.g., Firestore, PostgreSQL, MongoDB, etc., for storing users, contacts)
*   **Cloud Provider (for authentication callback):** Google Cloud Functions (e.g., `https://auth-callback-backend-466947410626.us-central1.run.app/auth/callback`)

---

## 📂 Project Structure (Simplified)

```
movya-wallet/
├── app/                   # Expo frontend application source code
│   ├── (app)/             # Screens and logic post-authentication
│   │   ├── contacts/
│   │   ├── deposit/
│   │   ├── receive/
│   │   ├── send/
│   │   ├── swap/
│   │   ├── wallet.tsx
│   │   └── _layout.tsx      # Main (hidden) tabs layout
│   ├── (auth)/            # Authentication screens and logic
│   │   ├── login.tsx
│   │   └── _layout.tsx      # Authentication stack layout
│   ├── assets/            # Images, fonts, videos
│   ├── components/        # Reusable UI components (ThemedText, IconSymbol, etc.)
│   ├── constants/         # Constants (colors, etc.)
│   ├── core/              # Core logic (MMKV storage, etc.)
│   ├── hooks/             # Custom hooks (useColorScheme, ThemeContext)
│   ├── internal/          # Services (walletService, contactService)
│   ├── types/             # TypeScript definitions
│   ├── _layout.tsx        # Root application layout (AuthProvider handling, etc.)
│   └── index.tsx          # Initial app entry point (mainly for redirection)
├── backend/               # Backend service source code
│   ├── cmd/
│   ├── config/
│   ├── internal/
│   └── ...
├── .gitignore
├── app.json               # Expo configuration
├── eas.json               # Expo Application Services configuration
├── package.json           # Frontend dependencies and scripts
├── README.md              # This file!
└── tsconfig.json          # TypeScript configuration
```

---

## 🛠️ Getting Started (Setup)

### Prerequisites

*   Node.js (v18 LTS or higher recommended)
*   npm or yarn
*   Expo CLI: `npm install -g expo-cli`
*   Git
*   Development environment for Android (Android Studio).

### Frontend Setup

1.  **Clone the repository:**
    ```bash
    git clone <REPOSITORY_URL>
    cd movya-wallet
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
3.  **Configure environment variables/constants:**
    *   Ensure the `GOOGLE_WEB_CLIENT_ID` (and any other necessary OAuth client IDs) are configured in `app.json` under the `extra` section. Example:
        ```json
        // app.json
        {
          "expo": {
            // ... other configurations
            "extra": {
              "googleOAuth": {
                "webClientId": "YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com"
              },
              "eas": {
                "projectId": "YOUR_EAS_PROJECT_ID"
              }
            }
            // ...
          }
        }
        ```
    *   Ensure your backend callback URL (`BACKEND_CALLBACK_URL` in `app/_layout.tsx`) is correctly pointing to your deployed backend endpoint.
    *   Set up the necessary deep link scheme for your app (e.g., `movyawallet://`) in your backend's redirect logic and potentially in `app.json` under the `scheme` property if not already configured.

4.  **Run the application (Android):**
    *   **On a physical Android device (recommended for full feature testing like OAuth):**
        ```bash
        npx expo start --dev-client
        ```
        Then scan the QR code with the Expo Go app (if using development builds) or your custom development client.
    *   **On an Android emulator:**
        ```bash
        npx expo run:android
        ```
    *   **For web (limited functionality for native modules, primarily for UI testing):**
        ```bash
        npx expo start --web
        ```

### Backend Setup

*(Provide instructions specific to your backend technology)*

1.  Navigate to the `backend/` directory.
2.  Install dependencies (e.g., `npm install` if Node.js).
3.  Configure environment variables (API keys, database URIs, Google OAuth credentials for the backend).
4.  Run the backend server (e.g., `npm run dev` or `go run cmd/server/main.go`).

---

## 📜 Scripts

Available scripts in the root `package.json` (frontend):

*   `npm start` or `yarn start`: Starts the Metro bundler.
*   `npm run android` or `yarn android`: Runs the app on an Android emulator/device.
*   `npm run web` or `yarn web`: Runs the app in a web browser.

*(Add any other relevant scripts for frontend or backend)*

---

_README generated with assistance from an AI pair programmer._
