import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { routes } from '../internal';
import type { ApiResponse } from '../types';
import { handleError } from '../utils';

const app = express();

// CORS configuration - Allow requests from frontend origins
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://localhost:5173',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:5173',
    // WSL network IPs
    'http://10.255.255.254:8080',
    'http://172.17.187.149:8080',
    // Allow any localhost/IP with common dev ports
    /^http:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|172\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+):\d+$/,
    // Production frontend URLs (Vercel)
    'https://go-pay-wallet.vercel.app',
    /^https:\/\/go-pay-wallet.*\.vercel\.app$/,  // Preview deployments
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware (optional, add as needed)
app.use(express.json()); // Habilitamos el parsing de JSON por defecto

// Use the defined routes
app.use('/', routes);

// Basic health check endpoint (optional but good practice)
app.get('/health', (req, res) => {
  const response: ApiResponse = {
    success: true,
    data: 'OK'
  };
  res.status(200).json(response);
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  const response: ApiResponse = {
    success: false,
    error: handleError(err)
  };
  res.status(500).json(response);
});

// Start the server
// Listen on the port specified by Cloud Run or default to 8080
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
}); 