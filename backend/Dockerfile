# Use an official Node.js runtime as a parent image (Long Term Support version is recommended)
# Using alpine for a smaller image size
FROM node:lts-alpine as builder

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install ALL dependencies (including devDependencies for TypeScript compilation)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build TypeScript code
RUN npm run build

# --- Second Stage: Runtime ---
# Use a minimal Node.js image for the final stage
FROM node:lts-alpine

WORKDIR /usr/src/app

# Copy only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled JavaScript from builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Copy .env file
COPY .env ./

# Expose the port the app runs on (should match the one in cmd/server.js)
EXPOSE 8080

# Run the compiled application
CMD [ "node", "dist/cmd/server.js" ]

# Optional: Run as a non-root user for security
# USER node
# Note: If you uncomment USER node, ensure file permissions allow the node user to read files and execute the script.
# You might need to add 'RUN chown -R node:node /usr/src/app' before switching the user. 