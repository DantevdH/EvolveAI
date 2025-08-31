#!/bin/bash

echo "🚀 EvolveAI Supabase Authentication Setup"
echo "=========================================="

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

# Check if Poetry is installed
if ! command -v poetry &> /dev/null; then
    echo "❌ Poetry is not installed. Please install Poetry first."
    echo "📦 Install Poetry: curl -sSL https://install.python-poetry.org | python3 -"
    exit 1
fi

echo "✅ Python and Poetry are installed"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend

# Clean up any existing lock file to ensure fresh install
if [ -f "poetry.lock" ]; then
    echo "🔄 Removing existing poetry.lock for fresh install..."
    rm poetry.lock
fi

poetry install

if [ $? -eq 0 ]; then
    echo "✅ Backend dependencies installed successfully"
else
    echo "❌ Failed to install backend dependencies"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp env.example .env
    echo "✅ Created .env file from template"
    echo "📝 Please update the .env file with your actual configuration values"
else
    echo "✅ .env file already exists"
fi

# Run Django migrations
echo "🗄️  Running Django migrations..."
poetry run python manage.py migrate

if [ $? -eq 0 ]; then
    echo "✅ Database migrations completed"
else
    echo "❌ Failed to run migrations"
    exit 1
fi

cd ..

echo ""
echo "🎉 Backend setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Update backend/.env with your Supabase configuration"
echo "2. Configure your iOS app with the required dependencies"
echo "3. Update SupabaseManager.swift with your Supabase URL and key"
echo "4. Configure your authentication providers in Supabase dashboard"
echo ""
echo "📖 For detailed instructions, see SUPABASE_SETUP.md"
echo ""
echo "🚀 To start the backend server:"
echo "   cd backend && poetry run python manage.py runserver" 