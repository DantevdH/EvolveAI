"""
JWT Authentication tests
"""
import pytest
import jwt
from datetime import datetime, timedelta
from fastapi import HTTPException
from core.training.helpers.database_service import extract_user_id_from_jwt
from settings import settings

@pytest.mark.unit
class TestJWTAuthentication:
    """Test JWT token validation and authentication."""
    
    def test_extract_user_id_from_valid_token(self):
        """Test extracting user_id from a valid JWT token."""
        # Create a valid token (without signature verification if secret not set)
        payload = {
            "sub": "123e4567-e89b-12d3-a456-426614174000",
            "exp": int((datetime.utcnow() + timedelta(hours=1)).timestamp()),
            "iat": int(datetime.utcnow().timestamp())
        }
        
        # If JWT secret is set, use it; otherwise create unsigned token
        if settings.SUPABASE_JWT_SECRET:
            token = jwt.encode(payload, settings.SUPABASE_JWT_SECRET, algorithm="HS256")
        else:
            # For testing without secret, create token without signature
            token = jwt.encode(payload, "", algorithm="HS256")
        
        user_id = extract_user_id_from_jwt(token)
        assert user_id == "123e4567-e89b-12d3-a456-426614174000"
    
    def test_extract_user_id_from_invalid_token(self):
        """Test that invalid token raises HTTPException."""
        with pytest.raises(HTTPException) as exc_info:
            extract_user_id_from_jwt("invalid.token.here")
        
        assert exc_info.value.status_code == 401
    
    def test_extract_user_id_from_expired_token(self):
        """Test that expired token raises HTTPException."""
        if not settings.SUPABASE_JWT_SECRET:
            pytest.skip("JWT secret not set, skipping signature verification test")
        
        # Create expired token
        payload = {
            "sub": "123e4567-e89b-12d3-a456-426614174000",
            "exp": int((datetime.utcnow() - timedelta(hours=1)).timestamp()),
            "iat": int((datetime.utcnow() - timedelta(hours=2)).timestamp())
        }
        
        token = jwt.encode(payload, settings.SUPABASE_JWT_SECRET, algorithm="HS256")
        
        with pytest.raises(HTTPException) as exc_info:
            extract_user_id_from_jwt(token)
        
        assert exc_info.value.status_code == 401
        assert "expired" in exc_info.value.detail.lower()
    
    def test_extract_user_id_from_token_without_sub(self):
        """Test that token without 'sub' field raises HTTPException."""
        payload = {
            "exp": int((datetime.utcnow() + timedelta(hours=1)).timestamp()),
            "iat": int(datetime.utcnow().timestamp())
        }
        
        if settings.SUPABASE_JWT_SECRET:
            token = jwt.encode(payload, settings.SUPABASE_JWT_SECRET, algorithm="HS256")
        else:
            token = jwt.encode(payload, "", algorithm="HS256")
        
        with pytest.raises(HTTPException) as exc_info:
            extract_user_id_from_jwt(token)
        
        assert exc_info.value.status_code == 401
        assert "user_id" in exc_info.value.detail.lower()
    
    def test_jwt_verification_with_secret(self):
        """Test that JWT verification works when secret is configured."""
        if not settings.SUPABASE_JWT_SECRET:
            pytest.skip("JWT secret not set, skipping verification test")
        
        # Create valid token with secret
        payload = {
            "sub": "test-user-id",
            "exp": int((datetime.utcnow() + timedelta(hours=1)).timestamp()),
            "iat": int(datetime.utcnow().timestamp())
        }
        
        token = jwt.encode(payload, settings.SUPABASE_JWT_SECRET, algorithm="HS256")
        user_id = extract_user_id_from_jwt(token)
        assert user_id == "test-user-id"
        
        # Try with wrong secret - should fail
        wrong_token = jwt.encode(payload, "wrong-secret", algorithm="HS256")
        with pytest.raises(HTTPException):
            extract_user_id_from_jwt(wrong_token)

