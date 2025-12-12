import { Firestore } from '@google-cloud/firestore';

// Initialize Firestore using Application Default Credentials (ADC)
// ADC will be automatically detected in Cloud Run environments
// Make sure the service account running the Cloud Run service has Firestore permissions.
const firestore = new Firestore();

// Collection name where credentials will be stored
const USER_CREDENTIALS_COLLECTION = 'user_credentials'; // Renamed for clarity
const USERS_COLLECTION = 'users'; // Collection for user data

/**
 * Generic Firestore Service for CRUD operations
 */
class FirestoreService {
  /**
   * Get a document from a specific collection
   * @param collection - Collection name
   * @param documentId - Document ID
   * @returns Document data or null
   */
  static async getDocument<T>(collection: string, documentId: string): Promise<T | null> {
    try {
      const docRef = firestore.collection(collection).doc(documentId);
      const doc = await docRef.get();
      return doc.exists ? doc.data() as T : null;
    } catch (error) {
      console.error(`Error getting document from ${collection}:`, error);
      throw new Error(`Could not retrieve document from ${collection}`);
    }
  }

  /**
   * Create or update a document in a specific collection
   * @param collection - Collection name
   * @param documentId - Document ID
   * @param data - Document data
   * @param options - Firestore set options
   */
  static async setDocument(
    collection: string, 
    documentId: string, 
    data: any, 
    options: { merge?: boolean } = { merge: true }
  ): Promise<void> {
    try {
      const docRef = firestore.collection(collection).doc(documentId);
      await docRef.set(data, options);
    } catch (error) {
      console.error(`Error setting document in ${collection}:`, error);
      throw new Error(`Could not set document in ${collection}`);
    }
  }

  /**
   * Add a document to a specific collection with an auto-generated ID
   * @param collection - Collection name
   * @param data - Document data
   * @returns The ID of the newly created document
   */
  static async addDocument(
    collection: string, 
    data: any
  ): Promise<string> {
    try {
      const docRef = await firestore.collection(collection).add(data);
      return docRef.id;
    } catch (error) {
      console.error(`Error adding document to ${collection}:`, error);
      throw new Error(`Could not add document to ${collection}`);
    }
  }

  /**
   * Update specific fields of a document
   * @param collection - Collection name
   * @param documentId - Document ID
   * @param data - Fields to update
   */
  static async updateDocument(
    collection: string, 
    documentId: string, 
    data: any
  ): Promise<void> {
    try {
      const docRef = firestore.collection(collection).doc(documentId);
      await docRef.update(data);
    } catch (error) {
      console.error(`Error updating document in ${collection}:`, error);
      throw new Error(`Could not update document in ${collection}`);
    }
  }

  /**
   * Delete a document from a collection
   * @param collection - Collection name
   * @param documentId - Document ID
   */
  static async deleteDocument(
    collection: string, 
    documentId: string
  ): Promise<void> {
    try {
      const docRef = firestore.collection(collection).doc(documentId);
      await docRef.delete();
    } catch (error) {
      console.error(`Error deleting document from ${collection}:`, error);
      throw new Error(`Could not delete document from ${collection}`);
    }
  }

  /**
   * Query documents in a collection
   * @param collection - Collection name
   * @param queryFn - Function to apply query
   * @returns Array of documents
   */
  static async queryDocuments<T>(
    collection: string,
    queryFn: (ref: FirebaseFirestore.CollectionReference) => FirebaseFirestore.Query
  ): Promise<T[]> {
    try {
      const collectionRef = firestore.collection(collection);
      const query = queryFn(collectionRef);
      const snapshot = await query.get();
      // Include the document ID in the returned data
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    } catch (error) {
      console.error(`Error querying documents in ${collection}:`, error);
      throw new Error(`Could not query documents in ${collection}`);
    }
  }
}

export default FirestoreService;
export const { 
  getDocument, 
  setDocument, 
  addDocument,
  updateDocument, 
  deleteDocument, 
  queryDocuments 
} = FirestoreService;

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

