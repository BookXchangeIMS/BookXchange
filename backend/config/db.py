from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import sessionmaker
from backend.config.config import *

# Inside of container Testing
#Azure change on docker-compose.yml aswell
#DATABASE_URL = f"mssql+pyodbc://vertex:{Settings.SA_PASSWORD}@sqlserver2022.database.windows.net:1433/BookXchange?driver=ODBC+Driver+18+for+SQL+Server&Encrypt=yes&TrustServerCertificate=no&Connection+Timeout=30"
#Docker
DATABASE_URL = f"mssql+pyodbc://SA:{Settings.SA_PASSWORD}@sqlserver:1433/BookXchange?driver=ODBC+Driver+18+for+SQL+Server&Encrypt=yes&TrustServerCertificate=yes&Connection+Timeout=30"
# Out of container Testing
#DATABASE_URL = f"mssql+pyodbc://sa:{Settings.SA_PASSWORD}@localhost:1433/BookXchange?driver=ODBC+Driver+18+for+SQL+Server&Encrypt=no"

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
