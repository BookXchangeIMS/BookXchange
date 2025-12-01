from datetime import datetime
from pydantic import BaseModel
from fastapi import File
from starlette.responses import FileResponse


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
    AboutMe: str
    LocationAddress: str
    ProfileImagePath: str = ""

class GetUser(BaseModel):
    Name: str
    AboutMe: str
    UserID: int
    UserRole: str
    ProfileImagePath: str = None

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
    ISBN: str | None
    AvgRating: float | None
    Edition: int | None

class PostBook(BaseModel):
    Title: str
    Author: list[str] = ["Anonymous"]
    Genre: list[str] | None
    AvgRating: float | None
    Language: str | None
    ReleaseDate: datetime | None
    ISBN: str | None
    Edition: int | None

class GetBook(BaseModel):
    Title: str
    Author: list[str] = ["Anonymous"]
    Genre: list[str] | None
    Language: str | None
    AvgRating: float | None
    ReleaseDate: datetime | None
    ISBN: str | None
    Edition: int | None

# Listings model
class PostListing(BaseModel):
    Book: PostBook
    Description: str
    Status: str
    Price: float | None
    ListingType: str
    BookCondition: str | None
    LocationAddress: str

class GetListing(BaseModel):
    ListingID: int
    Book: GetBook
    User: GetUser
    Description: str
    Status: str
    Price: float | None
    ListingType: str
    BookCondition: str | None
    CreationDate: datetime
    Location: Location
    IsFavorite: bool

class UpdateListing(BaseModel):
    ListingID: int
    Book: PostBook
    Description: str
    Status: str
    Price: float | None
    ListingType: str
    BookCondition: str | None
    LocationAddress: str

# Chat Models

class Message(BaseModel):
    MessageID: int
    SenderID: int
    ListingID: int
    ReceiverID: int
    Content: str
    SentDate: datetime = datetime.now()

class PostMessage(BaseModel):
    SenderID: int
    ListingID: int
    ReceiverID: int
    Content: str
    SentDate: datetime = datetime.now()

# Chat Models
class GetMessage(BaseModel):
    MessageID: int
    SenderID: int
    ListingID: int
    ReceiverID: int
    Content: str
    SentDate: datetime

class GetDialogue(BaseModel):
    Messages: list[GetMessage]

class GetDialogues(BaseModel):
    UserID: int
    ListingID: int
    LastMessage: GetMessage

# Transaction models
class Transaction(BaseModel):
    TransactionID: int
    ListingID: int
    BuyerID: int
    TransactionDate: datetime = datetime.now()
    TransactionStatus: int = 0
    ConfirmedByBuyer: int = 0
    ConfirmedBySeller: int = 0

class PostTransaction(BaseModel):
    ListingID: int
    BuyerID: int

class SubmitHandshake(BaseModel):
    ListingID: int

class GetTransaction(BaseModel):
    TransactionID: int
    Listing: GetListing
    Buyer: GetUser
    TransactionDate: datetime
    TransactionStatus: int
    ConfirmedByBuyer: int
    ConfirmedBySeller: int





