#!/bin/bash

echo "📱 iOS Supabase Configuration Setup"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

CONFIG_FILE="frontend/EvolveAI/Resources/Config.plist"
TEMPLATE_FILE="frontend/EvolveAI/Resources/Config.plist.template"

# Check if Config.plist already exists
if [ -f "$CONFIG_FILE" ]; then
    print_warning "Config.plist already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Keeping existing Config.plist"
        exit 0
    fi
fi

# Check if template exists
if [ ! -f "$TEMPLATE_FILE" ]; then
    print_error "Template file not found: $TEMPLATE_FILE"
    exit 1
fi

print_status "Setting up iOS Supabase configuration..."

# Copy template to actual config file
cp "$TEMPLATE_FILE" "$CONFIG_FILE"

print_success "Created Config.plist from template"
print_status "Please update the following values in $CONFIG_FILE:"
echo ""
echo "  1. SUPABASE_URL: Your Supabase project URL"
echo "     Example: https://your-project.supabase.co"
echo ""
echo "  2. SUPABASE_ANON_KEY: Your Supabase anon/public key"
echo "     Find this in your Supabase dashboard under Settings > API"
echo ""

# Try to read from backend .env if it exists
BACKEND_ENV="backend/.env"
if [ -f "$BACKEND_ENV" ]; then
    print_status "Found backend .env file. Would you like to copy values from there?"
    read -p "Copy Supabase values from backend .env? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Extract values from backend .env
        SUPABASE_URL=$(grep "^SUPABASE_URL=" "$BACKEND_ENV" | cut -d'=' -f2)
        SUPABASE_ANON_KEY=$(grep "^SUPABASE_ANON_KEY=" "$BACKEND_ENV" | cut -d'=' -f2)
        
        if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_ANON_KEY" ]; then
            # Update Config.plist with values from .env
            if command -v plutil &> /dev/null; then
                plutil -replace SUPABASE_URL -string "$SUPABASE_URL" "$CONFIG_FILE"
                plutil -replace SUPABASE_ANON_KEY -string "$SUPABASE_ANON_KEY" "$CONFIG_FILE"
                print_success "Updated Config.plist with values from backend .env"
            else
                print_warning "plutil not found. Please manually update Config.plist"
            fi
        else
            print_warning "Could not find Supabase values in backend .env"
        fi
    fi
fi

print_status "Configuration file location: $CONFIG_FILE"
print_status "This file is gitignored and will not be committed to version control"
echo ""
print_success "iOS configuration setup completed! 🎉" 