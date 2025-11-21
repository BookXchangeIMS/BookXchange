from fastapi import FastAPI, Depends, HTTPException, status, Form
from typing import Annotated
from .models import *
from .auth import *
from .db import get_db
app = FastAPI()

@app.post("/api/sign_up", status_code=status.HTTP_201_CREATED)
async def sign_up(sign_up_form: Annotated[SignUp, Form()], db= Depends(get_db)):
    """
    Handle the user sign-up process by accepting user details through the
    sign-up form and creating a new user.

    :param sign_up_form: Container holding user details required for sign-up.
    :type sign_up_form: SignUp
    :return: Status code indicating the success of the sign-up process.
    :rtype: dict
    """
    return sign_user_up(sign_up_form, db)

@app.post("/api/sign_in")
async def sign_in(login_data: Annotated[SignIn, Form()],db= Depends(get_db)):
    userid = get_userid_by_credentials(login_data, db)
    if userid:
        access_token = create_access_token(login_data.dict())
        refresh_token = create_refresh_token()
        if not store_refresh_token(refresh_token, userid, db):
            return "problem"
        return Tokens(access_token=access_token, refresh_token=refresh_token)
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