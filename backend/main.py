from datetime import datetime, timedelta
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from .models import *
app = FastAPI()

@app.post("/api/sign_up")
async def sign_up():
    pass


@app.post("/api/sign_in", response_model=Token)
async def sign_in():
    pass


@app.post("/api/refresh_access_token", response_model=Token)
async def refresh_access_token():
    pass


@app.post("/api/logout")
async def logout():
    pass