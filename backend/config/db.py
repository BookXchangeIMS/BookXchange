from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import sessionmaker
import os
from backend.config.config import Settings

# Use DATABASE_URL from environment variable if available
# Falls back to local Docker setup for development
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    f"mssql+pyodbc://sa:{Settings.SA_PASSWORD}@sqlserver2022:1433/BookXchange?driver=ODBC+Driver+18+for+SQL+Server&Encrypt=no"
)

engine = create_engine(DATABASE_URL)

# Fetching schema from the db
metadata = MetaData()
metadata.reflect(bind=engine)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
