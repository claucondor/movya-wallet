import { Firestore } from '@google-cloud/firestore';

// Initialize Firestore using Application Default Credentials (ADC)
// ADC will be automatically detected in Cloud Run environments
// Make sure the service account running the Cloud Run service has Firestore permissions.
const firestore = new Firestore();

// Collection name where credentials will be stored
const USER_CREDENTIALS_COLLECTION = 'user_credentials'; // Renamed for clarity
const USERS_COLLECTION = 'users'; // Collection for user data

/**
 * Saves user credentials to Firestore.
 * @param {string} userId - A unique identifier for the user.
 * @param {object} credentials - The credential object to save (e.g., tokens).
 * @returns {Promise<void>}
 */
async function saveCredentials(userId: string, credentials: any): Promise<void> {
  try {
    const docRef = firestore.collection(USER_CREDENTIALS_COLLECTION).doc(userId);
    await docRef.set(credentials, { merge: true }); // Use merge: true to update existing docs
    console.log(`Credentials saved for user: ${userId}`);
  } catch (error: any) {
    console.error('Error saving credentials to Firestore:', error);
    throw new Error('Failed to save credentials'); // Propagate error for handling
  }
}

/**
 * Retrieves user data from Firestore.
 * @param {string} userId - The unique ID of the user.
 * @returns {Promise<object|null>} - User data object or null if not found.
 */
const getUserData = async (userId: string): Promise<any | null> => {
    try {
        const userDoc = await firestore.collection(USERS_COLLECTION).doc(userId).get();
        if (!userDoc.exists) {
            return null;
        }
        return userDoc.data();
    } catch (error: any) {
        console.error("Error getting user data:", error);
        throw new Error("Could not retrieve user data.");
    }
};

/**
 * Updates user data in Firestore.
 * @param {string} userId - The unique ID of the user.
 * @param {object} data - Data to update or set.
 * @returns {Promise<void>}
 */
const updateUserData = async (userId: string, data: any): Promise<void> => {
    try {
        // Use set with merge: true to update or create if not exists
        await firestore.collection(USERS_COLLECTION).doc(userId).set(data, { merge: true });
    } catch (error: any) {
        console.error("Error updating user data:", error);
        throw new Error("Could not update user data.");
    }
};

export { getUserData, saveCredentials, updateUserData };

