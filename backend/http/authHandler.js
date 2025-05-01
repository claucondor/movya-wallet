const { saveCredentials } = require('../internal/firestoreService');

// Your Expo app scheme (from app.json)
const APP_SCHEME = 'exp';

/**
 * Handles the authentication callback.
 * - Extracts necessary information (this might need adjustment based on your auth provider).
 * - Saves credentials to Firestore.
 * - Redirects back to the Expo app using a deep link.
 */
async function handleAuthCallback(req, res) {
  try {
    // --- 1. Extract Authentication Data ---
    // IMPORTANT: Adjust this section based on how your auth provider sends data.
    // This is a placeholder example assuming data is in query parameters.
    const { code, state, userId, accessToken, refreshToken } = req.query;

    // Basic validation (example)
    if (!userId || !accessToken) {
      return res.status(400).send('Missing required authentication information.');
    }

    // Prepare credentials object
    const credentials = {
      accessToken,
      refreshToken, // Store refresh token securely if applicable
      // Add any other relevant data you receive
      lastUpdated: new Date(),
    };

    // --- 2. Save Credentials to Firestore ---
    // We use `userId` as the document ID in Firestore
    await saveCredentials(userId, credentials);

    // --- 3. Build Deep Link and Redirect ---
    // Construct the deep link URL. You might want to add parameters
    // to indicate success or pass some minimal non-sensitive info.
    // Example: exp://auth-success?userId=someId
    const deepLinkUrl = `${APP_SCHEME}://auth-success?userId=${encodeURIComponent(userId)}`; // Modify path and params as needed

    console.log(`Redirecting to deep link: ${deepLinkUrl}`);
    // Perform the redirect
    res.redirect(302, deepLinkUrl);

  } catch (error) {
    console.error('Error during auth callback:', error);
    // Optional: Redirect to an error screen in your app
    // const errorDeepLink = `${APP_SCHEME}://auth-error?message=${encodeURIComponent(error.message)}`;
    // res.redirect(302, errorDeepLink);
    res.status(500).send('Authentication processing failed.');
  }
}

module.exports = {
  handleAuthCallback,
}; 