from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi import HTTPException, status
from sqlalchemy import select
import uuid

from .config import Settings
from .models import *
from .db import metadata

# Fetching Config file
SECRET_KEY = Settings().SECRET_KEY
ALGORITHM = Settings().ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = Settings().ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = Settings().REFRESH_TOKEN_EXPIRE_DAYS

def get_userid_by_credentials(data: SignIn, db):
    users = metadata.tables["Users"]
    stmt = select(users).where(users.c.Email == data.Email).where(users.c.PasswordHash == data.PasswordHash)
    row = db.execute(stmt).fetchone()
    return row.UserID if row else None

def check_if_user_exists(data: SignUp):
    pass

def sign_user_up(data: SignUp):
    pass

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# REFRESH TOKENS ========================================

def create_refresh_token():
    return str(uuid.uuid4())

def store_refresh_token(refresh_token, userid, db):
    refreshtokens = metadata.tables["RefreshTokens"]
    stmt = refreshtokens.insert().values(
        UserID=userid,
        TokenValue=refresh_token,
        CreationDate=datetime.now(),
        ExpirationDate=datetime.now() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    try:
        db.execute(stmt)
        db.commit()
        return True
    except Exception as e:
        return False
#=======================================================
def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
