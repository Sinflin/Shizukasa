from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.contact import Contact
from app.schemas.contact import AddContactRequest, ContactResponse

router = APIRouter(prefix="/contacts", tags=["contacts"])
#Based on the code provided, this is a FastAPI router that handles endpoints related to managing contacts for users. 
#It includes functionality for adding a new contact and listing existing contacts for the authenticated user. 
#The router uses dependency injection to get the current authenticated user and the database session.

@router.post("/add", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
def add_contact(
    payload: AddContactRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.contact_phone_number == current_user.phone_number:
        raise HTTPException(status_code=400, detail="Cannot add yourself as a contact")

    target = db.query(User).filter(User.phone_number == payload.contact_phone_number).first()
    if not target:
        raise HTTPException(status_code=404, detail="No user with that phone number")

    contact_id = f"{current_user.phone_number}:{target.phone_number}"
    existing = db.query(Contact).filter(Contact.id == contact_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Contact already added")

    contact = Contact(
        id=contact_id,
        owner_phone=current_user.phone_number,
        contact_phone=target.phone_number,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)

    return ContactResponse(contact_phone_number=contact.contact_phone, added_at=contact.added_at)


@router.get("/", response_model=list[ContactResponse])
def list_contacts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    contacts = db.query(Contact).filter(Contact.owner_phone == current_user.phone_number).all()
    return [
        ContactResponse(contact_phone_number=c.contact_phone, added_at=c.added_at)
        for c in contacts
    ]