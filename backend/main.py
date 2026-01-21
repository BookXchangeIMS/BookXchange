import asyncio

# Load environment variables from .env file (for local development)
# In production (Azure), environment variables are set in App Service Configuration
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Depends, Form, Header, UploadFile, File, WebSocket, WebSocketDisconnect, status, Query, Request
from collections import defaultdict
from typing import Annotated, Dict, Set

from starlette.responses import FileResponse, Response
from starlette.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from backend.scripts.auth import *
from backend.scripts.chat_crud import *
from backend.scripts.image_management import *
from backend.scripts.profile_crud import *
from backend.config.db import get_db, SessionLocal
from backend.scripts.location_scripts import *
from backend.scripts.listings_crud import *
from backend.scripts.ai_service import analyze_book_image
from fastapi import UploadFile, File
from backend.scripts.transactions_crud import *
from backend.scripts.google_auth import router as google_auth_router
from backend.scripts.gamification import get_leaderboard, award_points


from datetime import datetime

import os
from urllib.parse import urlencode
import requests
from fastapi import HTTPException
from starlette.responses import RedirectResponse, JSONResponse

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
    {
        "name": "Listings",
        "description": "Operations concerned with listings",
    },
    {
        "name": "Favorites",
        "description": "Operations concerned with favorite listings",
    },
    {
        "name": "Images",
        "description": "Operations concerned with Image files",
    },
    {
        "name": "Messages",
        "description": "Operations concerned with sending and seeing messages",
    },
    {
        "name": "Handshakes",
        "description": "Operations concerned with confirmation of transactions",
    },
    {
        "name": "Transactions",
        "description": "Operations concerned with seeing transactions history",
    },
    {
        "name": "Gamification",
        "description": "Operations for points, levels, and leaderboard",
    },
]
app = FastAPI(openapi_tags=tags_metadata)


# Use .get() to provide fallback and prevent KeyError during import
# These are also defined in google_auth.py, but keeping them here for backward compatibility
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "")

app.include_router(google_auth_router)

# Configure CORS to allow frontend requests
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Azure Blob Storage containers on startup
@app.on_event("startup")
async def startup_event():
    """Initialize Azure Blob Storage containers on application startup"""
    try:
        from backend.config.azure_storage import ensure_containers_exist
        ensure_containers_exist()
        print("✅ Azure Blob Storage containers initialized")
    except Exception as e:
        print(f"⚠️  Warning: Could not initialize Azure Blob Storage: {e}")
        print("   Make sure AZURE_STORAGE_CONNECTION_STRING is configured")


# Static files configuration
# NOTE: Commented for Azure deployment - frontend is served separately
# app.mount("/static", StaticFiles(directory="frontend/static"), name="static")

# Templates configuration  
# NOTE: Commented for Azure deployment - backend is API-only
# templates = Jinja2Templates(directory="frontend/templates")


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
        UserRole=user_data.UserRole,
        AboutMe=user_data.AboutMe,
        ProfileImagePath=user_data.ProfileImagePath,
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
            UserRole=user_data.UserRole,
            AboutMe=user_data.AboutMe,
            ProfileImagePath=user_data.ProfileImagePath,
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
    
    # Get current user to preserve old location if needed
    current_user = get_user_by_id(userid, db)
    
    # Try to convert address to coordinates
    try:
        coordinates = address_to_coordinates(new_info.LocationAddress)
        if coordinates:
            latitude, longitude = coordinates
            # Create new location
            new_locationid = post_location(Location(
                Latitude=latitude,
                Longitude=longitude,
                Address=new_info.LocationAddress,
                Description=""), db)
        else:
            # Use old location if address conversion fails
            new_locationid = current_user.LocationID
    except Exception as e:
        # Use old location if any error occurs
        new_locationid = current_user.LocationID
    
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

# ===================================================================================================================
# LISTINGS ENDPOINTS
# ===================================================================================================================

