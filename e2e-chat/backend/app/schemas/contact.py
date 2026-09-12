from pydantic import BaseModel
from datetime import datetime

class AddContactRequest(BaseModel):
    contact_phone_number: str

class ContactResponse(BaseModel):
    contact_phone_number: str
    added_at: datetime

    class config:
        from_attributes = True
        