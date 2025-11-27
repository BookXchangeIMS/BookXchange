from http import HTTPStatus
from datetime import datetime
from typing import Annotated, List, Optional

from fastapi import FastAPI, Depends, Form, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.scripts.auth import *
from backend.scripts.profile_crud import *
from backend.config.db import get_db
from backend.scripts.location_scripts import *
# IMPORT YOUR SQLALCHEMY MODELS HERE – adjust module path to your project
from backend.models import (
    Locations,
    Users,
    Books,
    Authors,
    AuthorBook,
    Listings,
    ListingPhoto,
    Favorites,
)

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
        "name": "Book",
        "description": "Operations with book listings.",
    },
]
app = FastAPI(openapi_tags=tags_metadata)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================================================================================
# Pydantic models used by API
# (existing ones you showed, plus HomeListing at bottom)
# ==================================================================================

class Tokens(BaseModel):
    access_token: str
    refresh_token: str


class PostLocation(BaseModel):
    Address: str
    Description: str


class Location(PostLocation):
    Longitude: float
    Latitude: float


class SignIn(BaseModel):
    Email: str
    PasswordHash: str


class SignUp(SignIn):
    Name: str
    DateOfBirth: datetime
    LocationAddress: str


class UpdateUser(BaseModel):
    Name: str
    ProfileImagePath: str
    AboutMe: str
    LocationAddress: str


class GetUser(BaseModel):
    Name: str
    ProfileImagePath: str
    AboutMe: str
    UserID: int
    UserRole: str


class GetMyUser(GetUser):
    Email: str
    CreationDate: datetime
    Location: Location


class Error_Log(BaseModel):
    LogID: int
    UserID: int
    Description: str
    Type: int
    LogDate: datetime


class Genre(BaseModel):
    GenreID: int
    GenreName: str


class AuthorsModel(BaseModel):
    AuthorID: int
    AuthorName: int


class BookModel(BaseModel):
    ISBN: int
    AuthorID: int
    Title: str
    Year: int


class Book_Genre(BaseModel):
    GenreID: int
    ISBN: int


class PreferencesModel(BaseModel):
    GenreID: int
    UserID: int


class Notifications(BaseModel):
    NotificationID: int
    UserID: int
    NotificationContent: str
    Status: int


class Image(BaseModel):
    ImageID: int
    Image_path: str
    UploadedBy: int
    UploadedAt: datetime


class ListingPost(BaseModel):
    Location_ID: int
    Item: BookModel
    UserID: int
    Image_Path: str
    Type: str
    Price: float


class ListingsModel(ListingPost):
    ListingID: int
    ListingState: int
    DatePosted: datetime


class MessagePost(BaseModel):
    SenderID: int
    ReceiverID: int
    Content: str
    DateSent: datetime


class MessagesModel(MessagePost):
    MessageID: int


class ReportPost(BaseModel):
    Description: str
    Category: str
    ListingID: int
    UserID: int
    ReportedUserID: int
    CreatedAt: datetime


class ReportsModel(ReportPost):
    ReportID: int


# Response model for home page listings
class HomeListing(BaseModel):
    id: int
    title: str
    author: str
    price: str
    location: str
    date: str
    isFavorite: bool
    imagePath: str


#==============================================================================================================
# TOKENIZED AUTHENTICATION
#==============================================================================================================

@app.post("/api/sign_up", status_code=status.HTTP_201_CREATED, response_model=Tokens, tags=["Authentication"])
async def sign_up(sign_up_form: Annotated[SignUp, Form()], db=Depends(get_db)):
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
async def sign_in(login_data: Annotated[SignIn, Form()], db=Depends(get_db)):
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
async def refresh_access_token(token: str = Header(None), db=Depends(get_db)):
    if verify_refresh_token(token, db):
        user_id = get_userid_by_refresh_token(token, db)
        user = get_user_by_id(user_id, db)
        access_token = create_access_token(SignIn(Email=user.Email, PasswordHash=user.PasswordHash).dict())
        return Tokens(access_token=access_token, refresh_token=token)
    else:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@app.delete("/api/logout", status_code=status.HTTP_204_NO_CONTENT, tags=["Authentication"])
async def logout(tokens: Tokens = Header(None), db=Depends(get_db)):
    if verify_refresh_token(tokens.access_token, db):
        return destroy_refresh_token(tokens, db)
    else:
        raise HTTPException(status_code=401, detail="Invalid access token")


@app.get("/api/does_user_exist", status_code=status.HTTP_200_OK, tags=["Authentication"])
async def does_user_exist(email: str, db=Depends(get_db)):
    return check_if_email_exists(email=email, db=db)


# ===================================================================================================================
# PREFERENCES ENDPOINTS
# ===================================================================================================================

