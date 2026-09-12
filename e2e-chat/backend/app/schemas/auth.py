from pydantic import BaseModel, Field

class RequestOTPRequest(BaseModel):
    phone_number: str = Field(..., min_length=4, max_length=15)

class RequestOTPResponse(BaseModel):
    message: str 
    # DEV ONLY — remove this field once a real SMS provider is wired in.
    # Returning the OTP in the response defeats the purpose of OTP auth
    # in production; it only exists so you can test without Twilio.
    otp_dev_only: str

class VerifyOTPRequest(BaseModel):
    phone_number:str 
    otp:str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshRequest(BaseModel):
    refresh_token: str
#An pydantic is a data validation and settings management library for Python, based on Python type annotations. 
# It allows you to define data models with type hints and automatically validates the data against those models. 
# In this code snippet, Pydantic models are used to define the structure of requests and responses for OTP (One-Time Password) authentication in a chat application.
#This program is basically a set of Pydantic models for a chat application.
