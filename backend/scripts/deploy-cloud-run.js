const dotenv = require('dotenv');
const path = require('path');
const { execSync } = require('child_process');

// Load environment variables from .env file in the parent directory (backend/)
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

// --- Configuration (Read from environment or keep defaults) ---
const projectId = process.env.PROJECT_ID || 'sigma-cortex-478101-f9'; // Or read from .env if you add it
const region = process.env.REGION || 'us-central1'; // Or read from .env if you add it
const serviceName = process.env.SERVICE_NAME || 'movya-wallet-backend'; // Or read from .env
const imageName = process.env.IMAGE_NAME || `gcr.io/${projectId}/movya-backend:latest`; // Or read from .env

// --- Read required variables from loaded .env ---
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const backendCallbackUrl = process.env.BACKEND_CALLBACK_URL;

// --- Validate required variables ---
if (!googleClientId || !googleClientSecret || !backendCallbackUrl) {
  console.error('Error: Missing required environment variables in .env file.');
  console.error('Please ensure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and BACKEND_CALLBACK_URL are set.');
  process.exit(1); // Exit with error code
}

// --- Format variables for gcloud command ---
// Basic formatting, assumes values don't contain commas or quotes needing complex escaping
const envVarsString = [
  `GOOGLE_CLIENT_ID=${googleClientId}`,
  `GOOGLE_CLIENT_SECRET=${googleClientSecret}`,
  `BACKEND_CALLBACK_URL=${backendCallbackUrl}`,
  // Add any other env vars needed by your backend here
].join(',');

// --- Construct the gcloud command ---
// Using parameters from above, adjust memory, cpu, timeout as needed
const gcloudCommand = `gcloud run deploy ${serviceName}` +
                      ` --image ${imageName}` +
                      ` --project ${projectId}` +
                      ` --region ${region}` +
                      ` --platform managed` +
                      ` --allow-unauthenticated` +
                      ` --port 8080` +
                      ` --memory 256Mi` +
                      ` --cpu 1` +
                      ` --timeout 300s` +
                      // Use the formatted string, ensuring quotes handle potential spaces/specials in values (though unlikely here)
                      ` --set-env-vars "${envVarsString}"`;

// --- Execute the command ---
console.log(`Executing deployment command for service: ${serviceName}`);
console.log(gcloudCommand);

try {
  // Execute synchronously and inherit stdio to see output/errors directly
  execSync(gcloudCommand, { stdio: 'inherit' });
  console.log(`\nDeployment of ${serviceName} initiated successfully.`);
} catch (error) {
  console.error(`\nError deploying service ${serviceName}:`, error.message);
  process.exit(1); // Exit with error code
} 