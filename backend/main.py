from fastapi import FastAPI, Depends, Form
from typing import Annotated
from backend.scripts.auth import *
from backend.config.db import get_db
app = FastAPI()

@app.post("/api/sign_up", status_code=status.HTTP_201_CREATED)
async def sign_up(sign_up_form: Annotated[SignUp, Form()], db= Depends(get_db)):
    pass

@app.post("/api/sign_in", response_model=Tokens, status_code=status.HTTP_200_OK)
async def sign_in(login_data: Annotated[SignIn, Form()],db= Depends(get_db)):
    """
    Authenticates a user by validating provided credentials. If the credentials
    match an existing user, generates and returns access and refresh tokens.
    The refresh token is stored in the database for future validation. In case
    no match is found for the provided credentials, an HTTP error with status
    401 is raised.

    :param login_data: Object containing user login data such as username and
                       password.
    :type login_data: Annotated[SignIn, Form()]
    :param db: Dependency object to interface with the database.
    :type db: Depends
    :return: A Tokens object containing the generated access and refresh tokens
             when authentication is successful, or a message indicating an issue
             with storing the refresh token.
    :rtype: Tokens or str
    """
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
    return verify_access_token(token)


@app.post("/api/logout")
async def logout(refresh_token: str):
    pass