@app.post("/api/post_listing", status_code=status.HTTP_201_CREATED, response_model=GetListing, tags=["Listings"])
async def post_listing(listing_form: PostListing, access_token = Header(None), db= Depends(get_db)):
    """
    Handles the creation of a new listing for a book by processing user input, calculating location
    coordinates, checking if the book exists in the database, and posting all relevant listing details.

    :param listing_form: Form data containing all necessary details required to create a new listing.
    :type listing_form: PostListing
    :param access_token: The user's authentication token extracted from the request headers.
    :type access_token: str
    :param db: Dependency injection for the database session.
    :type db: sqlalchemy.orm.Session
    :return: A response model of the created listing, including its associated book, user, and location
             details.
    :rtype: GetListing
    """
    try:
        print(f"DEBUG: Starting post_listing for {listing_form.Book.Title}")
        userid = get_userid_by_access_token(access_token, db)
        print(f"DEBUG: Got userid: {userid}")
        
        coordinates = address_to_coordinates(listing_form.LocationAddress)
        if coordinates:
            latitude, longitude = coordinates
        else:
            latitude, longitude = 0.0, 0.0
        new_location = Location(
            Latitude=latitude,
            Longitude=longitude,
            Address=listing_form.LocationAddress,
            Description="")
        new_locationid = post_location(new_location, db)
        print(f"DEBUG: Created location: {new_locationid}")
        
        new_bookid = get_bookid_by_isbn(listing_form.Book.ISBN, db)
        if not new_bookid:
            print(f"DEBUG: Book not found, creating new book...")
            print(f"DEBUG: Book data - Title: {listing_form.Book.Title}, Authors: {listing_form.Book.Author}, Genres: {listing_form.Book.Genre}")
            new_bookid = post_book(listing_form.Book, db)
            print(f"DEBUG: Created book with ID: {new_bookid}")
        else:
            print(f"DEBUG: Book already exists with ID: {new_bookid}")
            
        post_new_listing(listing_form, userid, new_locationid, new_bookid, db)
        listingid = get_listingid_by_userid_and_bookit(userid, new_bookid, db)
        new_listing = get_listing_by_listingid(listingid, db)
        user = get_user_by_id(userid, db)
        return GetListing(
            ListingID=listingid,
            ListingType=new_listing.ListingType,
            Description=new_listing.Description,
            Price=new_listing.Price,
            BookCondition=new_listing.Condition,
            Status=new_listing.ListingState,
            CreationDate=new_listing.CreationDate,
            Location=new_location,
            Book=GetBook(
                Title=listing_form.Book.Title,
                Language=listing_form.Book.Language,
                ReleaseDate=listing_form.Book.ReleaseDate,
                ISBN=listing_form.Book.ISBN,
                AvgRating=listing_form.Book.AvgRating,
                Edition=listing_form.Book.Edition,
                Author= listing_form.Book.Author,
                Genre= listing_form.Book.Genre
            ),
            User=GetUser(
                Name=user.Name,
                AboutMe=user.AboutMe,
                UserRole=user.UserRole,
                UserID=user.UserID,
                ProfileImagePath=user.ProfileImagePath
            ),
            IsFavorite=False
        )
    except Exception as e:
        print(f"ERROR in post_listing: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise

@app.get("/api/get_users_listings", status_code=status.HTTP_200_OK, response_model=list[GetListing],
         tags=["Listings"])
async def get_users_listings(user_id: int, access_token=Header(None), db=Depends(get_db)):
    """
    Retrieve a list of listings created by a specified user. This endpoint collects
    the user's listings, including detailed book, location, and user metadata, and
    returns them in a structured response format.

    :param user_id: ID of the user whose listings are being fetched
    :type user_id: int
    :param access_token: Access token required for authentication and verification
    :type access_token: str, optional
    :param db: Database session dependency for performing database operations
    :type db: sqlalchemy.orm.Session
    :return: A list of listings created by the specified user, each containing book
        details, the user's profile, and the location of the listing
    :rtype: list[GetListing]
    """
    youruserid = get_userid_by_access_token(access_token, db)
    listings = get_listings_by_userid(user_id, db)
    result = []
    user = get_user_by_id(user_id, db)
    for listing in listings:
        book = get_book_by_id(listing.BookID, db)
        location = get_location_by_id(listing.LocationID, db)
        is_favorite = check_if_listing_is_favorite(listing.ListingID, youruserid, db)
        result.append(GetListing(
            ListingID=listing.ListingID,
            ListingType=listing.ListingType,
            Description=listing.Description,
            Price=listing.Price,
            BookCondition=listing.Condition,
            Status=listing.ListingState,
            CreationDate=listing.CreationDate,
            IsFavorite=is_favorite,
            Location=Location(
                Longitude=location.Longitude,
                Latitude=location.Latitude,
                Address=location.Address,
                Description=location.Description
            ),
            Book=GetBook(
                Title=book.Title,
                Language=book.Language,
                ReleaseDate=book.ReleaseDate,
                ISBN=book.ISBN,
                AvgRating=book.AvgRating,
                Edition=book.Edition,
                Author=get_author_by_bookid(book.BookID, db),
                Genre=get_genre_by_bookid(book.BookID, db)
            ),
            User=GetUser(
                Name=user.Name,
                AboutMe=user.AboutMe,
                UserRole=user.UserRole,
                UserID=user.UserID,
                ProfileImagePath=user.ProfileImagePath
            )
        ))
    return result


@app.get("/api/get_your_listings", status_code=status.HTTP_200_OK, response_model=list[GetListing], tags=["Listings"])
async def get_your_listings(access_token=Header(None), db=Depends(get_db)):
    """
    Retrieve the list of listings associated with the authenticated user.

    This endpoint allows users to fetch the listings associated with their account,
    based on the provided access token. It validates the access token to determine
    the user's identity and subsequently retrieves the listings from the database.

    :param access_token: The access token used for authentication and user identification.
                         It should be passed in the request header.
    :type access_token: str
    :param db: A dependency-injected database session used for performing database
               operations.
    :type db: sqlalchemy.orm.Session
    :return: A list of user's listings, represented by models that conform to the
             GetListing response schema.
    :rtype: list[GetListing]
    """
    userid = get_userid_by_access_token(access_token, db)
    return await get_users_listings(userid, access_token, db)

@app.get("/api/get_all_listings", status_code=status.HTTP_200_OK, response_model=list[GetListing], tags=["Listings"])
async def get_all_listings_endpoint(access_token=Header(None), db=Depends(get_db)):
    """
    Retrieve all available listings from the database.
    
    This endpoint fetches all book listings regardless of who posted them, making it
    ideal for displaying all available books on the home page or marketplace view.
    The authenticated user's ID is used to determine which listings are marked as
    favorites for that user.
    
    :param access_token: The access token for user authentication
    :type access_token: str
    :param db: Database session dependency
    :type db: Session
    :return: A list of all listings with complete book, user, and location information
    :rtype: list[GetListing]
    """
    if access_token:
        try:
            userid = get_userid_by_access_token(access_token, db)
        except:
            userid = None
    else:
        userid = None
        
    listings = get_all_listings(db)
    result = []
    
    for listing in listings:
        user = get_user_by_id(listing.UserID, db)
        book = get_book_by_id(listing.BookID, db)
        location = get_location_by_id(listing.LocationID, db)
        is_favorite = check_if_listing_is_favorite(listing.ListingID, userid, db)
        
        result.append(GetListing(
            ListingID=listing.ListingID,
            ListingType=listing.ListingType,
            Description=listing.Description,
            Price=listing.Price,
            BookCondition=listing.Condition,
            Status=listing.ListingState,
            CreationDate=listing.CreationDate,
            IsFavorite=is_favorite,
            Location=Location(
                Longitude=location.Longitude,
                Latitude=location.Latitude,
                Address=location.Address,
                Description=location.Description
            ),
            Book=GetBook(
                Title=book.Title,
                Language=book.Language,
                ReleaseDate=book.ReleaseDate,
                ISBN=book.ISBN,
                AvgRating=book.AvgRating,
                Edition=book.Edition,
                Author=get_author_by_bookid(book.BookID, db),
                Genre=get_genre_by_bookid(book.BookID, db)
            ),
            User=GetUser(
                Name=user.Name,
                AboutMe=user.AboutMe,
                UserRole=user.UserRole,
                UserID=user.UserID,
                ProfileImagePath=user.ProfileImagePath
            )
        ))
    return result

@app.get("/api/search_listings", status_code=status.HTTP_200_OK, response_model=list[GetListing], tags=["Listings"])
async def search_listings_endpoint(
    q: str = "",
    genres: list[str] = Query(None),
    min_price: float = None,
    max_price: float = None,
    listing_types: list[str] = Query(None),
    lat: float = None,
    lon: float = None,
    radius: float = None,
    access_token=Header(None), 
    db=Depends(get_db)
):
    """
    Search for listings by book title, ISBN, or author name, with optional filters including location.
    """
    if access_token:
        try:
            userid = get_userid_by_access_token(access_token, db)
        except:
            userid = None
    else:
        userid = None
        
    listings = search_listings(q, db, genres, min_price, max_price, listing_types, lat, lon, radius)
    result = []
    
    for listing in listings:
        user = get_user_by_id(listing.UserID, db)
        book = get_book_by_id(listing.BookID, db)
        location = get_location_by_id(listing.LocationID, db)
        is_favorite = check_if_listing_is_favorite(listing.ListingID, userid, db) if userid else False
        
        result.append(GetListing(
            ListingID=listing.ListingID,
            ListingType=listing.ListingType,
            Description=listing.Description,
            Price=listing.Price,
            BookCondition=listing.Condition,
            Status=listing.ListingState,
            CreationDate=listing.CreationDate,
            IsFavorite=is_favorite,
            Location=Location(
                Longitude=location.Longitude,
                Latitude=location.Latitude,
                Address=location.Address,
                Description=location.Description
            ),
            Book=GetBook(
                Title=book.Title,
                Language=book.Language,
                ReleaseDate=book.ReleaseDate,
                ISBN=book.ISBN,
                AvgRating=book.AvgRating,
                Edition=book.Edition,
                Author=get_author_by_bookid(book.BookID, db),
                Genre=get_genre_by_bookid(book.BookID, db)
            ),
            User=GetUser(
                Name=user.Name,
                AboutMe=user.AboutMe,
                UserRole=user.UserRole,
                UserID=user.UserID,
                ProfileImagePath=user.ProfileImagePath
            )
        ))
    return result

@app.get("/api/get_listing_by_ListingID", status_code=status.HTTP_200_OK, response_model=GetListing, tags=["Listings"])
async def get_listing(listing_id: int, access_token=Header(None), db=Depends(get_db)):
    """
    Fetch a listing by its unique identifier.

    This endpoint retrieves a specific listing based on the `listing_id`
    provided. An access token is required to verify the user's authorization.
    The database connection is also required to query the listing information.

    :param listing_id: Unique identifier for the listing to be retrieved
    :type listing_id: int
    :param access_token: Authorization token required to verify the user
    :type access_token: str (optional, retrieved via Header)
    :param db: Database connection dependency, used to fetch the listing
    :type db: sqlalchemy.orm.Session or equivalent
    :return: A detailed object representing the requested listing if the
        access token is valid
    :rtype: dict

    :raises HTTPException: If the access_token is invalid, an HTTP error
        with status code 401 is raised
    """
    userid = get_userid_by_access_token(access_token, db)
    listing = get_listing_by_listingid(listing_id, db)
    user = get_user_by_id(listing.UserID, db)
    book = get_book_by_id(listing.BookID, db)
    location = get_location_by_id(listing.LocationID, db)
    return GetListing(
        ListingID=listing.ListingID,
        ListingType=listing.ListingType,
        Description=listing.Description,
        Price=listing.Price,
        BookCondition=listing.Condition,
        Status=listing.ListingState,
        CreationDate=listing.CreationDate,
        Location=Location(
            Longitude=location.Longitude,
            Latitude=location.Latitude,
            Address=location.Address,
            Description=location.Description
        ),
        Book=GetBook(
            Title=book.Title,
            Language=book.Language,
            ReleaseDate=book.ReleaseDate,
            ISBN=book.ISBN,
            AvgRating=book.AvgRating,
            Edition=book.Edition,
            Author=get_author_by_bookid(book.BookID, db),
            Genre=get_genre_by_bookid(book.BookID, db)
        ),
        User=GetUser(
            Name=user.Name,
            AboutMe=user.AboutMe,
            UserRole=user.UserRole,
            UserID=user.UserID,
            ProfileImagePath=user.ProfileImagePath
        ),
        IsFavorite=check_if_listing_is_favorite(listing.ListingID, userid, db)
    )


@app.put("/api/update_listing", status_code=status.HTTP_200_OK, response_model= GetListing, tags=["Listings"])
async def update_listing(listing_form: UpdateListing, access_token = Header(None), db= Depends(get_db)):
    """
    Updates an existing listing with new information provided by the user.
    The function retrieves the user information using the provided access token
    and verifies if the user is authorized to update the listing. The location
    and book information are also updated or created if necessary. The updated
    listing information is then returned.

    :param listing_form: An instance of the UpdateListing model containing the updated
        details for the listing, including new location, book, and listing details.
    :param access_token: The user's authorization token passed as an HTTP header.
    :param db: The database session dependency to query and modify the database.
    :return: Returns an instance of the GetListing model with the updated listing
        details including location, book, and user information.
    :rtype: GetListing
    :raises HTTPException: Raises HTTPException with status code 401 if the user is
        unauthorized to update the listing.
    """
    userid = get_userid_by_access_token(access_token, db)
    listing = get_listing_by_listingid(listing_form.ListingID, db)
    if not(listing.UserID == userid):
        raise HTTPException(status_code=401, detail="Unauthorized to update this listing")
    latitude, longitude = address_to_coordinates(listing_form.LocationAddress)
    new_location = Location(
        Latitude=latitude,
        Longitude=longitude,
        Address=listing_form.LocationAddress,
        Description="")
    new_locationid = post_location(new_location, db)
    update_book(listing.BookID, listing_form.Book, db)
    update_new_listing(listing_form, new_locationid, listing.BookID, db)
    return await get_listing(listing_form.ListingID, access_token, db)


@app.delete("/api/delete_listing", status_code=status.HTTP_204_NO_CONTENT, tags=["Listings"])
async def delete_listing(listing_id: int, access_token = Header(None), db= Depends(get_db)):
    """
    Deletes a listing specified by its identifier if the provided access token is valid
    and the token's associated user is authorized to perform the deletion. The listing
    is deleted from the database upon authorization.

    :param listing_id: Identifier of the listing to be deleted
    :type listing_id: int
    :param access_token: Access token for authentication purposes
    :type access_token: str
    :param db: Database connection/session dependency
    :type db: function
    :return: Result of the delete operation indicating the deletion is complete
    :rtype: None
    """
    userid = get_userid_by_access_token(access_token, db)
    if not userid:
        raise HTTPException(status_code=401, detail="Unauthorized to delete this listing")
    listing = get_listing_by_listingid(listing_id, db)
    if userid != listing.UserID:
        raise HTTPException(status_code=401, detail="Unauthorized to delete this listing")
    return delete_new_listing(listing_id, db)


# ===================================================================================================================
# FAVORITES ENDPOINTS
# ===================================================================================================================

@app.get("/api/get_my_favorites", response_model=list[GetListing], status_code=status.HTTP_200_OK, tags=["Favorites"])
async def get_my_favorites(access_token: str = Header(None), db= Depends(get_db)):
    """
    Retrieves all favorite listings for the authenticated user.

    This endpoint fetches all listings that the authenticated user has marked as favorites.
    It uses the access token to identify the user and returns detailed information about
    each favorited listing.

    :param access_token: The access token for user authentication
    :type access_token: str
    :param db: Database session dependency
    :type db: Session
    :return: List of listings marked as favorites by the user
    :rtype: list[GetListing]
    """
    userid = get_userid_by_access_token(access_token, db)
    favorite_listings = get_favorite_listings_by_userid(userid, db)
    result = []
    for listing in favorite_listings:
        listing_data = get_listing_by_listingid(listing.ListingID, db)
        user = get_user_by_id(listing_data.UserID, db)
        book = get_book_by_id(listing_data.BookID, db)
        location = get_location_by_id(listing_data.LocationID, db)
        result.append(GetListing(
            ListingID=listing_data.ListingID,
            ListingType=listing_data.ListingType,
            Description=listing_data.Description,
            Price=listing_data.Price,
            BookCondition=listing_data.Condition,
            Status=listing_data.ListingState,
            CreationDate=listing_data.CreationDate,
            IsFavorite=True,
            Location=Location(
                Longitude=location.Longitude,
                Latitude=location.Latitude,
                Address=location.Address,
                Description=location.Description
            ),
            Book=GetBook(
                Title=book.Title,
                Language=book.Language,
                ReleaseDate=book.ReleaseDate,
                ISBN=book.ISBN,
                AvgRating=book.AvgRating,
                Edition=book.Edition,
                Author=get_author_by_bookid(book.BookID, db),
                Genre=get_genre_by_bookid(book.BookID, db)
            ),
            User=GetUser(
                Name=user.Name,
                AboutMe=user.AboutMe,
                UserRole=user.UserRole,
                UserID=user.UserID,
                ProfileImagePath=user.ProfileImagePath
            )
        ))
    return result

@app.get("/api/is_this_listing_favorite", status_code=status.HTTP_200_OK, response_model=bool, tags=["Favorites"])
async def is_this_listing_favorite(listingid: int, access_token: str = Header(None), db= Depends(get_db)):
    """
    Determine if a given listing is marked as favorite by the user.

    This endpoint checks if a specific listing is marked as favorite in the
    context of the authenticated user. The check requires an access token
    to identify the user and verify their permissions. The database dependency
    is used for querying relevant data.

    :param listingid: The unique identifier of the listing to be checked.
    :type listingid: int
    :param access_token: The access token of the authenticated user used for
        authorization purposes.
    :type access_token: str
    :param db: Dependency for database interaction.
    :type db: SQLAlchemy session or equivalent
    :return: A boolean value indicating whether the specified listing is
        marked as favorite by the user.
    :rtype: bool
    """
    userid = get_userid_by_access_token(access_token, db)
    return check_if_listing_is_favorite(listingid, userid, db)

@app.post("/api/post_favorite", status_code=status.HTTP_200_OK, tags=["Favorites"])
async def post_favorite(listing_id: int, access_token: str = Header(None), db= Depends(get_db)):
    """
    Adds a listing to the user's favorites.

    This endpoint allows an authenticated user to mark a listing as favorite.
    It verifies the user's identity through the access token and adds the
    specified listing to their favorites list.

    :param listing_id: ID of the listing to be added to favorites
    :type listing_id: int
    :param access_token: The access token for user authentication
    :type access_token: str
    :param db: Database session dependency
    :type db: Session
    :return: Success status of the operation
    :rtype: dict
    """
    userid = get_userid_by_access_token(access_token, db)
    return post_new_favorite(userid, listing_id, db)


@app.delete("/api/delete_favorite", status_code=status.HTTP_204_NO_CONTENT, tags=["Favorites"])
async def delete_favorite(listing_id: int, access_token: str = Header(None), db= Depends(get_db)):
    """
    Removes a listing from the user's favorites.

    This endpoint allows an authenticated user to remove a listing from their favorites list.
    It verifies the user's identity through the access token and removes the specified
    listing from their favorites.

    :param listing_id: ID of the listing to be removed from favorites
    :type listing_id: int
    :param access_token: The access token for user authentication
    :type access_token: str
    :param db: Database session dependency
    :type db: Session
    :return: None
    """
    userid = get_userid_by_access_token(access_token, db)
    return delete_favorite_by_userid(userid, listing_id, db)


# ===================================================================================================================
# IMAGES ENDPOINTS
# ===================================================================================================================

@app.put("/api/update_profile_image", status_code=status.HTTP_200_OK, tags=["Images"])
async def update_profile_image(file: UploadFile = File(...), access_token: str = Header(None), db=Depends(get_db)):
    """
    Updates the user's profile image by storing the uploaded file and updating the
    user's profile information in the database. Requires an access token for
    authentication and validation.

    :param file: File to be uploaded as the new profile image. Must be an instance
        of `UploadFile`.
    :param access_token: Token to authenticate and validate the user's identity.
        Must be passed in the request header.
    :param db: Database connection dependency provided through FastAPI's
        dependency system.
    :return: Result of the image path insertion operation, indicating whether the
        profile image update was successful.
    """
    userid = get_userid_by_access_token(access_token, db)
    new_path = insert_profile_picture(file)
    insert_profile_image_path(userid, new_path, db)
    return {"path": new_path}

@app.get("/api/get_users_profile_picture", status_code=status.HTTP_200_OK, tags=["Images"])
async def get_users_profile_picture(userid: int, access_token: str, db= Depends(get_db)):
    """
    Retrieve a user's profile picture.

    This endpoint allows authenticated users to retrieve the profile picture
    of a user specified by their unique ID. The access token is required
    for authentication and validation. If the access token is invalid or
    unauthorized, the request will fail.

    :param userid: The unique identifier of the user whose profile picture
        is to be retrieved.
    :type userid: int
    :param access_token: A required access token as a query parameter for
        authentication and authorization.
    :type access_token: str
    :param db: An instance of the database session, provided through dependency
        injection.
    :type db: sqlalchemy.orm.Session
    :return: A `FileResponse` containing the requested user's profile picture path.
    """
    if not verify_access_token(access_token):
        raise HTTPException(status_code=401, detail="Invalid access token")
    user = get_user_by_id(userid, db)
    if not user.ProfileImagePath:
        raise HTTPException(status_code=404, detail="User has no profile picture")
    
    # Check if this is a Blob Storage URL (new format) or local path (legacy)
    if user.ProfileImagePath.startswith('http'):
        # New Blob Storage format - redirect to blob URL
        from starlette.responses import RedirectResponse
        return RedirectResponse(url=user.ProfileImagePath)
    else:
        # Legacy local file format - serve from filesystem
        return FileResponse(path=user.ProfileImagePath)



@app.get("/api/get_listings_pictures",
        response_class=FileResponse,
        responses={
        200: {
            "content": {"application/zip": {}},
            "description": "A ZIP file containing multiple files"
            }
        },
         status_code=status.HTTP_200_OK,
         tags=["Images"])
async def get_listings_pictures(listingid: int, access_token: str = Header(None), db=Depends(get_db)):
    """
    Retrieve pictures associated with a listing.

    This endpoint allows authenticated users to retrieve the pictures
    associated with a listing specified by its unique ID. The access token
    is required for authentication and validation. If the access token is
    invalid or unauthorized, the request will fail.

    :param listingid: The unique identifier of the listing whose pictures
        are to be retrieved.
    :type listingid: int
    :param access_token: A required access token included as a header for
        authentication and authorization.
    :type access_token: str
    :param db: An instance of the database session, provided through dependency
        injection.
    :type db: sqlalchemy.orm.Session
    :return: A list of `FileResponse` objects containing the requested listing's picture paths.
    """
    if not verify_access_token(access_token):
        raise HTTPException(status_code=401, detail="Invalid access token")
    print(get_listing_image_paths(listingid, db))
    listing_photo_paths = [row.ImagePath for row in get_listing_image_paths(listingid, db)]
    zipfile_path = make_a_zipfile_of_pictures(listing_photo_paths)
    return FileResponse(path=zipfile_path, media_type="application/zip", filename="listingphotos.zip")

@app.get("/api/get_listing_primary_image", status_code=status.HTTP_200_OK, tags=["Images"])
async def get_listing_primary_image(listingid: int, access_token: str, db=Depends(get_db)):
    """
    Retrieve the primary (first) picture of a listing.

    This endpoint returns a single image file that can be used directly in <img> tags.
    If no image exists for the listing, returns a 404 error.

    :param listingid: The unique identifier of the listing
    :type listingid: int
    :param access_token: Access token for authentication (query parameter)
    :type access_token: str
    :param db: Database session dependency
    :type db: Session
    :return: FileResponse with the image file
    :raises HTTPException: If no images found or authentication fails
    """
    import os
    
    if not verify_access_token(access_token):
        raise HTTPException(status_code=401, detail="Invalid access token")
    
    image_paths = get_listing_image_paths(listingid, db)
    if not image_paths or len(image_paths) == 0:
        raise HTTPException(status_code=404, detail="No images found for this listing")
    
    # Return the first image if file exists
    first_image_path = image_paths[0].ImagePath
    
    # Check if this is a Blob Storage URL (new format) or local path (legacy)
    if first_image_path.startswith('http'):
        # New Blob Storage format - redirect to blob URL
        from starlette.responses import RedirectResponse
        return RedirectResponse(url=first_image_path)
    else:
        # Legacy local file format - serve from filesystem
        import os
        if not os.path.exists(first_image_path):
            raise HTTPException(status_code=404, detail="Image file not found on server")
        return FileResponse(path=first_image_path, media_type="image/jpeg")


@app.get("/api/get_listing_images_urls", status_code=status.HTTP_200_OK, tags=["Images"])
async def get_listing_images_urls(listingid: int, access_token: str, db=Depends(get_db)):
    """
    Get all image URLs for a listing.
    
    Returns a JSON array of image information including PhotoID and URL to access each image.
    This is useful for frontend to display all images in a gallery or carousel.
    
    :param listingid: The unique identifier of the listing
    :type listingid: int
    :param access_token: Access token for authentication
    :type access_token: str
    :param db: Database session dependency
    :type db: Session
    :return: JSON array of image objects with PhotoID and URL
    """
    if not verify_access_token(access_token):
        raise HTTPException(status_code=401, detail="Invalid access token")
    
    image_paths = get_listing_image_paths(listingid, db)
    
    # Build array of image URLs
    images = []
    for idx, img_row in enumerate(image_paths):
        # For now, all images point to the primary endpoint
        # In the future, you could create get_listing_image_by_photoid endpoint
        images.append({
            "photoId": img_row.PhotoID,
            "imagePath": img_row.ImagePath,  # Direct file path
            "imageUrl": f"/api/get_listing_image/{img_row.PhotoID}?access_token={access_token}",
            "isPrimary": idx == 0  # First image is primary
        })
    
    return images

@app.get("/api/get_listing_image/{photo_id}", status_code=status.HTTP_200_OK, tags=["Images"])
async def get_listing_image_by_photo_id(photo_id: int, access_token: str, db=Depends(get_db)):
    """
    Get a specific listing image by PhotoID.
    
    :param photo_id: The PhotoID from ListingPhoto table
    :type photo_id: int
    :param access_token: Access token for authentication
    :type access_token: str
    :param db: Database session dependency
    :return: FileResponse with the image file
    """
    if not verify_access_token(access_token):
        raise HTTPException(status_code=401, detail="Invalid access token")
    
    # Get the image path from database
    listingphoto = metadata.tables["ListingPhoto"]
    stmt = listingphoto.select().where(listingphoto.c.PhotoID == photo_id)
    result = db.execute(stmt).fetchone()
    
    if not result:
        raise HTTPException(status_code=404, detail="Image not found")
    
    image_path = result.ImagePath
    
    # Check if this is a Blob Storage URL (new format) or local path (legacy)
    if image_path.startswith('http'):
        # New Blob Storage format - redirect to blob URL
        from starlette.responses import RedirectResponse
        return RedirectResponse(url=image_path)
    else:
        # Legacy local file format - serve from filesystem
        import os
        if not os.path.exists(image_path):
            raise HTTPException(status_code=404, detail="Image file not found on server")
        return FileResponse(path=image_path, media_type="image/jpeg")



@app.post("/api/post_listings_picture", status_code=status.HTTP_200_OK, tags=["Images"])
async def post_listings_picture(listingid: int, file: UploadFile = File(...), access_token: str = Header(None), db=Depends(get_db)):
    """
    Upload and associate a picture with a specific listing.

    This endpoint allows authenticated users to upload pictures for their listings.
    The function validates the user's ownership of the listing, processes the uploaded
    image file, and creates the necessary database records.

    :param listingid: The unique identifier of the listing to add the picture to
    :type listingid: int
    :param file: The uploaded image file
    :type file: UploadFile
    :param access_token: The access token for user authentication
    :type access_token: str
    :param db: Database session dependency
    :type db: Session
    :return: Success status with the path to the saved image
    :rtype: dict
    :raises HTTPException: If authentication fails or user doesn't own the listing
    """
    userid = get_userid_by_access_token(access_token, db)
    listing = get_listing_by_listingid(listingid, db)

    if listing.UserID != userid:
        raise HTTPException(status_code=401, detail="User does not own this listing")

    image_path = insert_listing_picture(file)
    return insert_listing_image_path(listingid, image_path, db)

@app.delete("/api/delete_listings_pictures", status_code=status.HTTP_204_NO_CONTENT, tags=["Images"])
async def delete_listings_pictures(listingid: int, access_token: str = Header(None), db=Depends(get_db)):
    """
    Delete pictures associated with a specific listing.

    This endpoint allows authenticated users to delete pictures from their listings.
    The function validates the user's ownership of the listing and removes all associated
    image records from the database.

    :param listingid: The unique identifier of the listing to remove pictures from
    :type listingid: int
    :param access_token: The access token for user authentication
    :type access_token: str
    :param db: Database session dependency
    :type db: Session
    :return: Success status of the deletion operation
    :rtype: dict
    :raises HTTPException: If authentication fails or user doesn't own the listing
    """
    userid = get_userid_by_access_token(access_token, db)
    listing = get_listing_by_listingid(listingid, db)

    if listing.UserID != userid:
        raise HTTPException(status_code=401, detail="User does not own this listing")

    return delete_listing_image_paths(listingid, db)

@app.delete("/api/delete_listing_image/{photo_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Images"])
async def delete_listing_image(photo_id: int, access_token: str = Header(None), db=Depends(get_db)):
    """
    Delete a specific image by PhotoID.
    
    This endpoint allows authenticated users to delete a single image from their listing.
    It validates ownership before deletion.
    
    :param photo_id: The PhotoID from ListingPhoto table
    :type photo_id: int
    :param access_token: The access token for user authentication
    :type access_token: str
    :param db: Database session dependency
    :return: 204 No Content on success
    :raises HTTPException: If authentication fails or user doesn't own the listing
    """
    userid = get_userid_by_access_token(access_token, db)
    
    # Get the image and verify ownership through listing
    listingphoto = metadata.tables["ListingPhoto"]
    stmt = listingphoto.select().where(listingphoto.c.PhotoID == photo_id)
    photo_result = db.execute(stmt).fetchone()
    
    if not photo_result:
        raise HTTPException(status_code=404, detail="Image not found")
    
    listing = get_listing_by_listingid(photo_result.ListingID, db)
    if listing.UserID != userid:
        raise HTTPException(status_code=401, detail="User does not own this listing")
    
    # Delete the image record
    delete_stmt = listingphoto.delete().where(listingphoto.c.PhotoID == photo_id)
    db.execute(delete_stmt)
    db.commit()
    
    # Optionally: delete the actual image file from disk
    # import os
    # if os.path.exists(photo_result.ImagePath):
    #     os.remove(photo_result.ImagePath)
    
    return Response(status_code=204)

