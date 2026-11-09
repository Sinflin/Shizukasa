#I am trusting ai for this lol
from datetime import datetime, timedelta, timezone
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from app.database import SessionLocal
from app.models.user import User
from app.models.message import QueuedMessage, PendingReceipt

TTL = timedelta(days=30)
MAX_QUEUE_PER_RECIPIENT = 1000
MAX_PAYLOAD_CHARS = 8192


class QueueError(Exception):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def _now():
    return datetime.now(timezone.utc)


def enqueue(sender: str, recipient: str, msg_id: str, payload: str) -> None:
    """Persist a message. Idempotent on (sender, msg_id)."""
    if len(payload) > MAX_PAYLOAD_CHARS:
        raise QueueError("too_large")
    db = SessionLocal()
    try:
        if db.get(User, recipient) is None:
            raise QueueError("unknown_recipient")
        if db.get(QueuedMessage, (sender, msg_id)) is not None:
            return  # replay: already persisted
        depth = (
            db.query(func.count())
            .select_from(QueuedMessage)
            .filter(QueuedMessage.recipient_phone == recipient)
            .scalar()
        )
        if depth >= MAX_QUEUE_PER_RECIPIENT:
            raise QueueError("recipient_queue_full")
        db.add(QueuedMessage(
            sender_phone=sender, id=msg_id, recipient_phone=recipient,
            payload=payload, expires_at=_now() + TTL,
        ))
        db.commit()
    except IntegrityError:
        db.rollback()  # concurrent replay of the same message: fine
    finally:
        db.close()


def pending_for(recipient: str, limit: int = 500) -> list[tuple[str, str, str]]:
    db = SessionLocal()
    try:
        rows = (
            db.query(QueuedMessage)
            .filter(QueuedMessage.recipient_phone == recipient)
            .order_by(QueuedMessage.created_at)
            .limit(limit)
            .all()
        )
        return [(r.sender_phone, r.id, r.payload) for r in rows]
    finally:
        db.close()


def ack(recipient: str, sender: str, msg_id: str) -> bool:
    """Delete a delivered message. Scoped to the recipient so nobody can
    delete someone else's queue. True only if a row was actually removed."""
    db = SessionLocal()
    try:
        n = (
            db.query(QueuedMessage)
            .filter(
                QueuedMessage.recipient_phone == recipient,
                QueuedMessage.sender_phone == sender,
                QueuedMessage.id == msg_id,
            )
            .delete()
        )
        db.commit()
        return n > 0
    finally:
        db.close()


def add_receipt(sender: str, msg_id: str) -> None:
    db = SessionLocal()
    try:
        db.merge(PendingReceipt(sender_phone=sender, message_id=msg_id,
                                expires_at=_now() + TTL))
        db.commit()
    finally:
        db.close()


def receipts_for(sender: str) -> list[str]:
    db = SessionLocal()
    try:
        return [r.message_id for r in
                db.query(PendingReceipt).filter(PendingReceipt.sender_phone == sender).all()]
    finally:
        db.close()


def delete_receipt(sender: str, msg_id: str) -> None:
    db = SessionLocal()
    try:
        db.query(PendingReceipt).filter(
            PendingReceipt.sender_phone == sender,
            PendingReceipt.message_id == msg_id,
        ).delete()
        db.commit()
    finally:
        db.close()


def purge_expired() -> tuple[int, int]:
    db = SessionLocal()
    try:
        now = _now()
        m = db.query(QueuedMessage).filter(QueuedMessage.expires_at < now).delete()
        r = db.query(PendingReceipt).filter(PendingReceipt.expires_at < now).delete()
        db.commit()
        return m, r
    finally:
        db.close()


def queue_depth() -> int:
    db = SessionLocal()
    try:
        return db.query(func.count()).select_from(QueuedMessage).scalar()
    finally:
        db.close()

'''The above code defines a message queue service for a chat application. 
It provides functions to enqueue messages, retrieve pending messages for a recipient, acknowledge delivered messages, 
add and retrieve delivery receipts, delete receipts, purge expired messages and receipts, 
and get the current queue depth. The service uses SQLAlchemy to interact with the database and defines custom exceptions for error handling.
The TTL (time-to-live) for messages and receipts is set to 30 days,
and there are limits on the maximum number of queued messages per recipient and the maximum payload size.'''