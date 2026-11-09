from sqlalchemy import Column, Index, String, Text, DateTime, ForeignKey, CheckConstraint,Integer,func
from app.database import Base

class QueuedMessage(Base):
    """Undelivered messages only. Row is deleted when the recipient acks."""
    __tablename__ = "queued_messages"
#__tablename__ = "queued_messages" means that the name of the table in the database will be "queued_messages". 
#This is the name that will be used to create the table and to reference it in queries.
    __table_args__ = (
        CheckConstraint("length(payload) <= 8192", name = "ck_payload_size"),
        Index("ix_queue_recipient_created", "recipient_phone","created_at"),
    )
    #__table_args__ is a special attribute that allows you to specify additional options for the table, such as constraints and indexes. 
    #In this case, it defines a check constraint to ensure that the length of the payload does not exceed 8192 characters and creates an index on the recipient_phone and created_at columns.
    sender_phone = Column(String, ForeignKey("users.phone_number"),primary_key = True)
    id = Column(String(64), primary_key = True)
    recipient_phone = Column(String, ForeignKey("users.phone_number"), nullable = False)
    payload = Column(Text, nullable = False)
    created_at = Column(DateTime(timezone = True), server_default = func.now(), nullable = False)
    expires_at = Column(DateTime(timezone = True), nullable = False)
    #Foreign key is a key that establishes a relationship between two tables in a database. In this case, the sender_phone and recipient_phone columns are foreign keys that reference the phone_number column in the users table.
    '''The above block of code defines the columns of the queued_messages table. 
    Each column is represented by a Column object, which specifies the data type, constraints, and other properties of the column.
    The sender_phone and id columns are defined as primary keys, while the recipient_phone column is defined as a foreign key that references the phone_number column in the users table. 
    The payload column is defined as a Text type, which can store large amounts of text data. The created_at and expires_at columns are defined as DateTime types with timezone support, 
    and the created_at column has a default value of the current timestamp.'''

class PendingReceipt(Base):
    '''Delivered notice waiting for an offline sender. Deleted when the sender acks.'''
    __tablename__ = "pending_receipts"
    sender_phone = Column(String,ForeignKey("users.phone_number"), primary_key = True)
    id = Column(String(64), primary_key = True)
    recipient_phone = Column(String, ForeignKey("users.phone_number"), nullable = False)
    payload = Column(Text, nullable = False)
    created_at = Column(DateTime(timezone = True), server_default = func.now(), nullable = False)
    expires_at = Column(DateTime(timezone = True), nullable = False)

    '''The above block of code defines the PendingReceipt class, which represents a table in the database called "pending_receipts".
The class inherits from the Base class, which is defined in the app.database module and is used to create the database tables. The PendingReceipt class has several attributes that correspond to columns in the "pending_receipts" table, including sender_phone, id, recipient_phone, payload, created_at, and expires_at.
The sender_phone and id attributes are defined as primary keys,
 while the recipient_phone attribute is defined as a foreign key that references the phone_number column in the users table. The payload attribute is defined as a Text type, which can store large amounts of text data. The created_at and expires_at attributes are defined as DateTime types with timezone support, and the created_at attribute has a default value of the current timestamp.'''
