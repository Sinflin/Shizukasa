from sqlachemy import Column, String, DateTime, func
from app.database import Base

class User(Base):
    __tablename__ = "users"

    # phone_number is the primary identity — same string used as the
    # WebSocket user_id and as the JWT "sub" claim.

    phone_number = Column(String, primary_key =True, index= True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    #This program is basically a user model for a chat application. 
    # It defines a User class that represents a user in the system.
    #The User class inherits from the Base class, which is defined in the app.database module and is used to create the database tables.

    