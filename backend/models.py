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
class Location(BaseModel):
    LocationID: int
    Country: str
    City: str

# User model

class SignIn(BaseModel):
    Email: str
    PasswordHash: str

class SignUp(SignIn):
    Name: str

class GetUser(BaseModel):
    UserID: int
    ProfileImagePath: str
    UserRole: str
    AboutMe: str

class User(GetUser, SignIn):
    CreationDate: datetime

# Error log model
class Error_Log(BaseModel):
    LogID: int
    UserID: int
    Description: str
    Type: int
    LogDate: datetime

# Genre model
class Genre(BaseModel):
    GenreID: int
    GenreName: str

# Authors model
class Authors(BaseModel):
    AuthorID: int
    AuthorName: int

# Book model
class Book(BaseModel):
    ISBN: int
    AuthorID: int
    Title: str
    Year: int

# Book-genre model
class Book_Genre(BaseModel):
    GenreID: int
    ISBN: int

# Preferences model
class Preferences(BaseModel):
    GenreID: int
    UserID: int

# Notifications model
class Notifications(BaseModel):
    NotificationID: int
    UserID: int
    NotificationContent: str
    Status: int

# Image model
class Image(BaseModel):
    ImageID: int
    Image_path: str
    UploadedBy: int
    UploadedAt: datetime

# Listings model
class ListingPost(BaseModel):
    Location_ID: int
    Item: Book
    UserID: int
    Image_Path: str
    Type: str
    Price: float

class Listings(ListingPost):
    ListingID: int
    ListingState: int
    DatePosted: datetime

# Messages model
class MessagePost(BaseModel):
    SenderID: int
    ReceiverID: int
    Content: str
    DateSent: datetime

class Messages(MessagePost):
    MessageID: int

# Reports model
class ReportPost(BaseModel):
    Description: str
    Category: str
    ListingID: int
    UserID: int
    ReportedUserID: int
    CreatedAt: datetime

class Reports(ReportPost):
    ReportID: int







