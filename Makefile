# Coderjam Makefile

.PHONY: help install build clean test lint type-check

# Default target
help:
	@echo "Available targets:"
	@echo "  install     - Install dependencies for all packages"
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
install:
	@echo "📦 Installing dependencies for all packages..."
	cd shared && yarn install
	cd frontend && yarn install
	cd backend && yarn install

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

# Build and push production Docker images to the registry
# HANDLE WITH CAUTION
docker-prod-push:
	docker compose -f docker-compose.prod.yaml build
	docker compose -f docker-compose.prod.yaml push

# Pull and start production Docker containers
# HANDLE WITH CAUTION
docker-prod:
	sudo docker compose -f docker-compose.prod.yaml pull
	sudo docker compose -f docker-compose.prod.yaml up -d
