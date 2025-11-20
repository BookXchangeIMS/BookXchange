from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi import HTTPException, status
from .config import Settings
from .models import *
import uuid

SECRET_KEY = Settings().SECRET_KEY
ALGORITHM = Settings().ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = Settings().ACCESS_TOKEN_EXPIRE_MINUTES

dummy_user_dict = [
    User(
        UserID=1,
        Email="mail",
        PasswordHash="123",
        Name="john",
        ProfileImagePath= "image.png",
        UserRole= "admin",
        AboutMe= "",
        CreationDate=datetime.now()
    )
]

def verify_credentials(data: SignIn):
    for user in dummy_user_dict:
        if user.Email == data.Email and user.PasswordHash == data.PasswordHash:
            return True
    return False

def check_if_user_exists(data: SignUp):
    for user in dummy_user_dict:
        if user.Email == data.Email:
            return True
    return False

def sign_user_up(data: SignUp):
    if check_if_user_exists(data):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already exists",
        )
    else:
        new_user = User(
            UserID=len(dummy_user_dict) + 1,
            Email=data.Email,
            Name= data.Name,
            PasswordHash= data.PasswordHash,
            ProfileImagePath= "image.png",
            UserRole= "user",
            AboutMe= "",
            CreationDate=datetime.now()
        )
        dummy_user_dict.append(new_user)
        return create_access_token(data.dict())

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token():
    return str(uuid.uuid4())

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
