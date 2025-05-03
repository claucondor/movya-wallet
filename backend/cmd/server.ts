import { routes } from '@internal';
import type { ApiResponse } from '@types';
import { handleError } from '@utils';
import express from 'express';

const app = express();

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