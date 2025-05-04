import axios from 'axios';
import { Request, Response } from 'express';
import { saveCredentials } from '../firestore';

// Your Expo app scheme (from app.json)
const APP_SCHEME: string = 'exp';
// Google OAuth Config - Read from environment variables for security
const GOOGLE_CLIENT_ID: string | undefined = process.env.GOOGLE_CLIENT_ID; // Your Web Client ID
const GOOGLE_CLIENT_SECRET: string | undefined = process.env.GOOGLE_CLIENT_SECRET; // Your Web Client Secret
const BACKEND_CALLBACK_URL: string | undefined = process.env.BACKEND_CALLBACK_URL; // Your backend callback URL

const GOOGLE_TOKEN_ENDPOINT: string = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_ENDPOINT: string = 'https://www.googleapis.com/oauth2/v3/userinfo';

/**
 * Handles the Google authentication callback.
 * - Extracts the authorization code.
 * - Exchanges the code for tokens with Google.
 * - Fetches user info from Google.
 * - Saves tokens/user info to Firestore.
 * - Redirects back to the Expo app using a deep link.
 */
async function handleAuthCallback(req: Request, res: Response) {
  const { code, error } = req.query;

  if (error) {
    console.error('Error received from Google callback:', error);
    // Redirect to an error screen in the app
    const errorDeepLink = `${APP_SCHEME}://auth-error?message=${encodeURIComponent('Google authentication failed: ' + error)}`;
    return res.redirect(302, errorDeepLink);
  }

  if (!code || typeof code !== 'string') {
    console.error('No authorization code received from Google or invalid type.');
    const errorDeepLink = `${APP_SCHEME}://auth-error?message=${encodeURIComponent('Missing or invalid authorization code from Google.')}`;
    return res.redirect(302, errorDeepLink);
  }

  // Check if required environment variables are set
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !BACKEND_CALLBACK_URL) {
    console.error('Missing required Google OAuth environment variables (CLIENT_ID, CLIENT_SECRET, BACKEND_CALLBACK_URL).');
    return res.status(500).send('Server configuration err3or.');
  }

  try {
    // --- 1. Exchange Authorization Code for Tokens ---
    console.log('Exchanging authorization code for tokens...');
    const tokenResponse = await axios.post(GOOGLE_TOKEN_ENDPOINT, null, {
      params: {
        code: code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: BACKEND_CALLBACK_URL,
        grant_type: 'authorization_code',
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    // Log the entire token response for debugging
    console.log('Full token response from Google:', JSON.stringify(tokenResponse.data, null, 2));

    const { access_token, refresh_token, id_token } = tokenResponse.data as { access_token: string, refresh_token?: string, id_token?: string };

    if (!access_token) {
      throw new Error('Did not receive access_token from Google.');
    }

    console.log('Tokens received successfully.');

    // --- 2. Fetch User Info from Google ---
    console.log('Fetching user info from Google...');
    const userInfoResponse = await axios.get(GOOGLE_USERINFO_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const userInfo = userInfoResponse.data as { sub: string, email: string, name?: string, picture?: string };
    const userId = userInfo.sub; // Google's unique user ID
    const userEmail = userInfo.email;

    if (!userId) {
      throw new Error('Could not get Google User ID (sub) from userinfo endpoint.');
    }
    console.log(`User Info received: ID=${userId}, Email=${userEmail}`);

    // --- 3. Prepare and Save Credentials to Firestore ---
    const credentialsToSave: any = { // Use a more specific type later when firestoreService is typed
      accessToken: access_token,
      idToken: id_token,           // Store ID token if needed
      googleUserId: userId,
      email: userEmail,
      lastUpdated: new Date(),
      // Add any other relevant data from userInfo (name, picture, etc.)
      name: userInfo.name,
      picture: userInfo.picture,
    };

    // **Only add refreshToken if it exists**
    if (refresh_token) {
      credentialsToSave.refreshToken = refresh_token;
      console.log('Refresh token received, adding to save data.');
    } else {
      console.log('Warning: No refresh token received from Google. This may cause Firestore save errors.');
      // To handle undefined properties, you could enable ignoreUndefinedProperties in Firestore setup
      // If not already configured, consider adding it in your Firestore initialization elsewhere.
    }

    console.log(`Saving credentials for user ID: ${userId}`);
    await saveCredentials(userId, credentialsToSave); // Use Google User ID as the Firestore document ID

    // --- 4. Build Deep Link and Redirect ---
    const deepLinkUrl = `${APP_SCHEME}://auth-success?userId=${encodeURIComponent(userId)}`;
    console.log(`Redirecting to deep link: ${deepLinkUrl}`);
    res.redirect(302, deepLinkUrl);

  } catch (err: any) {
    console.error('Error during Google auth callback processing:', err.response ? err.response.data : err.message);
    // Redirect to an error screen in the app
    const errorMessage = err.response?.data?.error_description || err.message || 'Failed to process Google login.';
    const errorDeepLink = `${APP_SCHEME}://auth-error?message=${encodeURIComponent(errorMessage)}`;
    res.redirect(302, errorDeepLink);
  }
}

export { handleAuthCallback };