@app.get("/api/get_all_genres", status_code=status.HTTP_200_OK, tags=["Genres"])
async def get_all_genres(db=Depends(get_db)):
    """
    Get all available genres from the database.
    
    Returns a list of all genre names that can be used when creating or editing listings.
    This is useful for providing a predefined list of genres to users.
    
    :param db: Database session dependency
    :return: List of genre objects with GenreID and GenreName
    """
    try:
        genre_table = metadata.tables["Genres"]
        stmt = genre_table.select().order_by(genre_table.c.GenreName)
        result = db.execute(stmt)
        genres = [{"GenreID": row.GenreID, "GenreName": row.GenreName} for row in result.fetchall()]
        return genres
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch genres: {str(e)}")


# ===================================================================================================================
# AI Services
# ===================================================================================================================

@app.post("/api/scan_book", status_code=status.HTTP_200_OK, tags=["Listings"])
async def scan_book(file: UploadFile = File(...), access_token: str = Header(None), db=Depends(get_db)):
    """
    Scans a book cover image using AI to extract book details.
    """
    # Verify authentication
    userid = get_userid_by_access_token(access_token, db)
    if not userid:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Read image file
    contents = await file.read()

    # Analyze image
    result = analyze_book_image(contents)

    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])

    return result

# ===================================================================================================================
# MESSAGES ENDPOINTS
# ===================================================================================================================
@app.get("/api/get_message", response_model=GetMessage, status_code=status.HTTP_200_OK, tags=["Messages"])
async def get_message(messageid: int, access_token: str = Header(None), db= Depends(get_db)):
    """
    Retrieve a specific message by its ID.

    This endpoint allows authenticated users to retrieve a message by its unique identifier.
    The function verifies the user's access token and checks if they are either the sender
    or receiver of the message before returning the message details.

    :param messageid: The unique identifier of the message to retrieve
    :type messageid: int
    :param access_token: The access token for user authentication
    :type access_token: str
    :param db: Database session dependency
    :type db: Session
    :return: Message details including sender and receiver information
    :rtype: GetMessage
    :raises HTTPException: If authentication fails or message doesn't exist
    """
    userid = get_userid_by_access_token(access_token, db)
    if not userid:
        raise HTTPException(status_code=401, detail="Invalid access token")

    message = get_message_by_id(messageid, db)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    if message.SenderID != userid and message.ReceiverID != userid:
        raise HTTPException(status_code=403, detail="Unauthorized to view this message")

    sender = get_user_by_id(message.SenderID, db)
    receiver = get_user_by_id(message.ReceiverID, db)
    listing = get_listing_by_listingid(message.ListingID, db)

    return GetMessage(
        MessageID=message.MessageID,
        Content=message.Content,
        SentDate=message.SentDate,
        SenderID=sender.UserID,
        ReceiverID=receiver.UserID,
        ListingID=listing.ListingID
    )

