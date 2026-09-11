from sqlachemy import Column, String, DateTime, ForeignKey, UniqueConstraint, func
from app.database import Base

class Contact(Base):
    __tablename__ = "contacts"
    __table_args__ = (UniqueConstraint("user_phone_number", "contact_phone_", name = "uq_owner_contact"),)

    id = Column(String, primary_key=True)  # set as f"{owner}:{contact}" at insert time
    owner_phone = Column(String, ForeignKey("users.phone_number"), nullable=False, index=True)
    contact_phone = Column(String, ForeignKey("users.phone_number"), nullable=False)
    added_at = Column(DateTime(timezone=True), server_default=func.now())

    #This program is basically a contact model for a chat application.
    # It defines a Contact class that represents a contact in the system.'
    # IN easier way it defines a Contact class that represents a contact in the system. The Contact class inherits from the Base 
    # class, which is defined in the app.database module and is used to create the database tables.