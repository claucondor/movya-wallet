# Use an official Node.js runtime as a parent image (Long Term Support version is recommended)
# Using alpine for a smaller image size
FROM node:lts-alpine as builder

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install only production dependencies
# Using 'npm ci' is generally recommended for CI/CD as it uses package-lock.json for deterministic builds
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# --- Second Stage: Runtime ---
# Use a minimal Node.js image for the final stage
FROM node:lts-alpine

WORKDIR /usr/src/app

# Copy dependencies from the builder stage
COPY --from=builder /usr/src/app/node_modules ./node_modules
# Copy application code from the builder stage
COPY --from=builder /usr/src/app/cmd ./cmd
COPY --from=builder /usr/src/app/http ./http
COPY --from=builder /usr/src/app/internal ./internal
COPY --from=builder /usr/src/app/package.json ./package.json


# Expose the port the app runs on (should match the one in cmd/server.js)
EXPOSE 8080

# Run the application
# Ensure the entrypoint script is executable if needed (not usually required for Node)
CMD [ "node", "cmd/server.js" ]

# Optional: Run as a non-root user for security
# USER node
# Note: If you uncomment USER node, ensure file permissions allow the node user to read files and execute the script.
# You might need to add 'RUN chown -R node:node /usr/src/app' before switching the user. 