@app.get("/api/get_dialogue", response_model=GetDialogue, status_code=status.HTTP_200_OK, tags=["Messages"])
async def get_dialogue(userid: int, listingid: int, access_token: str = Header(None), db=Depends(get_db)):
    """
    Retrieve a dialogue (conversation) between two users about a specific listing.

    This endpoint allows authenticated users to retrieve the conversation history between
    themselves and another user regarding a specific listing. The function verifies the
    user's access token and ensures they are part of the conversation before returning
    the message history.

    :param userid: The ID of the other user in the conversation
    :type userid: int
    :param listingid: The ID of the listing the conversation is about
    :type listingid: int
    :param access_token: The access token for user authentication
    :type access_token: str
    :param db: Database session dependency
    :type db: Session
    :return: Dialogue details including participants and message history
    :rtype: GetDialogue
    :raises HTTPException: If authentication fails or dialogue doesn't exist
    """
    current_userid = get_userid_by_access_token(access_token, db)
    if not current_userid:
        raise HTTPException(status_code=401, detail="Invalid access token")

    messages = get_messages_between_users(current_userid, userid, listingid, db)
    if not messages:
        raise HTTPException(status_code=404, detail="No messages found")

    message_list = []
    for msg in messages:
        message_list.append(GetMessage(
            MessageID=msg.MessageID,
            Content=msg.Content,
            SentDate=msg.SentDate,
            SenderID=msg.SenderID,
            ReceiverID=msg.ReceiverID,
            ListingID=msg.ListingID
        ))

    return GetDialogue(
        Messages=message_list
    )

