import express, { NextFunction, Request, Response } from 'express';
import { handleAuthCallback } from './authHandler'; // Assuming authHandler will be migrated and export handleAuthCallback

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

// --- Default/Health Check Route (already in server.js, but can be here too) ---
routes.get('/', (req: Request, res: Response) => {
  res.status(200).send('Backend API is running.');
});

export { routes };
