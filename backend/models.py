from datetime import datetime
from pydantic import BaseModel

#==================================================================================
# JWT MODELS
#==================================================================================


class Tokens(BaseModel):
    access_token: str
    refresh_token: str


#==================================================================================
# DATABASE MODELS
#==================================================================================

# Location model

class PostLocation(BaseModel):
    Address: str
    Description: str

class Location(PostLocation):
    Longitude: float
    Latitude: float

# User model

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

# Book model
class Book(BaseModel):
    BookID: int
    Title: str
    Language: str | None
    ReleaseDate: datetime | None
    Edition: int | None

class PostBook(BaseModel):
    Title: str
    Author: list[str] = ["Anonymous"]
    Genre: list[str] | None
    Language: str | None
    ReleaseDate: datetime | None
    Edition: int | None

class GetBook(BaseModel):
    Title: str
    Author: list[str] = "Anonymous"
    Genre: list[str] | None
    Language: str | None
    ReleaseDate: datetime | None
    Edition: int | None

# Listings model
class PostListing(BaseModel):
    Book: PostBook
    UserID: int
    Description: str
    Status: str
    Price: float | None
    BookCondition: str | None
    LocationAddress: str

class GetListing(BaseModel):
    Book: GetBook
    User: GetUser
    Description: str
    Status: str
    Price: float | None
    BookCondition: str | None
    Location: Location

class UpdateListing(BaseModel):
    Book: GetBook
    User: GetUser
    Description: str
    Status: str
    Price: float | None
    BookCondition: str | None
    Location: Location








