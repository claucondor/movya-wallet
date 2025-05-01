const CryptoJS = require("crypto-js");
require('dotenv').config(); // Load environment variables

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
    console.error("Error: ENCRYPTION_KEY is not defined in the environment variables.");
    // Potentially exit or throw an error in a real application
    // process.exit(1);
}

const encryptData = (data) => {
    if (!ENCRYPTION_KEY) {
        throw new Error("Encryption key is missing.");
    }
    return CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
};

const decryptData = (ciphertext) => {
    if (!ENCRYPTION_KEY) {
        throw new Error("Encryption key is missing.");
    }
    const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
};

module.exports = {
    encryptData,
    decryptData,
}; 