# This will generate the otps 
import random 
import string 
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.config import settings
from app.models.otp import OTPRequest

def generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))

def create_otp_record(db: Session, phone_number: str) -> str:
    otp_code = generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.otp_expire_minutes)

    record = OTPRequest(phone_number=phone_number, otp_code=otp_code, expires_at=expires_at)
    db.add(record)
    db.commit()
    return otp_code

def verify_otp(db: Session, phone_number: str, otp_code: str) -> bool:
    record = (
        db.query(OTPRequest)
        .filter(
            OTPRequest.phone_number == phone_number,
            OTPRequest.otp_code == otp_code,
            OTPRequest.is_used.is_(False),
        )
        .order_by(OTPRequest.id.desc())
        .first()
    )

    if not record:
        return False

    # Sqlite stores native datetime - attach UTC before 
    expires_at = record.expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        return False

    record.is_used = True
    db.commit()
    return True