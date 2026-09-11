from sqlachemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings

## SQLAlchemy specific code, as with any other app
#This is the database URL that SQLAlchemy will use for the connection
#The database URL is retrieved from the settings object, which is an instance of the Settings class defined in config.py. The settings object reads the database_url from environment variables or a .env file, allowing for easy configuration of the database connection.
engine = create_engine(settings.database_url, connect_args ={"Check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# This three code snippets are related to the configuration and setup of a database connection in a Python 
# application using SQLAlchemy and Pydantic.


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()