@app.post("/api/post_preferences", status_code=status.HTTP_201_CREATED, tags=["Preferences"])
async def post_preferences(preferences: list[str], access_token: str = Header(None), db=Depends(get_db)):
    userid = get_userid_by_access_token(access_token, db)
    return post_preferences_by_userid(userid, preferences, db)


@app.get("/api/get_preferences", status_code=status.HTTP_200_OK, response_model=list[str], tags=["Preferences"])
async def get_preferences(access_token: str = Header(None), db=Depends(get_db)):
    userid = get_userid_by_access_token(access_token, db)
    return get_preferences_by_userid(userid, db)


@app.delete("/api/delete_preferences", status_code=status.HTTP_204_NO_CONTENT, tags=["Preferences"])
async def delete_preference(genre_name: str, access_token: str = Header(None), db=Depends(get_db)):
    userid = get_userid_by_access_token(access_token, db)
    return delete_preference_by_userid(userid, genre_name, db)


# ===================================================================================================================
# PROFILE ENDPOINTS
# ===================================================================================================================

@app.get("/api/get_your_profile", response_model=GetMyUser, status_code=status.HTTP_200_OK, tags=["Profile"])
async def get_your_profile(access_token: str = Header(None), db=Depends(get_db)):
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
        Location=Location(
            Longitude=location.Longitude,
            Latitude=location.Latitude,
            Address=location.Address,
            Description=location.Description,
        ),
    )


@app.get("/api/get_profile", response_model=GetUser, status_code=status.HTTP_200_OK, tags=["Profile"])
async def get_profile(userid: int, access_token: str = Header(None), db=Depends(get_db)):
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
async def update_profile(new_info: UpdateUser, access_token: str = Header(None), db=Depends(get_db)):
    userid = get_userid_by_access_token(access_token, db)
    latitude, longitude = address_to_coordinates(new_info.LocationAddress)
    new_locationid = post_location(Location(
        Latitude=latitude,
        Longitude=longitude,
        Address=new_info.LocationAddress,
        Description=""), db)
    return update_profile_by_userid(userid, new_info, new_locationid, db)


@app.delete("/api/delete_profile", status_code=status.HTTP_204_NO_CONTENT, tags=["Profile"])
async def delete_profile(tokens: Tokens = Header(None), db=Depends(get_db)):
    userid = get_userid_by_access_token(tokens.access_token, db)
    return delete_profile_by_userid(userid, db)


# ===================================================================================================================
# BOOK / LISTINGS ENDPOINTS FOR HOME PAGE
# ===================================================================================================================

@app.get("/api/get_books", response_model=List[HomeListing], status_code=status.HTTP_200_OK, tags=["Book"])
async def get_books(access_token: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """
    Returns latest visible listings with book, author, seller location, image, price,
    relative date and favorite flag for current user.
    """

    current_user_id: Optional[int] = None
    if access_token:
        try:
            payload = verify_access_token(access_token)
            current_user_id = payload.get("UserID") or payload.get("user_id")
        except Exception:
            current_user_id = None

    q = (
        db.query(
            Listings.ListingID.label("listing_id"),
            Listings.Price,
            Listings.CreationDate,
            Books.Title,
            Locations.Address,
            Authors.AuthorName,
            ListingPhoto.ImagePath,
        )
        .join(Books, Listings.BookID == Books.BookID)
        .join(Users, Listings.UserID == Users.UserID)
        .join(Locations, Users.LocationID == Locations.LocationID)
        .outerjoin(AuthorBook, AuthorBook.BookID == Books.BookID)
        .outerjoin(Authors, Authors.AuthorID == AuthorBook.AuthorID)
        .outerjoin(ListingPhoto, ListingPhoto.ListingID == Listings.ListingID)
        .filter(Listings.ListingState == "Visible")  # adjust if you use numeric state
        .order_by(Listings.CreationDate.desc())
    )

    rows = q.all()

    favorite_ids: set[int] = set()
    if current_user_id:
        fav_rows = (
            db.query(Favorites.ListingID)
            .filter(Favorites.UserID == current_user_id)
            .all()
        )
        favorite_ids = {r.ListingID for r in fav_rows}

    result: list[HomeListing] = []
    now = datetime.utcnow()

    for r in rows:
        price_str = f"${r.Price:.2f}" if r.Price is not None else "N/A"

        days_ago = (now - r.CreationDate).days
        if days_ago == 0:
            date_str = "Posted today"
        elif days_ago == 1:
            date_str = "Posted 1 day ago"
        else:
            date_str = f"Posted {days_ago} days ago"

        result.append(
            HomeListing(
                id=r.listing_id,
                title=r.Title,
                author=r.AuthorName or "Unknown author",
                price=price_str,
                location=r.Address,
                date=date_str,
                isFavorite=(r.listing_id in favorite_ids),
                imagePath=r.ImagePath or "../static/resources/placeholder.png",
            )
        )

    return result