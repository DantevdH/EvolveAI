import os
from typing import Optional, Dict, Any
from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from supabase import create_client, Client
from jose import jwt
import json


class SupabaseAuth:
    """Handles Supabase authentication and user management."""
    
    def __init__(self):
        self.supabase_url = settings.SUPABASE_URL
        self.supabase_key = settings.SUPABASE_ANON_KEY
        self.supabase_secret = settings.SUPABASE_SERVICE_ROLE_KEY
        self.jwt_secret = settings.SUPABASE_JWT_SECRET
        
        # Initialize Supabase client
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
    
    def verify_jwt_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify and decode a Supabase JWT token."""
        try:
            # Decode the JWT token
            payload = jwt.decode(
                token,
                self.jwt_secret,
                algorithms=["HS256"],
                audience="authenticated"
            )
            return payload
        except Exception as e:
            print(f"JWT verification failed: {e}")
            return None
    
    def get_or_create_user_from_supabase(self, supabase_user_data: Dict[str, Any]) -> User:
        """Get or create a Django user from Supabase user data."""
        supabase_id = supabase_user_data.get('sub')  # Supabase user ID
        email = supabase_user_data.get('email')
        
        if not email:
            raise ValueError("Email is required from Supabase user data")
        
        # Try to find existing user by email
        try:
            user = User.objects.get(email=email)
            # Update the user's username if it's different
            if user.username != email:
                user.username = email
                user.save()
        except User.DoesNotExist:
            # Create new user
            user = User.objects.create_user(
                username=email,
                email=email,
                password=None  # No password for social auth users
            )
        
        return user
    
    def authenticate_with_supabase_token(self, token: str) -> Optional[User]:
        """Authenticate a user using a Supabase JWT token."""
        # Verify the token
        payload = self.verify_jwt_token(token)
        if not payload:
            return None
        
        # Get or create user from Supabase data
        try:
            user = self.get_or_create_user_from_supabase(payload)
            return user
        except Exception as e:
            print(f"Failed to get/create user from Supabase: {e}")
            return None
    
    def get_django_token_for_user(self, user: User) -> str:
        """Get or create a Django REST framework token for the user."""
        token, created = Token.objects.get_or_create(user=user)
        return token.key
    
    def sign_in_with_social_provider(self, provider: str, access_token: str) -> Optional[Dict[str, Any]]:
        """Sign in with a social provider using direct token verification."""
        try:
            # For now, we'll create a user based on the provider and token
            # In a production environment, you would verify the token with the respective provider
            
            if provider == "google":
                # For Google, the access_token is actually an ID token
                # You would verify this with Google's API
                email = f"google_user_{access_token[:8]}@example.com"  # Placeholder
            elif provider == "facebook":
                # For Facebook, you would verify the access token with Facebook's API
                email = f"facebook_user_{access_token[:8]}@example.com"  # Placeholder
            else:
                print(f"Unsupported provider: {provider}")
                return None
            
            # Create or get Django user
            django_user = self.get_or_create_user_from_supabase({
                'sub': f"{provider}_{access_token[:8]}",
                'email': email
            })
            
            # Get Django token
            django_token = self.get_django_token_for_user(django_user)
            
            return {
                'user': django_user,
                'token': django_token,
                'provider': provider
            }
            
        except Exception as e:
            print(f"Social sign-in failed: {e}")
            return None


# Global instance
supabase_auth = SupabaseAuth() 