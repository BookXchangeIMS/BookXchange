from datetime import datetime, timedelta
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, status, Form
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from typing import Annotated
from .models import *
from .auth import *
app = FastAPI()

@app.post("/api/sign_up", status_code=status.HTTP_201_CREATED)
async def sign_up(sign_up_form: Annotated[SignUp, Form()]):
    """
    Handle the user sign-up process by accepting user details through the
    sign-up form and creating a new user.

    :param sign_up_form: Container holding user details required for sign-up.
    :type sign_up_form: SignUp
    :return: Status code indicating the success of the sign-up process.
    :rtype: dict
    """
    return sign_user_up(sign_up_form)


@app.post("/api/sign_in")
async def sign_in(login_data: Annotated[SignIn, Form()]):
    if verify_credentials(login_data):
        return create_access_token(login_data.dict())
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )


@app.post("/api/refresh_access_token")
async def refresh_access_token(token: str):
    return verify_token(token)


@app.post("/api/logout")
async def logout(refresh_token: str):
    pass