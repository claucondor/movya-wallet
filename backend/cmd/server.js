const express = require('express');
const routes = require('../http/routes'); // Import the routes

const app = express();

// Middleware (optional, add as needed)
// app.use(express.json()); // If you need to parse JSON bodies

// Use the defined routes
app.use('/', routes);

// Basic health check endpoint (optional but good practice)
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Start the server
// Listen on the port specified by Cloud Run or default to 8080
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
}); 