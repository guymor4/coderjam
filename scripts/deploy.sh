#!/bin/bash

# Zero-downtime rolling deployment script for CodeJam
# This script updates app replicas one by one to ensure no downtime

set -e  # Exit on any error

# Configuration
COMPOSE_FILE="docker-compose.prod.yaml"
HEALTH_CHECK_HOST="http://localhost"
MAX_WAIT_TIME=120  # seconds
WAIT_INTERVAL=5    # seconds

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a service is healthy
check_health() {
    local port=$1
    local max_attempts=$((MAX_WAIT_TIME / WAIT_INTERVAL))
    local attempt=1
    
    log_info "Checking health on port $port..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "${HEALTH_CHECK_HOST}:${port}/api/health" > /dev/null 2>&1; then
            log_success "Service on port $port is healthy"
            return 0
        fi
        
        log_info "Attempt $attempt/$max_attempts - waiting ${WAIT_INTERVAL}s..."
        sleep $WAIT_INTERVAL
        attempt=$((attempt + 1))
    done
    
    log_error "Service on port $port failed health check after $MAX_WAIT_TIME seconds"
    return 1
}

# Function to update a single replica
update_replica() {
    local service_name=$1
    local port=$2
    
    log_info "Updating $service_name..."
    
    # Stop the service
    log_info "Stopping $service_name..."
    docker-compose -f $COMPOSE_FILE stop $service_name
    
    # Remove the container
    docker-compose -f $COMPOSE_FILE rm -f $service_name
    
    # Start the service with new image
    log_info "Starting $service_name with new image..."
    docker-compose -f $COMPOSE_FILE up -d $service_name
    
    # Wait for health check
    if check_health $port; then
        log_success "$service_name updated successfully"
        return 0
    else
        log_error "Failed to update $service_name"
        return 1
    fi
}

# Function to rollback a replica
rollback_replica() {
    local service_name=$1
    local port=$2
    
    log_warning "Rolling back $service_name..."
    docker-compose -f $COMPOSE_FILE stop $service_name
    docker-compose -f $COMPOSE_FILE rm -f $service_name
    
    # Use previous image version for rollback
    APP_VERSION=${PREVIOUS_VERSION:-latest} docker-compose -f $COMPOSE_FILE up -d $service_name
    
    if check_health $port; then
        log_success "$service_name rolled back successfully"
    else
        log_error "Failed to rollback $service_name"
    fi
}

# Main deployment function
main() {
    log_info "Starting zero-downtime deployment..."
    
    # Validate environment
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_error "docker-compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    
    # Set version
    if [ -z "$APP_VERSION" ]; then
        APP_VERSION=$(date +%Y%m%d-%H%M%S)
        log_info "No APP_VERSION set, using: $APP_VERSION"
    fi
    
    # Pull new image (assumes it was built and pushed from Mac)
    log_info "Pulling new image version: $APP_VERSION"
    docker pull sharkdx/coderjam-webapp:${APP_VERSION}
    
    # Tag the image for all replicas
    docker tag sharkdx/coderjam-webapp:${APP_VERSION} sharkdx/coderjam-webapp:latest
    
    # Update replicas one by one
    replicas=("webapp-1:8080" "webapp-2:8081" "webapp-3:8082")
    updated_replicas=()
    
    for replica in "${replicas[@]}"; do
        IFS=':' read -r service_name port <<< "$replica"
        
        if update_replica $service_name $port; then
            updated_replicas+=("$replica")
        else
            log_error "Failed to update $service_name, starting rollback..."
            
            # Rollback previously updated replicas
            for rollback_replica_info in "${updated_replicas[@]}"; do
                IFS=':' read -r rollback_service rollback_port <<< "$rollback_replica_info"
                rollback_replica $rollback_service $rollback_port
            done
            
            exit 1
        fi
        
        # Wait between replica updates
        log_info "Waiting 10 seconds before updating next replica..."
        sleep 10
    done
    
    # Final health check on all replicas
    log_info "Performing final health check on all replicas..."
    all_healthy=true
    
    for replica in "${replicas[@]}"; do
        IFS=':' read -r service_name port <<< "$replica"
        if ! check_health $port; then
            all_healthy=false
        fi
    done
    
    if $all_healthy; then
        log_success "🎉 Zero-downtime deployment completed successfully!"
        log_info "All replicas are running version: $APP_VERSION"
    else
        log_error "Some replicas are not healthy after deployment"
        exit 1
    fi
}

# Script usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo "Options:"
    echo "  -v, --version VERSION    Set the app version (default: timestamp)"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  APP_VERSION             Application version to deploy"
    echo ""
    echo "Example:"
    echo "  $0 --version v1.2.3"
    echo "  APP_VERSION=v1.2.3 $0"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--version)
            APP_VERSION="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Export APP_VERSION for docker-compose
export APP_VERSION

# Run main function
main "$@"