@app.get("/api/get_dialogues", response_model=list[GetDialogues], status_code=status.HTTP_200_OK, tags=["Messages"])
async def get_dialogues(access_token: str = Header(None), db= Depends(get_db)):
    """
    Handles the endpoint for retrieving user dialogues. 

    This endpoint fetches the list of dialogues for the user identified with the 
    given access token. Each dialogue includes the user involved, the associated 
    listing, and the details of the last message exchanged. An HTTP exception is 
    raised if the access token is invalid or if no dialogues exist for the user.

    :param access_token: The access token identifying the user.
    :param db: The database connection dependency.
    :return: A list of dialogues including the associated user, listing, and 
        last message.
    """
    current_userid = get_userid_by_access_token(access_token, db)
    if not current_userid:
        raise HTTPException(status_code=401, detail="Invalid access token")

    dialogues = get_all_user_dialogues(current_userid, db)
    if not dialogues:
        raise HTTPException(status_code=404, detail="No dialogues found")

    dialogue_list = []
    for dialogue in dialogues:
        if dialogue.SenderID == current_userid:
            dialogue_list.append(
                GetDialogues(
                    UserID=dialogue.ReceiverID,
                    ListingID=dialogue.ListingID,
                    LastMessage=GetMessage(
                        MessageID=dialogue.MessageID,
                        Content=dialogue.Content,
                        SentDate=dialogue.SentDate,
                        SenderID=dialogue.SenderID,
                        ListingID=dialogue.ListingID,
                        ReceiverID=dialogue.ReceiverID,
                    )
                )
            )
        else:
            dialogue_list.append(
                GetDialogues(
                    UserID=dialogue.SenderID,
                    ListingID=dialogue.ListingID,
                    LastMessage=GetMessage(
                        MessageID=dialogue.MessageID,
                        Content=dialogue.Content,
                        SentDate=dialogue.SentDate,
                        SenderID=dialogue.SenderID,
                        ListingID=dialogue.ListingID,
                        ReceiverID=dialogue.ReceiverID,
                    )
                )
            )
    return dialogue_list

