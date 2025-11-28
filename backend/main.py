from http import HTTPStatus
import zipfile

from fastapi import FastAPI, Depends, Form, Header, UploadFile, File
from typing import Annotated

from starlette.responses import FileResponse, Response

from backend.scripts.auth import *
from backend.scripts.image_management import *
from backend.scripts.profile_crud import *
from backend.config.db import get_db
from backend.scripts.location_scripts import *
from backend.scripts.listings_crud import *
from backend.scripts.ai_service import analyze_book_image
from fastapi import UploadFile, File

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
]
app = FastAPI(openapi_tags=tags_metadata)

# Configure CORS to allow frontend requests
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
        
        latitude, longitude = address_to_coordinates(listing_form.LocationAddress)
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
                UserID=user.UserID
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
                UserID=user.UserID
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
            UserID=user.UserID
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
                UserID=user.UserID
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
    return insert_profile_image_path(userid, insert_profile_picture(file), db)

@app.get("/api/get_users_profile_picture", status_code=status.HTTP_200_OK, tags=["Images"])
async def get_users_profile_picture(userid: int, access_token: str = Header(None), db= Depends(get_db)):
    """
    Retrieve a user's profile picture.

    This endpoint allows authenticated users to retrieve the profile picture
    of a user specified by their unique ID. The access token is required
    for authentication and validation. If the access token is invalid or
    unauthorized, the request will fail.

    :param userid: The unique identifier of the user whose profile picture
        is to be retrieved.
    :type userid: int
    :param access_token: A required access token included as a header for
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
    if not verify_access_token(access_token):
        raise HTTPException(status_code=401, detail="Invalid access token")
    
    image_paths = get_listing_image_paths(listingid, db)
    if not image_paths or len(image_paths) == 0:
        raise HTTPException(status_code=404, detail="No images found for this listing")
    
    # Return the first image
    first_image_path = image_paths[0].ImagePath
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
