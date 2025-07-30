import unittest
from unittest.mock import Mock, patch, MagicMock
from django.test import TestCase
from django.contrib.auth.models import User
from django.conf import settings
from rest_framework.test import APITestCase
from rest_framework import status
from jose import jwt
import json

from users.supabase_auth import SupabaseAuth, supabase_auth
from users.authentication import SupabaseTokenAuthentication, SupabaseOrTokenAuthentication


class SupabaseAuthTestCase(TestCase):
    """Test cases for SupabaseAuth class."""

    def setUp(self):
        """Set up test data."""
        self.supabase_auth = SupabaseAuth()
        self.test_email = "test@example.com"
        self.test_user_data = {
            'sub': 'test-user-id',
            'email': self.test_email,
            'email_verified': True
        }

    @patch('users.supabase_auth.create_client')
    def test_init(self, mock_create_client):
        """Test SupabaseAuth initialization."""
        mock_client = Mock()
        mock_create_client.return_value = mock_client
        
        auth = SupabaseAuth()
        
        mock_create_client.assert_called_once_with(
            settings.SUPABASE_URL, 
            settings.SUPABASE_ANON_KEY
        )
        self.assertEqual(auth.supabase, mock_client)

    @patch('users.supabase_auth.jwt.decode')
    def test_verify_jwt_token_success(self, mock_jwt_decode):
        """Test successful JWT token verification."""
        mock_jwt_decode.return_value = self.test_user_data
        
        result = self.supabase_auth.verify_jwt_token("valid-token")
        
        mock_jwt_decode.assert_called_once_with(
            "valid-token",
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated"
        )
        self.assertEqual(result, self.test_user_data)

    @patch('users.supabase_auth.jwt.decode')
    def test_verify_jwt_token_failure(self, mock_jwt_decode):
        """Test JWT token verification failure."""
        mock_jwt_decode.side_effect = Exception("Invalid token")
        
        result = self.supabase_auth.verify_jwt_token("invalid-token")
        
        self.assertIsNone(result)

    def test_get_or_create_user_from_supabase_new_user(self):
        """Test creating a new user from Supabase data."""
        # Ensure no existing user
        User.objects.filter(email=self.test_email).delete()
        
        user = self.supabase_auth.get_or_create_user_from_supabase(self.test_user_data)
        
        self.assertIsInstance(user, User)
        self.assertEqual(user.email, self.test_email)
        self.assertEqual(user.username, self.test_email)
        self.assertFalse(user.has_usable_password())

    def test_get_or_create_user_from_supabase_existing_user(self):
        """Test getting existing user from Supabase data."""
        # Create existing user
        existing_user = User.objects.create_user(
            username="old-username",
            email=self.test_email
        )
        
        user = self.supabase_auth.get_or_create_user_from_supabase(self.test_user_data)
        
        self.assertEqual(user.id, existing_user.id)
        self.assertEqual(user.username, self.test_email)  # Should update username
        self.assertEqual(user.email, self.test_email)

    def test_get_or_create_user_from_supabase_no_email(self):
        """Test handling user data without email."""
        user_data_no_email = {'sub': 'test-user-id'}
        
        with self.assertRaises(ValueError):
            self.supabase_auth.get_or_create_user_from_supabase(user_data_no_email)

    @patch.object(supabase_auth, 'verify_jwt_token')
    @patch.object(supabase_auth, 'get_or_create_user_from_supabase')
    def test_authenticate_with_supabase_token_success(self, mock_get_user, mock_verify_token):
        """Test successful authentication with Supabase token."""
        mock_verify_token.return_value = self.test_user_data
        mock_user = Mock()
        mock_get_user.return_value = mock_user
        
        result = self.supabase_auth.authenticate_with_supabase_token("valid-token")
        
        mock_verify_token.assert_called_once_with("valid-token")
        mock_get_user.assert_called_once_with(self.test_user_data)
        self.assertEqual(result, mock_user)

    @patch.object(supabase_auth, 'verify_jwt_token')
    def test_authenticate_with_supabase_token_invalid_token(self, mock_verify_token):
        """Test authentication with invalid token."""
        mock_verify_token.return_value = None
        
        result = self.supabase_auth.authenticate_with_supabase_token("invalid-token")
        
        self.assertIsNone(result)

    @patch.object(supabase_auth, 'verify_jwt_token')
    @patch.object(supabase_auth, 'get_or_create_user_from_supabase')
    def test_authenticate_with_supabase_token_user_creation_fails(self, mock_get_user, mock_verify_token):
        """Test authentication when user creation fails."""
        mock_verify_token.return_value = self.test_user_data
        mock_get_user.side_effect = Exception("User creation failed")
        
        result = self.supabase_auth.authenticate_with_supabase_token("valid-token")
        
        self.assertIsNone(result)

    def test_get_django_token_for_user(self):
        """Test getting Django token for user."""
        user = User.objects.create_user(
            username=self.test_email,
            email=self.test_email
        )
        
        token = self.supabase_auth.get_django_token_for_user(user)
        
        self.assertIsInstance(token, str)
        self.assertTrue(len(token) > 0)

    @patch.object(supabase_auth, 'supabase')
    def test_sign_in_with_social_provider_success(self, mock_supabase):
        """Test successful social provider sign-in."""
        mock_response = Mock()
        mock_response.user = Mock()
        mock_response.user.id = 'test-user-id'
        mock_response.user.email = self.test_email
        mock_supabase.auth.sign_in_with_oauth.return_value = mock_response
        
        mock_user = Mock()
        mock_user.id = 1
        mock_user.email = self.test_email
        
        with patch.object(supabase_auth, 'get_or_create_user_from_supabase', return_value=mock_user), \
             patch.object(supabase_auth, 'get_django_token_for_user', return_value='django-token'):
            
            result = self.supabase_auth.sign_in_with_social_provider('google', 'access-token')
            
            expected_body = {
                "provider": "google",
                "options": {
                    "queryParams": {
                        "access_token": "access-token"
                    }
                }
            }
            mock_supabase.auth.sign_in_with_oauth.assert_called_once_with(expected_body)
            
            self.assertEqual(result['user'], mock_user)
            self.assertEqual(result['token'], 'django-token')
            self.assertEqual(result['supabase_user'], mock_response.user)

    @patch.object(supabase_auth, 'supabase')
    def test_sign_in_with_social_provider_failure(self, mock_supabase):
        """Test social provider sign-in failure."""
        mock_supabase.auth.sign_in_with_oauth.side_effect = Exception("OAuth failed")
        
        result = self.supabase_auth.sign_in_with_social_provider('google', 'access-token')
        
        self.assertIsNone(result)


