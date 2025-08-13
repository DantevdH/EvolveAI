#!/bin/bash

echo "📱 iOS Dependencies Setup (Google Sign-In, Facebook, etc.)"
echo "=========================================================="

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

# Check if we're in the right directory
if [ ! -d "frontend" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

cd frontend

# Check if CocoaPods is installed
if ! command -v pod &> /dev/null; then
    print_error "CocoaPods is not installed. Please install CocoaPods first."
    echo ""
    print_status "Install CocoaPods with:"
    echo "  sudo gem install cocoapods"
    echo ""
    print_status "Or if you prefer Homebrew:"
    echo "  brew install cocoapods"
    exit 1
fi

print_success "CocoaPods is installed"

# Check if Podfile exists
if [ ! -f "Podfile" ]; then
    print_error "Podfile not found. Creating one..."
    exit 1
fi

print_status "Installing iOS dependencies..."

# Install pods
pod install

if [ $? -eq 0 ]; then
    print_success "iOS dependencies installed successfully!"
    print_status "Dependencies added:"
    echo "  ✅ GoogleSignIn - Google Sign-In SDK"
    echo "  ✅ FBSDKLoginKit - Facebook Login SDK"
    echo "  ✅ Apple Sign-In - Built into iOS (no additional dependency)"
    echo ""
    print_warning "IMPORTANT: You must now open the .xcworkspace file instead of .xcodeproj"
    print_status "Run: open EvolveAI.xcworkspace"
    echo ""
    print_status "Next steps:"
    echo "  1. Open EvolveAI.xcworkspace in Xcode"
    echo "  2. Configure Google Sign-In in your Google Cloud Console"
    echo "  3. Update Info.plist with your Google Client ID"
    echo "  4. Configure Facebook Login in Facebook Developers"
    echo "  5. Update Info.plist with Facebook App ID and Client Token"
    echo ""
    print_status "For detailed setup instructions, see SUPABASE_SETUP.md"
else
    print_error "Failed to install iOS dependencies"
    exit 1
fi

cd ..

print_success "iOS dependencies setup completed! 🎉" 