const express = require('express');
const { handleAuthCallback } = require('./authHandler');

const router = express.Router();

// Define the authentication callback route
// This is the endpoint Expo Auth should redirect to.
router.get('/auth/callback', handleAuthCallback);

// You can add other routes here if needed

module.exports = router; 