from datetime import datetime, timedelta, timezone
#timedelta is use to set the expiration the time of the token
from jose import jwt, JWTError
#jose is a library that provides functions for encoding and decoding JSON Web Tokens (JWTs). 
# It is used to create and verify JWT tokens in this code.
from app.config import settings

def _create_token(phone_number: str, expires_delta: timedelta, token_type: str) -> str:
    payload = {
        "sub": phone_number,
        "type": token_type,
        "exp": datetime.now(timezone.utc) + expires_delta
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)

#_create_token is a private function that creates a JWT token with the given phone number, expiration time, and token type.
# It uses the jose library to encode the payload into a JWT token using the secret key and algorithm specified in the settings.

def create_access_token(phone_number: str) -> str:
    return _create_token(phone_number, timedelta(minutes= settings.access_token_expire_minutes), "access")

def create_refresh_token(phone_number: str) -> str:
    return _create_token(phone_number, timedelta(days= settings.refresh_token_expire_days), "refresh")

def decode_token(token: str, expected_type: str) -> str:
    '''Returns the phone number if the token is valid, otherwise raises an exception.'''
    payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    if payload.get("type") != expected_type:
        raise JWTError(f"expected {expected_type} token, got {payload.get('type')}")
    return payload["sub"]
#decode_token is a function that decodes a JWT token and returns the phone number if the token is valid.
# It uses the jose library to decode the token using the secret key and algorithm specified in the settings. 
# It also checks if the token type matches the expected type and raises a JWTError if it does not.