class SupabaseAuthenticationTestCase(APITestCase):
    """Test cases for Supabase authentication classes."""

    def setUp(self):
        """Set up test data."""
        self.auth = SupabaseTokenAuthentication()
        self.test_user = User.objects.create_user(
            username="test@example.com",
            email="test@example.com"
        )

    @patch.object(supabase_auth, 'authenticate_with_supabase_token')
    def test_authenticate_supabase_token_success(self, mock_authenticate):
        """Test successful Supabase token authentication."""
        mock_authenticate.return_value = self.test_user
        
        request = Mock()
        request.META = {'HTTP_AUTHORIZATION': 'Bearer valid-token'}
        
        result = self.auth.authenticate(request)
        
        mock_authenticate.assert_called_once_with('valid-token')
        self.assertEqual(result, (self.test_user, 'valid-token'))

    @patch.object(supabase_auth, 'authenticate_with_supabase_token')
    def test_authenticate_supabase_token_failure(self, mock_authenticate):
        """Test Supabase token authentication failure."""
        mock_authenticate.return_value = None
        
        request = Mock()
        request.META = {'HTTP_AUTHORIZATION': 'Bearer invalid-token'}
        
        with self.assertRaises(Exception):
            self.auth.authenticate(request)

    def test_authenticate_no_authorization_header(self):
        """Test authentication with no authorization header."""
        request = Mock()
        request.META = {}
        
        result = self.auth.authenticate(request)
        
        self.assertIsNone(result)

    def test_authenticate_django_token_fallback(self):
        """Test fallback to Django token authentication."""
        from rest_framework.authtoken.models import Token
        token = Token.objects.create(user=self.test_user)
        
        request = Mock()
        request.META = {'HTTP_AUTHORIZATION': f'Token {token.key}'}
        
        result = self.auth.authenticate(request)
        
        self.assertEqual(result[0], self.test_user)
        self.assertEqual(result[1], token.key)


