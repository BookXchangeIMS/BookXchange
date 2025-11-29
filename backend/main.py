from http import HTTPStatus

from fastapi import FastAPI, Depends, Form, Header
from typing import Annotated
from backend.scripts.auth import *
from backend.scripts.profile_crud import *
from backend.config.db import get_db
from backend.scripts.location_scripts import *

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

# Configure CORS to allow frontend requests
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
@app.post("/api/sign_up", status_code=status.HTTP_201_CREATED, response_model= Tokens, tags=["Authentication"])
async def sign_up(sign_up_form: Annotated[SignUp, Form()], db= Depends(get_db)):
    """
    Handles user sign-up by creating a new user account, storing their information, and
    generating access and refresh tokens. This endpoint also validates if the email already
    exists in the database, ensures the user's location is added to the database, and securely
    saves refresh tokens for future use.

    :param sign_up_form: The form containing user sign-up information such as name, email,
        password hash, and location address.
    :type sign_up_form: Annotated[SignUp, Form()]
    :param db: The database session dependency used to perform various database operations.
    :type db: Dependency (Session)

    :return: A token object containing access and refresh tokens for the signed-up user.
    :rtype: Tokens
    """
    if check_if_email_exists(sign_up_form.Email, db):
        raise HTTPException(status_code=409, detail="This email already exists")
    else:
        latitude, longitude = address_to_coordinates(sign_up_form.LocationAddress)
        locationid = post_location(Location(
            Latitude=latitude,
            Longitude=longitude,
            Address=sign_up_form.LocationAddress,
            Description=""), db)
        sign_user_up(sign_up_form, locationid, db)
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
async def does_user_exist(email: str, db= Depends(get_db)):
    """
    For the 1-st step of the registration process on the page, this endpoint checks if the provided email address already exists in the system.

    :param email: The email address to verify.
    :type email: str
    :param db: Database session used for querying and operations.
    :type db: Any
    :return: A result indicating whether the email exists in the system.
    :rtype: Any
    """
    return check_if_email_exists(email=email, db=db)

# ===================================================================================================================
# PREFERENCES ENDPOINTS
# ===================================================================================================================

"""
Endpoints for user preferences:
- POST /api/post_preferences: Stores user preferences based on access token and genre names.
- GET /api/get_preferences: Retrieves user preferences based on access token.
- DELETE /api/delete_preferences: Deletes a user's preference for a given genre.
"""
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
"""
Endpoints for user profile management:
- GET /api/get_your_profile: Retrieves the authenticated user's profile information.
- GET /api/get_profile: Retrieves the profile information for a given user ID.
- PUT /api/update_profile: Updates a user's profile information based on the provided details.
- DELETE /api/delete_profile: Deletes a user's profile based on their access token.
"""
@app.get("/api/get_your_profile", response_model=GetMyUser, status_code=status.HTTP_200_OK, tags=["Profile"])
async def get_your_profile(access_token: str = Header(None), db= Depends(get_db)):
    """
    Fetches the authenticated user's profile information.

    This function retrieves user profile details for an authenticated user
    by verifying their access token. It queries the database to get the
    user details, their location information, and compiles it into a
    response model.

    :param access_token: The token provided for authentication to verify the user's identity.
    :type access_token: str
    :param db: A database session dependency used to interact with the application database.
    :type db: sqlalchemy.orm.Session

    :return: The user's profile information including UserID, Email, Name,
        Profile ImagePath, Role, AboutMe, Account Creation Date, and Location details.
    :rtype: GetMyUser
    """
    userid = get_userid_by_access_token(access_token, db)
    user_data = get_user_by_id(userid, db)
    location = get_location_by_id(user_data.LocationID, db)
    return GetMyUser(
        UserID=user_data.UserID,
        Email=user_data.Email,
        Name=user_data.Name,
        ProfileImagePath=user_data.ProfileImagePath,
        UserRole=user_data.UserRole,
        AboutMe=user_data.AboutMe,
        CreationDate=user_data.CreationDate,
        Location= Location(Longitude=location.Longitude,
                           Latitude=location.Latitude,
                           Address=location.Address,
                           Description=location.Description)
    )

@app.get("/api/get_profile", response_model=GetUser, status_code=status.HTTP_200_OK, tags=["Profile"])
async def get_profile(userid: int, access_token: str = Header(None), db= Depends(get_db)):
    """
    Fetches the user's profile associated with the given user ID. The API checks for
    authentication using the provided access token. If the access token is valid
    and the user exists in the database, the user's profile details are retrieved
    and returned.

    :param userid: The ID of the user whose profile is being retrieved.
    :type userid: int
    :param access_token: JWT access token provided for authentication.
    :type access_token: str
    :param db: Database session dependency for the operation.
    :type db: Session
    :return: A dictionary containing the user's profile details if the access
        token is valid and the user exists.
    :rtype: GetUser
    :raises HTTPException: Raised with a 401 status code if the access token is
        invalid.
    """
    if verify_access_token(access_token):
        user_data = get_user_by_id(userid, db)
        return GetUser(
            UserID=user_data.UserID,
            Name=user_data.Name,
            ProfileImagePath=user_data.ProfileImagePath,
            UserRole=user_data.UserRole,
            AboutMe=user_data.AboutMe,
        )
    else:
        raise HTTPException(status_code=401, detail="Invalid access token")

@app.put("/api/update_profile", response_model=UpdateUser, status_code=status.HTTP_200_OK, tags=["Profile"])
async def update_profile(new_info: UpdateUser, access_token: str = Header(None), db= Depends(get_db)):
    """
    Updates a user's profile information based on the provided details such as location and address.
    It ensures the user is authorized via the `access_token` and utilizes the database dependency to
    update the user's data. The new location is converted to geographic coordinates before updating.

    :param new_info: An instance of `UpdateUser` containing the updated user information.
    :param access_token: A string representing the user's access token for authorization.
    :param db: Database dependency injected for database operations.
    :return: Updated user profile information as an instance of `UpdateUser`.

    """
    userid = get_userid_by_access_token(access_token, db)
    latitude, longitude = address_to_coordinates(new_info.LocationAddress)
    new_locationid = post_location(Location(
        Latitude=latitude,
        Longitude=longitude,
        Address=new_info.LocationAddress,
        Description=""), db)
    return update_profile_by_userid(userid, new_info, new_locationid, db)

@app.delete("/api/delete_profile", status_code=status.HTTP_204_NO_CONTENT, tags=["Profile"])
async def delete_profile(tokens: Tokens = Header(None), db= Depends(get_db)):
    """
    Deletes a user profile based on the provided access token.

    This function is an API endpoint that deletes a user profile by resolving
    the user's ID from the provided access token. The database session is used
    to perform the deletion operation. If the user profile is successfully
    deleted, the endpoint will return a 204 No Content HTTP status code.

    :param tokens: The ``Tokens`` object containing the access token
                   provided in the request header.
    :param db: The database session dependency provided by the ``get_db``
               function.
    :return: None
    """
    userid = get_userid_by_access_token(tokens.access_token, db)
    return delete_profile_by_userid(userid, db)




