# Coderjam Makefile

.PHONY: help dev build clean docker-dev docker-prod test lint type-check install

# Default target
help:
	@echo "Available targets:"
	@echo "  dev         - Start development server"
	@echo "  install     - Install dependencies"
	@echo "  clean       - Clean build artifacts"
	@echo "  build       - Build production version"
	@echo "  docker-prod-push - Build and push production Docker images to the registry"
	@echo "  docker-prod - Pull and start production Docker containers"
	@echo "  test        - Run tests"
	@echo "  lint        - Run linter"
	@echo "  type-check  - Run type checking"

# Development - starts postgres if not running and then starts dev server
dev:
	@if ! docker ps | grep -q coderjam-postgres; then \
		echo "Starting PostgreSQL..."; \
		docker compose up -d; \
	else \
		echo "PostgreSQL already running :)"; \
	fi
	yarn dev

# Build
build:
	yarn build

# Clean
clean:
	yarn clean

# Install dependencies
install:
	yarn install

# Testing
test:
	yarn test

# Linting
lint:
	yarn lint

# Type checking
type-check:
	yarn type-check

# Stop all containers
docker-stop:
	docker compose down
	docker compose -f docker-compose.prod.yaml down

# Build and push production Docker images to the registry
# HANDLE WITH CAUTION
docker-prod-push:
	docker compose -f docker-compose.prod.yaml build
	docker compose -f docker-compose.prod.yaml push

# Pull and start production Docker containers
# HANDLE WITH CAUTION
docker-prod:
	docker compose -f docker-compose.prod.yaml pull
	docker compose -f docker-compose.prod.yaml up -d
