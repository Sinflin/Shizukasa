from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.services.jwt_handler import decode_token

# tokenUrl is only used for OpenAPI docs — actual verification happens via OTP.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/verify-otp")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        phone_number = decode_token(token, expected_type="access")
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.phone_number == phone_number).first()
    if user is None:
        raise credentials_exception
    return user