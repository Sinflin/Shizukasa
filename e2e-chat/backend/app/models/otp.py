from sqlalchemy import Column, Integer, String, DateTime, Boolean 
from app.database import Base

class OTP_request(Base):
    __tablename__ = "OTP_request"

    id = Column(Integer, primary_key=True, index= True)
    phone_number = Column(String, nullable=False, index=True)
    otp_code = Column(String, nullable=False)
    otp_expire = Column(DateTime(timezone=True), nullable=False)
    is_verified = Column(Boolean, default = False)

    #This program is basically a OTP_request model for a chat application.
    # It defines a OTP_request class that represents a OTP request in the system.
    # The OTP_request class inherits from the Base class, which is defined in the app.database
    # module and is used to create the database tables.
