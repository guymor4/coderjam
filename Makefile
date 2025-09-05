# Coderjam Makefile

.PHONY: help install dev build clean test lint type-check

# Default target
help:
	@echo "Available targets:"
	@echo "  install     - Install dependencies for all packages"
	@echo "  dev         - Start development environment (frontend + backend)"
	@echo "  build       - Build all packages for production"
	@echo "  clean       - Clean build artifacts from all packages"
	@echo "  test        - Run tests for all packages"
	@echo "  lint        - Run linter for all packages"
	@echo "  type-check  - Run type checking for all packages"
	@echo ""
	@echo "Docker commands:"
	@echo "  docker-dev       - Start PostgreSQL for development"
	@echo "  docker-stop      - Stop all Docker containers"
	@echo "  docker-prod      - Start production containers"
	@echo "  docker-prod-stop - Stop production containers"
	@echo "  docker-prod-push - Build and push production images"

# Install dependencies for all packages
install-dependencies:
	@echo "Installing dependencies for all packages..."
	cd shared && yarn install && yarn build # also build to avoid type errors in IDEs
	cd frontend && yarn install
	cd backend && yarn install

download-pyodide-packages:
	@echo "Downloading Pyodide packages to frontend/public/pyodide/"
	cd frontend/public && curl -L -o pyodide.tar.bz2 https://github.com/pyodide/pyodide/releases/download/0.28.0/pyodide-0.28.0.tar.bz2 && tar -xjf pyodide.tar.bz2 && rm pyodide.tar.bz2

install: install-dependencies download-pyodide-packages
	@echo "✅ All dependencies installed."

# Run development environment
dev:
	@echo "🚀 Starting development environment..."
	cd frontend && yarn dev &
	cd backend && sleep 0.5 && yarn dev

# Build all packages (shared first, then others)
build:
	@echo "🏗️ Building all packages..."
	cd shared && yarn build
	cd frontend && yarn build
	cd backend && yarn build

# Clean all packages
clean:
	@echo "🧹 Cleaning all packages..."
	cd shared && yarn clean
	cd frontend && yarn clean
	cd backend && yarn clean

# Test all packages
test:
	@echo "🧪 Running tests for all packages..."
	cd frontend && yarn test

# Lint all packages
lint:
	@echo "🔍 Linting all packages..."
	cd shared && yarn lint
	cd frontend && yarn lint
	cd backend && yarn lint

# Type check all packages
type-check:
	@echo "📝 Type checking all packages..."
	cd shared && yarn type-check 2>/dev/null || echo "No type-check script in shared" 
	cd frontend && yarn type-check
	cd backend && yarn type-check

# ------------ Docker targets ------------
docker-dev:
	# Start Docker containers for development
	docker compose up -d

docker-stop:
	# Stop all Docker containers
	docker compose down

# Stop all containers
docker-prod-stop:
	docker compose -f docker-compose.prod.yaml down

# Build and push production Docker images to the registry (sharkdx/coderjam-webapp)
# Usage: make docker-prod-push [APP_VERSION=v1.2.3]
# HANDLE WITH CAUTION
docker-prod-push:
	@echo "🏗️ Building and pushing Docker images for amd64..."
	$(eval APP_VERSION ?= $(shell date +%Y-%m-%d))
	@echo "📦 Building image: sharkdx/coderjam-webapp:$(APP_VERSION)"
	APP_VERSION=$(APP_VERSION) docker compose -f docker-compose.prod.yaml build \
		--build-arg BUILDKIT_INLINE_CACHE=1
	APP_VERSION=$(APP_VERSION) docker compose -f docker-compose.prod.yaml push
	@echo "✅ Successfully pushed sharkdx/coderjam-webapp:$(APP_VERSION)"

# Pull and start production Docker containers
# HANDLE WITH CAUTION
docker-prod:
	sudo docker compose -f docker-compose.prod.yaml pull
	sudo docker compose -f docker-compose.prod.yaml up -d
