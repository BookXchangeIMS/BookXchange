from http import HTTPStatus

from fastapi import FastAPI, Depends, Form, Header
from typing import Annotated
from backend.scripts.auth import *
from backend.scripts.profile_crud import *
from backend.config.db import get_db

tags_metadata = [
    {
        "name": "Authentication",
        "description": "Operations with user's authentication. The **login** logic is here.",
    },
    {
        "name": "Profile",
        "description": "Operations with user's profile that are not related to authentication.",
    },
    {
        "name": "Preferences",
        "description": "Operations with user's preferences in genres.",
    },
]
app = FastAPI(openapi_tags=tags_metadata)


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
@app.post("/api/sign_up", status_code=status.HTTP_201_CREATED, tags=["Authentication"], response_model=Tokens)
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

@app.post("/api/sign_in", response_model=Tokens, status_code=status.HTTP_200_OK, tags=["Authentication"])
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


@app.get("/api/refresh_access_token", response_model=Tokens, status_code=status.HTTP_200_OK, tags=["Authentication"])
async def refresh_access_token(token: str = Header(None), db= Depends(get_db)):
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


@app.delete("/api/logout", status_code=status.HTTP_204_NO_CONTENT, tags=["Authentication"])
async def logout(tokens: Tokens = Header(None), db= Depends(get_db)):
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

@app.get("/api/does_user_exist", status_code=status.HTTP_200_OK, tags=["Authentication"])
async def does_user_exist(email: str = Form(...), db= Depends(get_db)):
    """
    For the 1-st step of the registration process on the page, this endpoint checks if the provided email address already exists in the system.

    :param email: The email address to verify.
    :type email: str
    :param db: Database session used for querying and operations.
    :type db: Any
    :return: A result indicating whether the email exists in the system.
    :rtype: Any
    """
    if check_if_email_exists(SignUp(Name="", Email=email, PasswordHash=""), db):
        raise HTTPException(status_code=409, detail="This email already exists")
    else:
        return False

# ===================================================================================================================
# PREFERENCES ENDPOINTS
# ===================================================================================================================
@app.post("/api/post_preferences", status_code=status.HTTP_201_CREATED, tags=["Preferences"])
async def post_preferences(preferences: list[str], access_token: str = Header(None), db= Depends(get_db)):
    """
    Post user preferences based on access token and save them to the database.

    This function takes an access token, retrieves the associated user ID, and uses it
    to store the given user preferences to the database. The function returns the result
    of the operation performed on the database.

    :param access_token: A string representing the user's access token for authentication.
    :param preferences: A list of strings representing the user's preferences to be saved.
    :param db: Database dependency for managing database connection and operations.
    :return: Result of storing user preferences in the database.
    """
    userid = get_userid_by_access_token(access_token, db)
    return post_preferences_by_userid(userid, preferences, db)

@app.get("/api/get_preferences", status_code=status.HTTP_200_OK, response_model=list[str], tags=["Preferences"])
async def get_preferences(access_token: str = Header(None), db= Depends(get_db)):
    """
    Post user preferences based on access token and save them to the database.

    This function takes an access token, retrieves the associated user ID, and uses it
    to store the given user preferences to the database. The function returns the result
    of the operation performed on the database.

    :param access_token: A string representing the user's access token for authentication.
    :param preferences: A list of strings representing the user's preferences to be saved.
    :param db: Database dependency for managing database connection and operations.
    :return: Result of storing user preferences in the database.
    """
    userid = get_userid_by_access_token(access_token, db)
    return get_preferences_by_userid(userid, db)

@app.delete("/api/delete_preferences", status_code=status.HTTP_204_NO_CONTENT, tags=["Preferences"])
async def delete_preference(genre_name: str, access_token: str = Header(None), db= Depends(get_db)):
    """
    Deletes a user's preference for a given genre.

    This endpoint removes a genre preference for a user based on the provided `access_token` and `genre_name`.
    The operation interacts with the database to find the user by their associated access token
    and delete their specified preference.

    :param access_token: The access token of the user used for authentication.
    :type access_token: str
    :param genre_name: The name of the genre to delete from the user's preferences.
    :type genre_name: str
    :param db: A database session dependency used for interacting with the database.
    :type db: Depends
    :return: None
    :rtype: None
    """
    userid = get_userid_by_access_token(access_token, db)
    return delete_preference_by_userid(userid, genre_name, db)

# ===================================================================================================================
# PROFILE ENDPOINTS
# ===================================================================================================================

@app.get("/api/get_profile", response_model=GetUser, status_code=status.HTTP_200_OK, tags=["Profile"])
async def get_profile(access_token: str = Header(None), db= Depends(get_db)):
    """
    Retrieve the profile of a user based on the provided access token.

    This API endpoint fetches user profile details using the supplied access token
    and database connection. It returns user-specific information such as UserID,
    ProfileImagePath, UserRole, and AboutMe fields.

    :param access_token: Access token to identify and authenticate the user.
    :type access_token: str
    :param db: Database connection dependency for fetching user details.
    :type db: sqlalchemy.orm.Session
    :return: User profile information with fields UserID, ProfileImagePath,
        UserRole, and AboutMe.
    :rtype: GetUser
    """
    userid = get_userid_by_access_token(access_token, db)
    user_data = get_user_by_id(userid, db)
    return GetUser(
        UserID=user_data.UserID,
        Name=user_data.Name,
        ProfileImagePath=user_data.ProfileImagePath,
        UserRole=user_data.UserRole,
        AboutMe=user_data.AboutMe,
    )

@app.put("/api/update_profile", response_model=UpdateUser, status_code=status.HTTP_200_OK, tags=["Profile"])
async def get_profile(new_info: UpdateUser, access_token: str = Header(None), db= Depends(get_db)):
    userid = get_userid_by_access_token(access_token, db)
    return update_profile_by_userid(userid, new_info, db)



