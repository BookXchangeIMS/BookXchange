from datetime import datetime, timedelta
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from .models import *

# JWT Configuration
SECRET_KEY = "your-secret-key"  # In production, use a secure secret key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# FastAPI app instance
app = FastAPI()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/sign_in")


# In-memory user database (replace with a real database in production)
fake_users_db = {}


def create_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


@app.post("/api/sign_up", response_model=Token)
async def sign_up(user: User):
    if user.username in fake_users_db:
        raise HTTPException(
            status_code=400,
            detail="Username already registered"
        )
    hashed_password = pwd_context.hash(user.password)
    fake_users_db[user.username] = {
        "username": user.username,
        "email": user.email,
        "hashed_password": hashed_password
    }
    access_token = create_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    refresh_token = create_token(
        data={"sub": user.username},
        expires_delta=timedelta(days=7)
    )
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


@app.post("/api/sign_in", response_model=Token)
async def sign_in(form_data: OAuth2PasswordRequestForm = Depends()):
    user = fake_users_db.get(form_data.username)
    if not user or not pwd_context.verify(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_token(
        data={"sub": form_data.username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    refresh_token = create_token(
        data={"sub": form_data.username},
        expires_delta=timedelta(days=7)
    )
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


@app.post("/api/refresh_access_token", response_model=Token)
async def refresh_access_token(refresh_token: str):
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    if username not in fake_users_db:
        raise HTTPException(status_code=401, detail="User not found")

    access_token = create_token(
        data={"sub": username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    new_refresh_token = create_token(
        data={"sub": username},
        expires_delta=timedelta(days=7)
    )
    return {"access_token": access_token, "refresh_token": new_refresh_token, "token_type": "bearer"}


@app.post("/api/logout")
async def logout(token: str = Depends(oauth2_scheme)):
    # In a real application, you would invalidate the token here
    # For this example, we'll just return a success message
    return {"message": "Successfully logged out"}
