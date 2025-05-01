# Makefile for the Auth Callback Backend Service

# --- Configuration ---
# Get the short Git commit hash
GIT_SHA := $(shell git rev-parse --short=7 HEAD)
# Google Cloud Project ID (Replace if different)
PROJECT_ID=automatic-ace-457219-r3
# Google Cloud Region (Replace if different)
REGION=us-central1
# Name of the Cloud Run service
SERVICE_NAME=auth-callback-backend
# Docker image name
IMAGE_NAME=gcr.io/$(PROJECT_ID)/$(SERVICE_NAME):$(GIT_SHA)

# --- Targets ---

.PHONY: setup clean check dev docker deploy list-services

# Installs dependencies using npm ci for consistency
setup:
	@echo "[setup] Installing dependencies using npm ci..."
	@npm ci

# Removes node_modules
clean:
	@echo "[clean] Removing node_modules..."
	@rm -rf node_modules

# Placeholder for checks (e.g., linting, testing - add tools if needed)
check:
	@echo "[check] Running checks (add linters/tests as needed)..."
	# @npm run lint || true
	# @npm run test || true

# Runs the service locally using Node
# Note: This doesn't use a .env file currently. Add env var loading if needed.
dev:
	@echo "[run-dev $(SERVICE_NAME)] Running service locally..."
	@node cmd/server.js

# Builds the Docker image locally
docker-build:
	@echo "[docker-build $(SERVICE_NAME)] Building Docker image..."
	@docker build -t $(IMAGE_NAME) -f Dockerfile .

# Builds and runs the Docker container locally
docker: docker-build
	@echo "[docker $(SERVICE_NAME)] Running Docker container locally on port 8080..."
	@docker run --rm -p 8080:8080 $(IMAGE_NAME)

# Builds, pushes the image, and deploys to Cloud Run
deploy: docker-build
	@echo "[deploy $(SERVICE_NAME)] Deploying to Cloud Run in $(REGION)..."
	@echo "  Image: $(IMAGE_NAME)"
	@docker push $(IMAGE_NAME)
	@gcloud run deploy $(SERVICE_NAME) \
		--image $(IMAGE_NAME) \
		--region $(REGION) \
		--platform managed \
		--allow-unauthenticated \
		--port 8080 \
		--memory 256Mi \
		--cpu 1 \
		--timeout 300s # Adjust as needed
		# --set-env-vars "KEY1=VAL1,KEY2=VAL2" # Add if specific env vars are needed
	@echo "Deployment of $(SERVICE_NAME) initiated."

# Lists Cloud Run services in the configured region
list-services:
	@echo "[list-services] Listing Cloud Run services in $(REGION)..."
	@gcloud run services list --region $(REGION) 