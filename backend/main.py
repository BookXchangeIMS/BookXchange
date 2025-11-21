from http import HTTPStatus

from fastapi import FastAPI, Depends, Form
from typing import Annotated
from backend.scripts.auth import *
from backend.config.db import get_db
app = FastAPI()


#==============================================================================================================
# TOKENIZED AUTHENTICATION
#==============================================================================================================
"""
Endpoints for user authentication and management:
- POST /api/sign_up: Handles user sign-up
- POST /api/sign_in: Authenticates a user and generates access and refresh tokens
- POST /api/refresh_access_token: Refreshes the access token using a valid refresh token
- POST /api/logout: Invalidates the refresh token associated with a user's access token
"""
@app.post("/api/sign_up", status_code=status.HTTP_201_CREATED)
async def sign_up(sign_up_form: Annotated[SignUp, Form()], db= Depends(get_db)):
    """
    Handles the user sign-up process. It checks if the email already exists in the database,
    and if not, creates the user account. Upon successful account creation, the function
    generates access and refresh tokens and stores the refresh token in the database.

    :param sign_up_form: The form data submitted by the user for sign-up
    :param db: A database session dependency
    :return: An instance of Tokens containing access and refresh tokens
    :raises HTTPException: Raised if the email already exists, there is an issue with storing
                           the refresh token, or there is an authentication failure
    """
    if check_if_email_exists(sign_up_form, db):
        raise HTTPException(status_code=409, detail="This email already exists")
    else:
        sign_user_up(sign_up_form, db)
        userid = get_userid_by_credentials(sign_up_form, db)
        if userid:
            access_token = create_access_token(SignIn(Email=sign_up_form.Email, PasswordHash=sign_up_form.PasswordHash).dict())
            refresh_token = create_refresh_token()
            if not store_refresh_token(refresh_token, userid, db):
                raise HTTPException(status_code=500, detail="Error storing refresh token")
            return Tokens(access_token=access_token, refresh_token=refresh_token)
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
            )

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
            raise HTTPException(status_code=500, detail="Error storing refresh token")
        return Tokens(access_token=access_token, refresh_token=refresh_token)
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )


@app.post("/api/refresh_access_token", response_model=Tokens, status_code=200)
async def refresh_access_token(token: str, db= Depends(get_db)):
    """
    Refresh the access token using a valid refresh token. This endpoint verifies the provided refresh token,
    fetches the user associated with it, and generates a new access token if the token is valid. If the token
    is invalid, the request returns an HTTP 401 Unauthorized error.

    :param token: The refresh token provided by the client. It is used to verify if the user session is valid.
    :type token: str
    :param db: A database session dependency injected by FastAPI.
    :type db: Session
    :return: A Tokens object containing the newly generated access token and the same refresh token.
    :rtype: Tokens
    :raises HTTPException: Raised with a 401 status code if the refresh token is invalid.
    """
    if verify_refresh_token(token, db):
        user_id = get_userid_by_refresh_token(token, db)
        user = get_user_by_id(user_id, db)
        access_token = create_access_token(SignIn(Email=user.Email, PasswordHash=user.PasswordHash).dict())
        return Tokens(access_token=access_token, refresh_token=token)
    else:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@app.post("/api/logout", status_code=204)
async def logout(tokens: Tokens, db= Depends(get_db)):
    """
    Logs out a user by invalidating their refresh token.

    This operation verifies the provided access token against a database. Upon a
    valid access token check, the associated refresh token is invalidated, logging
    out the user. If the access token is invalid, an HTTP 401 Unauthorized exception
    is raised.

    :param tokens: The authentication tokens used to validate and log out the user.
    :type tokens: Tokens
    :param db: A database connection dependency to validate tokens and perform logout operations.
    :type db: Callable or instance injected by FastAPI Dependency Injection
    :return: An operation to destroy the refresh token upon successful validation or
             raise an exception for an invalid token.
    :rtype: Operation or None
    """
    if verify_refresh_token(tokens.access_token, db):
        return destroy_refresh_token(tokens, db)
    else:
        raise HTTPException(status_code=401, detail="Invalid access token")
