from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    RequestOTPRequest,
    RequestOTPResponse,
    VerifyOTPRequest,
    TokenResponse,
    RefreshRequest,
)
from app.services.otp_service import create_otp_record, verify_otp
from app.services.jwt_handler import create_access_token, create_refresh_token, decode_token

router = APIRouter(prefix="/auth", tags=["auth"])

#router.post("/request-otp") is an endpoint that generates an OTP for a given phone number and returns it in the response.
#It uses the create_otp_record function from the otp_service module to create a new OTP record in the database.
@router.post("/request-otp", response_model=RequestOTPResponse)
def request_otp(payload: RequestOTPRequest, db: Session = Depends(get_db)):
    otp_code = create_otp_record(db, payload.phone_number)
    return RequestOTPResponse(
        message="OTP generated.",
        otp_dev_only=otp_code,  # TODO: send via SMS provider instead, drop this field
    )

#router.post("/verify-otp") is an endpoint that verifies the OTP for a given phone number and returns access and refresh tokens if the OTP is valid.
#It uses the verify_otp function from the otp_service module to check if the OTP is valid and not expired. 
#If the OTP is valid, it checks if the user exists in the database; if not, it creates a new user record. 
#Finally, it generates access and refresh tokens using the create_access_token and create_refresh_token functions from the jwt_handler module and returns them in the response.
@router.post("/verify-otp", response_model=TokenResponse)
def verify_otp_and_login(payload: VerifyOTPRequest, db: Session = Depends(get_db)):
    if not verify_otp(db, payload.phone_number, payload.otp):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP")

    user = db.query(User).filter(User.phone_number == payload.phone_number).first()
    if not user:
        user = User(phone_number=payload.phone_number)
        db.add(user)
        db.commit()

    return TokenResponse(
        access_token=create_access_token(user.phone_number),
        refresh_token=create_refresh_token(user.phone_number),
    )

#router.post("/refresh") is an endpoint that refreshes the access token using a valid refresh token.
#It uses the decode_token function from the jwt_handler module to decode the refresh token and extract the phone number.
#If the refresh token is valid, it generates a new access token and refresh token using the create_access_token and create_refresh_token functions and returns them in the response.
#If the refresh token is invalid, it raises an HTTPException with a 401 status code.
@router.post("/refresh", response_model=TokenResponse)
def refresh_access_token(payload: RefreshRequest):
    try:
        phone_number = decode_token(payload.refresh_token, expected_type="refresh")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    return TokenResponse(
        access_token=create_access_token(phone_number),
        refresh_token=create_refresh_token(phone_number),
    )

#This whole code is a FastAPI router that handles authentication-related endpoints, including requesting an OTP, verifying the OTP to log in, and refreshing access tokens.
#It interacts with the database to manage OTP records and user records, and it uses JWT tokens for authentication.