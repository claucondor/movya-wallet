import express, { NextFunction, Request, Response } from 'express';
import { chatWithAgent } from './agentController';
import { handleAuthCallback } from './authHandler'; // Assuming authHandler will be migrated and export handleAuthCallback
import {
    addContactByAddressHandler,
    addContactByEmailHandler,
    deleteContactHandler,
    getContactByNicknameHandler,
    getContactsHandler,
    updateContactHandler
} from './contactHandler';
import { faucetHandler } from './faucetHandler';
import { reportAgentResult } from './resultController'; // Import the new controller
import { reportEnrichedAgentResult } from './enrichedResultController'; // Import enriched controller
import {
    getWalletAddressHandler,
    saveWalletAddressHandler
} from './walletHandler';
import { generateWalletHandler } from './walletGeneratorHandler';
import {
    checkWalletAddressHandler,
    getUserByAddressHandler,
    getUserProfileHandler
} from './userHandler';

const routes = express.Router();

// Define the authentication callback route
// This is the endpoint Expo Auth should redirect to.
routes.get('/auth/callback', handleAuthCallback as any); // Use as any for now until authHandler is typed

// You can add other routes here if needed

// --- Import Controllers ---
// Assume you have an auth controller or logic somewhere
// import authController from '../controllers/authController'; 

// --- Middleware (Placeholder) ---
// Implement your actual authentication middleware (e.g., JWT verification)
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Placeholder: Simulate authenticated user
    // In reality, verify token and attach user info (e.g., req.user = { id: 'user123' };)
    console.log("Auth Middleware: Skipping actual auth for now."); 
    // Example: Simulate attaching user ID. Replace with real logic.
    // req.user = { id: 'some_user_id_from_token' }; 
    // if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    next();
};

// --- Routes ---

// Authentication (Example - Adapt to your existing auth flow)

// Wallet (Separate endpoint - less ideal, use integration above if possible)

// Transactions
// Requires authentication to ensure only the owner can initiate
// router.post('/send-transaction', authMiddleware, express.json(), transactionController.sendTransaction); // Need express.json() for body parsing

// Balances
// Address in path parameter. Auth middleware to ensure user is allowed to query.
// router.get('/balance/native/:address', authMiddleware, balanceController.getNativeBalance);
// router.get('/balance/token/:userAddress/:tokenAddress', authMiddleware, balanceController.getTokenBalance);

// AI Agent routes
routes.post('/agent/chat', 
    express.json(),          // Parse JSON body
    chatWithAgent            // Handle the chat request
);

// AI Agent Result Reporting Endpoint
routes.post('/agent/report_result', 
    authMiddleware,          // Require authentication
    express.json(),         // Parse JSON body
    reportAgentResult        // Handle the result report
);

// AI Agent Enriched Result Reporting Endpoint
routes.post('/agent/report_enriched_result', 
    authMiddleware,          // Require authentication
    express.json(),         // Parse JSON body
    reportEnrichedAgentResult // Handle enriched result report
);

// Utility function to wrap async route handlers
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void | Response>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Ruta de faucet
routes.post('/faucet', asyncHandler(faucetHandler));

// Rutas de wallet
routes.post('/wallet/generate',
  express.json(),          // Parse JSON body
  asyncHandler(generateWalletHandler)    // Generar nueva wallet (mnemonic, privateKey, addresses)
);

routes.post('/wallet/address',
  express.json(),          // Parse JSON body
  asyncHandler(saveWalletAddressHandler) // Guardar dirección de wallet
);

routes.get('/wallet/address/:userId',
  asyncHandler(getWalletAddressHandler)  // Obtener dirección de wallet
);

// Rutas de contactos
routes.post('/contacts/address', 
  authMiddleware,
  express.json(),
  asyncHandler(addContactByAddressHandler)
);

routes.post('/contacts/email', 
  authMiddleware,
  express.json(),
  asyncHandler(addContactByEmailHandler)
);

routes.get('/contacts/:userId',
  authMiddleware,
  asyncHandler(getContactsHandler)
);

routes.get('/contacts/nickname/:nickname', 
  authMiddleware,
  asyncHandler(getContactByNicknameHandler)
);

routes.delete('/contacts/:contactId', 
  authMiddleware,
  asyncHandler(deleteContactHandler)
);

routes.put('/contacts/:contactId', 
  authMiddleware,
  express.json(),
  asyncHandler(updateContactHandler)
);

// Rutas de usuarios
routes.get('/users/check-address/:address', 
  asyncHandler(checkWalletAddressHandler)  // Check if address belongs to app user
);

routes.get('/users/by-address/:address', 
  authMiddleware,
  asyncHandler(getUserByAddressHandler)     // Get user details by address (requires auth)
);

routes.get('/users/profile/:userId', 
  authMiddleware,
  asyncHandler(getUserProfileHandler)       // Get user profile by user ID (requires auth)
);

// --- Default/Health Check Route (already in server.js, but can be here too) ---
routes.get('/', (req: Request, res: Response) => {
  res.status(200).send('Backend API is running.');
});

export { routes };

