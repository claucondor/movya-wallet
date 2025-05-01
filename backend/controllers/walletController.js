const walletService = require('../services/walletService');

// This controller is intended to be integrated into your authentication flow.
// For example, after successful login/signup, you call generateOrRetrieveWallet.

// Example standalone function (adapt to your auth flow):
const handleUserAuthentication = async (req, res, next) => {
    // *** Assume req.user.id is populated by preceding auth middleware ***
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
        const walletInfo = await walletService.generateOrRetrieveWallet(userId);

        // Attach wallet info to the response or handle as needed
        // If a new wallet was created, walletInfo will contain encryptedPk
        // You might want to return this only during the initial creation
        res.status(200).json({
            message: "Authentication successful.",
            wallet: walletInfo // Contains address and potentially encryptedPk
        });

    } catch (error) {
        console.error("Error during wallet check/generation:", error);
        res.status(500).json({ message: 'Error processing wallet information.', details: error.message });
    }
};

// If you need a separate endpoint (less ideal than integrating with auth)
const getOrCreateWallet = async (req, res) => {
    const userId = req.user?.id; // Assumes auth middleware populates req.user
    if (!userId) {
        return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
        const walletInfo = await walletService.generateOrRetrieveWallet(userId);
        res.status(200).json(walletInfo);
    } catch (error) {
        res.status(500).json({ message: 'Failed to get or create wallet', error: error.message });
    }
};


module.exports = {
    handleUserAuthentication, // Use this concept within your actual auth endpoint
    getOrCreateWallet // Example separate endpoint
}; 