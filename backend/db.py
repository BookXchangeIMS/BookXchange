from sqlalchemy import create_engine, MetaData, Table
from sqlalchemy.orm import sessionmaker, Session
from .config import *

DATABASE_URL = f"mssql+pyodbc://sa:{Settings.SA_PASSWORD}@localhost:1433/BookXchange?driver=ODBC+Driver+18+for+SQL+Server&Encrypt=no"

engine = create_engine(DATABASE_URL)
metadata = MetaData()
metadata.reflect(bind=engine)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
