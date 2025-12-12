import axios from 'axios';
import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import UserService from '../users/userService';

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
    return res.status(500).send('Server configuration error.');
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

    const { access_token, refresh_token, id_token } = tokenResponse.data as { access_token: string, refresh_token?: string, id_token?: string };

    if (!access_token) {
      throw new Error('Did not receive access_token from Google.');
    }

    // --- 2. Fetch User Info from Google ---
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

    // --- 3. Save Credentials and User Profile ---
    const credentialsToSave = {
      accessToken: access_token,
      idToken: id_token,
      googleUserId: userId,
      email: userEmail,
      ...(refresh_token ? { refreshToken: refresh_token } : {})
    };

    // Save credentials
    await UserService.saveCredentials(userId, credentialsToSave);

    // Upsert user profile
    await UserService.upsertUserProfile(userId, {
      email: userEmail,
      name: userInfo.name,
      googleUserId: userId,
      // Optionally add other profile info
      picture: userInfo.picture
    });

    // --- 4. Build Deep Link and Redirect ---
    const deepLinkUrl = `${APP_SCHEME}://auth-success?userId=${encodeURIComponent(userId)}`;
    res.redirect(302, deepLinkUrl);

  } catch (err: any) {
    console.error('Error during Google auth callback processing:', err.response ? err.response.data : err.message);
    // Redirect to an error screen in the app
    const errorMessage = err.response?.data?.error_description || err.message || 'Failed to process Google login.';
    const errorDeepLink = `${APP_SCHEME}://auth-error?message=${encodeURIComponent(errorMessage)}`;
    res.redirect(302, errorDeepLink);
  }
}

/**
 * Handles Google authentication from web frontend (SPA).
 * - Receives ID token from Google Sign-In popup
 * - Validates the token with Google
 * - Creates/updates user in Firestore
 * - Returns user data and wallet address
 */
async function handleGoogleAuth(req: Request, res: Response) {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({
      success: false,
      error: 'Missing idToken in request body'
    });
  }

  if (!GOOGLE_CLIENT_ID) {
    console.error('Missing GOOGLE_CLIENT_ID environment variable.');
    return res.status(500).json({
      success: false,
      error: 'Server configuration error'
    });
  }

  try {
    // Verify the ID token with Google
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Invalid token payload');
    }

    const userId = payload.sub; // Google's unique user ID
    const userEmail = payload.email;
    const userName = payload.name;
    const userPicture = payload.picture;

    if (!userId || !userEmail) {
      throw new Error('Could not get user info from token');
    }

    console.log(`[handleGoogleAuth] Authenticated user: ${userEmail} (${userId})`);

    // Save credentials (using idToken as accessToken since we don't have a separate one in this flow)
    const credentialsToSave = {
      accessToken: idToken, // Required by UserCredentials interface
      idToken: idToken,
      googleUserId: userId,
      email: userEmail,
    };
    await UserService.saveCredentials(userId, credentialsToSave);

    // Upsert user profile
    await UserService.upsertUserProfile(userId, {
      email: userEmail,
      name: userName,
      googleUserId: userId,
      picture: userPicture
    });

    // Get wallet address if exists
    let walletAddress = null;
    try {
      const walletData = await UserService.getWalletAddress(userId);
      walletAddress = walletData?.address || null;
    } catch (e) {
      // Wallet may not exist yet, that's ok
      console.log(`[handleGoogleAuth] No wallet found for user ${userId}`);
    }

    // Return success response
    return res.status(200).json({
      success: true,
      data: {
        userId: userId,
        email: userEmail,
        name: userName,
        picture: userPicture,
        walletAddress: walletAddress,
        userToken: idToken // Can be used for subsequent authenticated requests
      }
    });

  } catch (err: any) {
    console.error('[handleGoogleAuth] Error:', err.message);
    return res.status(401).json({
      success: false,
      error: err.message || 'Failed to authenticate with Google'
    });
  }
}

export { handleAuthCallback, handleGoogleAuth };

