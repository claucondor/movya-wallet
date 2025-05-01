const { Firestore } = require('@google-cloud/firestore');

// Initialize Firestore using Application Default Credentials (ADC)
// ADC will be automatically detected in Cloud Run environments
// Make sure the service account running the Cloud Run service has Firestore permissions.
const firestore = new Firestore();

// Collection name where credentials will be stored
const COLLECTION_NAME = 'user_credentials'; // You can change this if needed

/**
 * Saves user credentials to Firestore.
 * @param {string} userId - A unique identifier for the user.
 * @param {object} credentials - The credential object to save (e.g., tokens).
 * @returns {Promise<void>}
 */
async function saveCredentials(userId, credentials) {
  try {
    const docRef = firestore.collection(COLLECTION_NAME).doc(userId);
    await docRef.set(credentials, { merge: true }); // Use merge: true to update existing docs
    console.log(`Credentials saved for user: ${userId}`);
  } catch (error) {
    console.error('Error saving credentials to Firestore:', error);
    throw new Error('Failed to save credentials'); // Propagate error for handling
  }
}

module.exports = {
  saveCredentials,
}; 