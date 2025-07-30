#!/bin/bash

echo "🧪 Running Supabase Integration Tests"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Backend Tests
print_status "Running Backend Tests..."

cd backend

# Check if Poetry is installed
if ! command -v poetry &> /dev/null; then
    print_error "Poetry is not installed. Please install Poetry first."
    exit 1
fi

# Install dependencies if needed
print_status "Installing backend dependencies..."
poetry install --quiet

# Run Django tests
print_status "Running Django Supabase tests..."
poetry run python manage.py test users.tests.test_supabase_auth -v 2

if [ $? -eq 0 ]; then
    print_success "Backend tests completed successfully!"
else
    print_error "Backend tests failed!"
    cd ..
    exit 1
fi

cd ..

# Frontend Tests
print_status "Running Frontend Tests..."

cd frontend

# Check if Xcode is available
if ! command -v xcodebuild &> /dev/null; then
    print_warning "Xcode not found. Skipping frontend tests."
    print_warning "To run frontend tests, install Xcode and run:"
    print_warning "  cd frontend && xcodebuild test -project EvolveAI.xcodeproj -scheme EvolveAI -destination 'platform=iOS Simulator,name=iPhone 15'"
    cd ..
    exit 0
fi

# Run iOS tests
print_status "Running iOS Supabase tests..."
xcodebuild test \
    -project EvolveAI.xcodeproj \
    -scheme EvolveAI \
    -destination 'platform=iOS Simulator,name=iPhone 15' \
    -only-testing:EvolveAITests/SupabaseManagerTests \
    -only-testing:EvolveAITests/UserManagerSupabaseTests \
    -quiet

if [ $? -eq 0 ]; then
    print_success "Frontend tests completed successfully!"
else
    print_error "Frontend tests failed!"
    cd ..
    exit 1
fi

cd ..

echo ""
print_success "All tests completed successfully! 🎉"
echo ""
print_status "Test Summary:"
echo "  ✅ Backend: Django Supabase authentication tests"
echo "  ✅ Frontend: iOS Supabase integration tests"
echo ""
print_status "Next steps:"
echo "  1. Configure your Supabase project with real credentials"
echo "  2. Update environment variables in backend/.env"
echo "  3. Update SupabaseManager.swift with your project URL and key"
echo "  4. Test with real authentication providers"
echo ""
print_status "For detailed setup instructions, see SUPABASE_SETUP.md" 