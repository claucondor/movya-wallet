const { Firestore } = require('@google-cloud/firestore');

// Initialize Firestore
// Make sure your Google Cloud credentials are set up correctly
// (e.g., GOOGLE_APPLICATION_CREDENTIALS environment variable)
const firestore = new Firestore();

// Example: Assuming a 'users' collection where each document ID is the user's unique ID
const usersCollection = firestore.collection('users');

/**
 * Retrieves user data from Firestore.
 * @param {string} userId - The unique ID of the user.
 * @returns {Promise<object|null>} - User data object or null if not found.
 */
const getUserData = async (userId) => {
    try {
        const userDoc = await usersCollection.doc(userId).get();
        if (!userDoc.exists) {
            return null;
        }
        return userDoc.data();
    } catch (error) {
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
const updateUserData = async (userId, data) => {
    try {
        // Use set with merge: true to update or create if not exists
        await usersCollection.doc(userId).set(data, { merge: true });
    } catch (error) {
        console.error("Error updating user data:", error);
        throw new Error("Could not update user data.");
    }
};

module.exports = {
    getUserData,
    updateUserData,
    // Add other Firestore interaction functions as needed
}; 