@app.post("/api/post_message", status_code=status.HTTP_200_OK, tags=["Messages"])
async def post_message(receiverid: int, listingid: int, content: str, access_token: str = Header(None),
                       db=Depends(get_db)):
    """
    Create and send a new message to another user regarding a specific listing.

    This endpoint allows authenticated users to send messages to other users about
    specific listings. The function verifies the validity of the receiver ID and
    listing ID before creating the message.

    :param receiverid: The ID of the user who will receive the message
    :type receiverid: int
    :param listingid: The ID of the listing the message is about
    :type listingid: int
    :param content: The content of the message
    :type content: str
    :param access_token: The access token for user authentication
    :type access_token: str
    :param db: Database session dependency
    :type db: Session
    :return: Success status of message creation
    :rtype: dict
    :raises HTTPException: If authentication fails or parameters are invalid
    """
    senderid = get_userid_by_access_token(access_token, db)
    if not senderid:
        raise HTTPException(status_code=401, detail="Invalid access token")

    if not get_user_by_id(receiverid, db):
        raise HTTPException(status_code=404, detail="Receiver not found")

    if not get_listing_by_listingid(listingid, db):
        raise HTTPException(status_code=404, detail="Listing not found")

    if senderid == receiverid:
        raise HTTPException(status_code=400, detail="Cannot send message to yourself")

    if not content or len(content.strip()) == 0:
        raise HTTPException(status_code=400, detail="Message content cannot be empty")

    return post_new_message(senderid, receiverid, listingid, content, db)


@app.delete("/api/delete_message", status_code=status.HTTP_204_NO_CONTENT, tags=["Messages"])
async def delete_message(messageid: int, access_token: str = Header(None), db= Depends(get_db)):
    """
    Delete a specific message by its ID.

    This endpoint allows authenticated users to delete a message. The function verifies
    that the user is either the sender or receiver of the message before deletion.

    :param messageid: The unique identifier of the message to delete
    :type messageid: int
    :param access_token: The access token for user authentication
    :type access_token: str
    :param db: Database session dependency
    :type db: Session
    :raises HTTPException: If authentication fails or message doesn't exist
    """
    userid = get_userid_by_access_token(access_token, db)
    if not userid:
        raise HTTPException(status_code=401, detail="Invalid access token")

    message = get_message_by_id(messageid, db)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    if message.SenderID != userid:
        raise HTTPException(status_code=403, detail="Unauthorized to delete this message")

    return delete_message_by_id(messageid, db)

# Connection manager to track websockets per user
class ConnectionManager:
    def __init__(self):
        # user_id -> set of websockets
        self.active_connections: Dict[int, Set[WebSocket]] = defaultdict(set)
        self.lock = asyncio.Lock()

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        async with self.lock:
            self.active_connections[user_id].add(websocket)

    async def disconnect(self, user_id: int, websocket: WebSocket):
        async with self.lock:
            sockets = self.active_connections.get(user_id)
            if not sockets:
                return
            sockets.discard(websocket)
            if len(sockets) == 0:
                del self.active_connections[user_id]

    async def send_personal_message(self, websocket: WebSocket, message: dict):
        # sends to one websocket
        await websocket.send_json(message)

    async def send_to_user(self, user_id: int, message: dict):
        # send to all open sockets of the user
        async with self.lock:
            sockets = list(self.active_connections.get(user_id, []))
        for ws in sockets:
            try:
                await ws.send_json(message)
            except Exception:
                # ignore client errors; client-side cleanup will happen on disconnect
                pass