class SupabaseOrTokenAuthenticationTestCase(APITestCase):
    """Test cases for SupabaseOrTokenAuthentication class."""

    def setUp(self):
        """Set up test data."""
        self.auth = SupabaseOrTokenAuthentication()
        self.test_user = User.objects.create_user(
            username="test@example.com",
            email="test@example.com"
        )

    @patch('users.authentication.settings')
    def test_authenticate_scenario_bypass(self, mock_settings):
        """Test scenario bypass in development."""
        mock_settings.DEBUG = True
        
        request = Mock()
        request.session = {'scenario': 'test-scenario'}
        request.META = {}
        
        result = self.auth.authenticate(request)
        
        self.assertIsNone(result)

    @patch.object(supabase_auth, 'authenticate_with_supabase_token')
    def test_authenticate_supabase_token(self, mock_authenticate):
        """Test Supabase token authentication."""
        mock_authenticate.return_value = self.test_user
        
        request = Mock()
        request.META = {'HTTP_AUTHORIZATION': 'Bearer valid-token'}
        
        result = self.auth.authenticate(request)
        
        mock_authenticate.assert_called_once_with('valid-token')
        self.assertEqual(result, (self.test_user, 'valid-token'))

    def test_authenticate_django_token_fallback(self):
        """Test fallback to Django token authentication."""
        from rest_framework.authtoken.models import Token
        token = Token.objects.create(user=self.test_user)
        
        request = Mock()
        request.META = {'HTTP_AUTHORIZATION': f'Token {token.key}'}
        
        result = self.auth.authenticate(request)
        
        self.assertEqual(result[0], self.test_user)
        self.assertEqual(result[1], token.key)


class SupabaseAuthViewsTestCase(APITestCase):
    """Test cases for Supabase authentication views."""

    def setUp(self):
        """Set up test data."""
        self.test_user = User.objects.create_user(
            username="test@example.com",
            email="test@example.com"
        )

    @patch('users.views.supabase_auth')
    def test_supabase_auth_callback_success(self, mock_supabase_auth):
        """Test successful Supabase auth callback."""
        mock_supabase_auth.authenticate_with_supabase_token.return_value = self.test_user
        mock_supabase_auth.get_django_token_for_user.return_value = 'django-token'
        
        data = {'access_token': 'valid-supabase-token'}
        response = self.client.post('/api/users/auth/supabase/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['token'], 'django-token')
        self.assertEqual(response.data['user_id'], self.test_user.id)
        self.assertEqual(response.data['email'], self.test_user.email)

    @patch('users.views.supabase_auth')
    def test_supabase_auth_callback_invalid_token(self, mock_supabase_auth):
        """Test Supabase auth callback with invalid token."""
        mock_supabase_auth.authenticate_with_supabase_token.return_value = None
        
        data = {'access_token': 'invalid-token'}
        response = self.client.post('/api/users/auth/supabase/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_supabase_auth_callback_missing_token(self):
        """Test Supabase auth callback with missing token."""
        data = {}
        response = self.client.post('/api/users/auth/supabase/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('users.views.supabase_auth')
    def test_social_auth_signin_success(self, mock_supabase_auth):
        """Test successful social auth sign-in."""
        mock_result = {
            'user': self.test_user,
            'token': 'django-token',
            'supabase_user': Mock()
        }
        mock_supabase_auth.sign_in_with_social_provider.return_value = mock_result
        
        data = {
            'provider': 'google',
            'access_token': 'valid-access-token'
        }
        response = self.client.post('/api/users/auth/social/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['token'], 'django-token')
        self.assertEqual(response.data['user_id'], self.test_user.id)
        self.assertEqual(response.data['email'], self.test_user.email)

    @patch('users.views.supabase_auth')
    def test_social_auth_signin_failure(self, mock_supabase_auth):
        """Test social auth sign-in failure."""
        mock_supabase_auth.sign_in_with_social_provider.return_value = None
        
        data = {
            'provider': 'google',
            'access_token': 'invalid-token'
        }
        response = self.client.post('/api/users/auth/social/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_social_auth_signin_missing_data(self):
        """Test social auth sign-in with missing data."""
        data = {'provider': 'google'}  # Missing access_token
        response = self.client.post('/api/users/auth/social/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


if __name__ == '__main__':
    unittest.main() 