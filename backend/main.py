from datetime import datetime, timedelta
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from .models import *
from .auth import *
app = FastAPI()

@app.post("/api/sign_up", status_code=status.HTTP_201_CREATED)
async def sign_up(sign_up_form: SignUp):
    return create_access_token(sign_up_form.dict())


@app.post("/api/sign_in", response_model=Tokens)
async def sign_in():
    pass


@app.post("/api/refresh_access_token")
async def refresh_access_token(token):
    return verify_token(token)


@app.post("/api/logout")
async def logout():
    pass