manager = ConnectionManager()

# WebSocket endpoint
# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # 1. Create a manual DB session
    db = SessionLocal() 
    
    try:
        # 2. Authenticate
        token = websocket.query_params.get("token") or websocket.headers.get("authorization") or ""
        if token.lower().startswith("bearer "):
            token = token.split(" ", 1)[1]

        current_userid = None
        try:
            # Get User ID and force it to be an Integer
            uid = get_userid_by_access_token(token, db)
            if uid is not None:
                current_userid = int(uid)
        except Exception as e:
            print(f"WebSocket Auth Error: {e}")
            current_userid = None

        # 3. Reject if invalid
        if not current_userid:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # 4. Accept connection
        await manager.connect(current_userid, websocket)

        try:
            while True:
                data = await websocket.receive_json()
                
                # Validate and Force Integers
                try:
                    receiverid = int(data.get("receiverid"))
                    listingid = int(data.get("listingid"))
                    content = data.get("content")
                except (ValueError, TypeError):
                    continue # Ignore invalid data

                if not content or not content.strip():
                     continue
                
                # Prevent self-messages
                if receiverid == current_userid:
                    continue

                # 5. Persist & Send
                try:
                    # This returns True, not an object
                    post_new_message(current_userid, receiverid, listingid, content, db)
                    
                    # Manually construct the message object
                    # We use '0' for MessageID since we don't have it, but the UI will still show it
                    outgoing = {
                        "type": "message",
                        "message": {
                             "MessageID": 0, 
                             "Content": content,
                             "SentDate": str(datetime.now()),
                             "SenderID": current_userid,
                             "ReceiverID": receiverid,
                             "ListingID": listingid
                        }
                    }

                    # Send to receiver
                    await manager.send_to_user(receiverid, outgoing)
                    
                    # Send Ack to sender
                    await manager.send_personal_message(websocket, {"type": "ack", "message": outgoing["message"]})

                except Exception as e:
                    print(f"Error saving message: {e}")
                    await manager.send_personal_message(websocket, {"type": "error", "error": "Failed to save"})

        except WebSocketDisconnect:
            await manager.disconnect(current_userid, websocket)
        except Exception as e:
            print(f"WebSocket Error: {e}")
            await manager.disconnect(current_userid, websocket)
            
    finally:
        # 6. Always close the session
        db.close()


# ===================================================================================================================
# HANDSHAKE ENDPOINTS
# ===================================================================================================================

@app.get("/api/get_transaction_status/", status_code=status.HTTP_200_OK, tags=["Handshakes"])
async def get_transaction_status(listingid: int, buyerid: int, access_token: str = Header(None), db = Depends(get_db)):
    
    """
    Retrieve the status of a transaction for a specific listing and buyer.

    This function is part of an API endpoint that allows users to check the current status
    of a transaction associated with a particular listing and buyer. The function ensures that
    proper authorization is enforced by validating the access token and only allowing users
    who are either the listing owner or the buyer involved in the transaction to access the
    information.

    :param listingid: The unique identifier of the listing associated with the transaction.
    :type listingid: int
    :param buyerid: The ID of the buyer involved in the transaction.
    :type buyerid: int
    :param access_token: The access token used to authenticate the user's identity.
    :type access_token: str
    :param db: Dependency injection used to interact with the database.
    :return: Returns the transaction status, whether confirmed by the buyer, and whether
             confirmed by the seller if the transaction exists and is accessed by authorized users.
             Returns -1 if the transaction does not exist but is accessed by authorized users.
    :rtype: tuple[int, bool, bool] or int
    :raises HTTPException: 401 if the access token is invalid.
    :raises HTTPException: 404 if the listing is not found.
    :raises HTTPException: 403 if the user is unauthorized to view the transaction.
    """

    userid = get_userid_by_access_token(access_token, db)
    if not userid:
        raise HTTPException(status_code=401, detail="Invalid access token")

    listing = get_listing_by_listingid(listingid, db)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    # ✅ CHECK AUTHORIZATION FIRST
    # User making the request must be EITHER:
    # 1. The listing owner (seller), OR
    # 2. The buyer specified in the parameter
    if listing.UserID != userid and buyerid != userid:
        raise HTTPException(status_code=403, detail="Unauthorized to view this transaction")

    # Now safe to check/create transaction
    transaction = get_transaction_by_listingid_and_userid(listingid, buyerid, db)
    
    if not transaction:
        return -1, False, False
    else:
        return transaction.TransactionStatus, transaction.ConfirmedByBuyer, transaction.ConfirmedBySeller


@app.post("/api/confirm_transaction/", status_code=status.HTTP_200_OK, tags=["Handshakes"])
async def confirm_transaction(listingid: int, buyerid: int, access_token: str = Header(None), db = Depends(get_db)):
    userid = get_userid_by_access_token(access_token, db)
    if not userid:
        raise HTTPException(status_code=401, detail="Invalid access token")
    
    listing = get_listing_by_listingid(listingid, db)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # ✅ CHECK AUTHORIZATION FIRST
    if listing.UserID != userid and buyerid != userid:
        raise HTTPException(status_code=403, detail="Unauthorized to confirm this transaction")
    
    # Prevent seller from buying their own listing
    if listing.UserID == buyerid:
        raise HTTPException(status_code=400, detail="Cannot confirm transaction for your own listing")
    
    # Get current status
    transaction_status, confirmedByBuyer, confirmedBySeller = await get_transaction_status(listingid, buyerid, access_token, db)
    
    # Determine who is confirming
    if listing.UserID == userid and not confirmedBySeller:
        # Seller confirming
        if transaction_status == -1:
            return post_new_transaction(listingid, buyerid, userid, True, db)
        elif transaction_status == 0:
            return confirm_transaction_by_listingid_and_buyeid(listingid, buyerid, True, db)
        elif transaction_status == 1:
            raise HTTPException(status_code=400, detail="Transaction already confirmed")
    elif buyerid == userid and not confirmedByBuyer:
        # Buyer confirming
        if transaction_status == -1:
            return post_new_transaction(listingid, buyerid, userid, False, db)
        elif transaction_status == 0:
            return confirm_transaction_by_listingid_and_buyeid(listingid, buyerid, False, db)
        elif transaction_status == 1:
            raise HTTPException(status_code=400, detail="Transaction already confirmed")
    else:
        raise HTTPException(status_code=403, detail="Unauthorized to confirm this transaction or it is already confirmed from your side")


@app.delete("/api/unconfirm_transaction/", status_code=status.HTTP_204_NO_CONTENT, tags=["Handshakes"])
async def unconfirm_transaction(listingid: int, buyerid: int, access_token: str = Header(None), db = Depends(get_db)):
    userid = get_userid_by_access_token(access_token, db)
    if not userid:
        raise HTTPException(status_code=401, detail="Invalid access token")
    
    listing = get_listing_by_listingid(listingid, db)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # ✅ CHECK AUTHORIZATION FIRST
    if listing.UserID != userid and buyerid != userid:
        raise HTTPException(status_code=403, detail="Unauthorized to unconfirm this transaction")
    
    # Prevent seller from unconfirming their own listing as buyer
    if listing.UserID == buyerid:
        raise HTTPException(status_code=400, detail="Cannot unconfirm transaction for your own listing")
    
    transaction_status, confirmedByBuyer, confirmedBySeller = await get_transaction_status(listingid, buyerid, access_token, db)
    
    if transaction_status == -1:
        raise HTTPException(status_code=400, detail="Transaction doesn't exist")
    
    if buyerid == userid and confirmedByBuyer:
        # Buyer unconfirming
        if transaction_status == 0:
            return delete_transaction_by_listingid_and_buyerid(listingid, buyerid, False, db)
        elif transaction_status == 1:
            return unconfirm_transaction_by_listingid_and_buyerid(listingid, buyerid, False, db)
    elif listing.UserID == userid and confirmedBySeller:
        # Seller unconfirming
        if transaction_status == 0:
            return delete_transaction_by_listingid_and_buyerid(listingid, buyerid, True, db)
        elif transaction_status == 1:
            return unconfirm_transaction_by_listingid_and_buyerid(listingid, buyerid, True, db)
    else:
        raise HTTPException(status_code=403, detail="Unauthorized to unconfirm this transaction or it is already unconfirmed from your side")
    
    return False


