const { ethers } = require("ethers");
const { encryptData } = require("../utils/encryption");
const { getUserData, updateUserData } = require("./firestoreService");

/**
 * Checks if a wallet exists for the user, generates one if not,
 * stores the address in Firestore, and returns the address and encrypted PK.
 * Assumes userId is available (e.g., from auth middleware).
 *
 * @param {string} userId - The unique ID of the user.
 * @returns {Promise<{address: string, encryptedPk: string}|{address: string}>} - Wallet details.
 */
const generateOrRetrieveWallet = async (userId) => {
    if (!userId) {
        throw new Error("User ID is required.");
    }

    const userData = await getUserData(userId);
    const existingAddress = userData?.walletAddress; // Use optional chaining

    if (existingAddress) {
        console.log(`Wallet already exists for user ${userId}: ${existingAddress}`);
        // Return only the address if it already exists
        return { address: existingAddress };
    }

    console.log(`Generating new wallet for user ${userId}...`);
    // Generate a new wallet
    const wallet = ethers.Wallet.createRandom();
    const address = wallet.address;
    const privateKey = wallet.privateKey;

    // Encrypt the private key before sending it
    const encryptedPk = encryptData(privateKey);

    // Store the public address in Firestore (as the flag)
    await updateUserData(userId, { walletAddress: address });

    console.log(`New wallet generated for user ${userId}: ${address}`);

    // Return address and the *encrypted* private key
    return {
        address: address,
        encryptedPk: encryptedPk // Send encrypted PK only on creation
    };
};

module.exports = {
    generateOrRetrieveWallet,
}; 