@app.get("/api/get_transaction_history/", status_code=status.HTTP_200_OK, response_model=list[GetTransaction],
         tags=["Transactions"])
async def get_transaction_history(access_token: str = Header(None), db=Depends(get_db)):
    """
    Retrieve transaction history for the authenticated user.
    
    This endpoint returns a list of all transactions where the authenticated user
    is either the buyer or the seller (listing owner). It requires a valid access
    token for authentication.

    :param access_token: The access token for authentication
    :type access_token: str
    :param db: Database session dependency
    :type db: Session
    :return: List of transactions
    :rtype: list[GetTransaction]
    :raises HTTPException: If authentication fails
    """
    userid = get_userid_by_access_token(access_token, db)
    if not userid:
        raise HTTPException(status_code=401, detail="Invalid access token")

    transactions = get_transactions_by_userid(userid, db)
    if not transactions or transactions == []:
        raise HTTPException(status_code=404, detail="No transactions found")
    result = []
    for transaction in transactions:
        listing = await get_listing(transaction.ListingID, access_token, db)
        result.append(
        GetTransaction(
            TransactionID=transaction.TransactionID,
            Listing=listing,
            TransactionStatus=transaction.TransactionStatus,
            Buyer= await get_profile(transaction.BuyerID, access_token, db),
            TransactionDate=transaction.TransactionDate,
            ConfirmedByBuyer=transaction.ConfirmedByBuyer,
            ConfirmedBySeller=transaction.ConfirmedBySeller
        ),
        )
    return result
            
# ===================================================================================================================
# PAGE ROUTES
# ===================================================================================================================

@app.get("/")
async def get_home_page(request: Request):
    """
    Serves the home page.
    """
    return templates.TemplateResponse("home.html", {"request": request})

@app.get("/header.html")
async def get_header(request: Request):
    """
    Serves the header component.
    """
    return templates.TemplateResponse("header.html", {"request": request})

@app.get("/footer.html")
async def get_footer(request: Request):
    """
    Serves the footer component.
    """
    return templates.TemplateResponse("footer.html", {"request": request})

@app.get("/login")
async def get_login_page(request: Request):
    """
    Serves the login page.
    """
    return templates.TemplateResponse("Login.html", {"request": request})

@app.get("/complete-google-profile")
async def get_complete_google_profile_page(request: Request):
    """
    Serves the Google OAuth profile completion page.
    """
    return templates.TemplateResponse("complete-google-profile.html", {"request": request})

@app.get("/registration")
async def get_registration_page(request: Request):
    """
    Serves the registration page.
    """
    return templates.TemplateResponse("registration.html", {"request": request})


@app.get("/registration2")
async def get_registration2_page(request: Request):
    """
    Serves the registration step 2 page.
    """
    return templates.TemplateResponse("registration2.html", {"request": request})

@app.get("/registration3")
async def get_registration3_page(request: Request):
    """
    Serves the registration step 3 page.
    """
    return templates.TemplateResponse("registration3.html", {"request": request})

@app.get("/profile")
async def get_profile_page(request: Request):
    """
    Serves the user's profile page.
    """
    return templates.TemplateResponse("profile.html", {"request": request})

@app.get("/edit-profile")
async def get_edit_profile_page(request: Request):
    """
    Serves the edit profile page.
    """
    return templates.TemplateResponse("editprofile.html", {"request": request})

@app.get("/listing")
async def get_listing_page(request: Request):
    """
    Serves the listing details page.
    The listing_id parameter will be available to the frontend JavaScript.
    """
    return templates.TemplateResponse("listing.html", {"request": request})

@app.get("/add-listing")
async def get_add_listing_page(request: Request):
    """
    Serves the add listing page.
    """
    return templates.TemplateResponse("addlisting.html", {"request": request})

@app.get("/edit-listing")
async def get_edit_listing_page(request: Request):
    """
    Serves the edit listing page.
    """
    return templates.TemplateResponse("editlisting.html", {"request": request})

@app.get("/favourites")
async def get_favourites_page(request: Request):
    """
    Serves the user's favourites page.
    """
    return templates.TemplateResponse("favourites.html", {"request": request})

@app.get("/messages")
async def get_messages_page(request: Request):
    """
    Serves the user's messages page.
    """
    return templates.TemplateResponse("mymessages.html", {"request": request})

@app.get("/mymessages")
async def get_chat_page(request: Request, user_id: int, listing_id: int):
    """
    Serves the chat page for a specific conversation.
    """
    return templates.TemplateResponse(
    "messages.html",
    {"request": request, "listingId": listing_id, "userId": user_id}
    )

@app.get("/user")
async def get_user_profile_page(request: Request):
    """
    Serves the foreign user profile page.
    """
    return templates.TemplateResponse("foreignprofile.html", {"request": request})

@app.get("/preferences")
async def get_preferences_page(request: Request):
    """
    Serves the user's preferences dashboard page.
    """
    return templates.TemplateResponse("preferencedashboard.html", {"request": request})

@app.get("/transactions")
async def get_transactions_page(request: Request):
    """
    Serves the transaction history page.
    """
    return templates.TemplateResponse("transactionhistory.html", {"request": request})

@app.get("/announcements")
async def get_announcements_page(request: Request):
    """
    Serves the announcements page.
    """
    return templates.TemplateResponse("Announcements.html", {"request": request})



@app.get("/auth/google/login")
async def google_login():
    params = {
        "response_type": "code",
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)
    return RedirectResponse(url)


def exchange_code_for_userinfo(code: str):
    token_resp = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        },
        timeout=10,
    )
    if not token_resp.ok:
        raise HTTPException(status_code=400, detail="Failed to get token from Google")

    access_token = token_resp.json().get("access_token")

    userinfo_resp = requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10,
    )
    if not userinfo_resp.ok:
        raise HTTPException(status_code=400, detail="Failed to get user info from Google")

    return userinfo_resp.json()


@app.get("/auth/google/callback")
async def google_callback(code: str | None = None, error: str | None = None):
    if error:
        raise HTTPException(status_code=400, detail=f"Google error: {error}")
    if not code:
        raise HTTPException(status_code=400, detail="Missing code")

    google_user = exchange_code_for_userinfo(code)
    return JSONResponse(google_user)


# ==================================================================================
# GAMIFICATION ENDPOINTS
# ==================================================================================

@app.get("/api/leaderboard", status_code=status.HTTP_200_OK, tags=["Gamification"])
async def leaderboard_endpoint(access_token: str = Header(None), db=Depends(get_db)):
    """
    Retrieve top users by points for the leaderboard.
    Authentication optional - leaderboard is public.
    """
    leaderboard_data = get_leaderboard(db, limit=10)
    return leaderboard_data
