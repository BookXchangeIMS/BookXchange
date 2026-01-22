CREATE DATABASE BookXchange;
GO
USE BookXchange;
GO

CREATE TABLE Locations(
    LocationID INT IDENTITY(1,1) PRIMARY KEY,
    Longitude FLOAT NOT NULL,
    Latitude FLOAT NOT NULL,
    Address NVARCHAR(512) NOT NULL,
    [Description] NVARCHAR(512) NOT NULL
);
GO

CREATE TABLE Users(
    UserID INT IDENTITY PRIMARY KEY,
    [Name] NVARCHAR(256) NOT NULL,
    DateOfBirth DATE NOT NULL,
    Email NVARCHAR(256) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(256) NOT NULL,
    ProfileImagePath NVARCHAR(512),
    UserRole NVARCHAR(64) NOT NULL,
    AboutMe NVARCHAR(512),
    CreationDate DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    LocationID INT NOT NULL,
    FOREIGN KEY(LocationID) REFERENCES Locations(LocationID)
);

CREATE TABLE Books(
    BookID INT IDENTITY PRIMARY KEY,
    Title NVARCHAR(256) NOT NULL,
    [Language] NVARCHAR(64),
    ReleaseDate DATE,
    ISBN NVARCHAR(32),
    AvgRating FLOAT,
    [Edition] INT
);


CREATE TABLE Authors(
    AuthorID INT IDENTITY PRIMARY KEY,
    AuthorName NVARCHAR(256) NOT NULL
);

CREATE TABLE AuthorBook(
    AuthorID INT NOT NULL,
    BookID INT NOT NULL,
    PRIMARY KEY(AuthorID, BookID),
    FOREIGN KEY(AuthorID) REFERENCES Authors(AuthorID) ON DELETE CASCADE,
    FOREIGN KEY(BookID) REFERENCES Books(BookID) ON DELETE CASCADE
);

CREATE TABLE Genres(
    GenreID INT IDENTITY PRIMARY KEY,
    GenreName NVARCHAR(256) NOT NULL
);

CREATE TABLE BookGenre(
    BookID INT NOT NULL,
    GenreID INT NOT NULL,
    PRIMARY KEY(BookID, GenreID),
    FOREIGN KEY(BookID) REFERENCES Books(BookID) ON DELETE CASCADE,
    FOREIGN KEY(GenreID) REFERENCES Genres(GenreID) ON DELETE CASCADE
);

CREATE TABLE Preferences(
    UserID INT NOT NULL,
    GenreID INT NOT NULL,
    PRIMARY KEY(UserID, GenreID),
    FOREIGN KEY(UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY(GenreID) REFERENCES Genres(GenreID) ON DELETE CASCADE
);

CREATE TABLE Listings(
    ListingID INT IDENTITY PRIMARY KEY,
    UserID INT NOT NULL,
    BookID INT NOT NULL,
    ListingType NVARCHAR(64) NOT NULL,
    [Description] NVARCHAR(512),
    Price FLOAT,
    Condition NVARCHAR(64),
    ListingState NVARCHAR(64) NOT NULL, -- Visibility of listing
    CreationDate DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    LocationID INT NOT NULL,
    FOREIGN KEY(UserID) REFERENCES Users(UserID),
    FOREIGN KEY(BookID) REFERENCES Books(BookID),
    FOREIGN KEY(LocationID) REFERENCES Locations(LocationID)
);

CREATE TABLE ListingPhoto(
    PhotoID INT IDENTITY PRIMARY KEY,
    ListingID INT NOT NULL,
    ImagePath NVARCHAR(512) NOT NULL,
    FOREIGN KEY(ListingID) REFERENCES Listings(ListingID) ON DELETE CASCADE
);

CREATE TABLE Favorites(
    ListingID INT NOT NULL,
    UserID INT NOT NULL,
    PRIMARY KEY (ListingID, UserID),
    FOREIGN KEY(ListingID) REFERENCES Listings(ListingID) ON DELETE CASCADE,
    FOREIGN KEY(UserID) REFERENCES Users(UserID) ON DELETE CASCADE
);

CREATE TABLE Reports(
    ReportID INT IDENTITY PRIMARY KEY,
    UserID INT NOT NULL,
    ListingID INT NOT NULL,
    ReportType NVARCHAR(64) NOT NULL,
    Description NVARCHAR(512),
    CreationDate DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    FOREIGN KEY(UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY(ListingID) REFERENCES Listings(ListingID)
);

CREATE TABLE Notification(
    NotificationID INT IDENTITY PRIMARY KEY,
    NotificationType NVARCHAR(64) NOT NULL,
    Content NVARCHAR(512) NOT NULL,
    CreationDate DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    ListingID INT NULL,
    MessageID INT NULL,
    FOREIGN KEY(ListingID) REFERENCES Listings(ListingID)
);

CREATE TABLE UserNotification(
    UserID INT NOT NULL,
    NotificationID INT NOT NULL,
    PRIMARY KEY(UserID, NotificationID),
    FOREIGN KEY(UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY(NotificationID) REFERENCES Notification(NotificationID) ON DELETE CASCADE
);

CREATE TABLE Messages(
    MessageID INT IDENTITY PRIMARY KEY,
    SenderID INT NOT NULL,
    ListingID INT NOT NULL,
    ReceiverID INT NOT NULL,
    Content NVARCHAR(1024) NOT NULL,
    SentDate DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    FOREIGN KEY(SenderID) REFERENCES Users(UserID) ON DELETE NO ACTION,
    FOREIGN KEY(ReceiverID) REFERENCES Users(UserID) ON DELETE NO ACTION,
    FOREIGN KEY(ListingID) REFERENCES Listings(ListingID) ON DELETE NO ACTION
);

CREATE TABLE Transactions(
    TransactionID INT IDENTITY PRIMARY KEY,
    ListingID INT NOT NULL,
    BuyerID INT NOT NULL,
    TransactionDate DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    TransactionStatus BIT NOT NULL, -- TRUE if completed, FALSE if pending
    ConfirmedByBuyer BIT NOT NULL DEFAULT 0,
    ConfirmedBySeller BIT NOT NULL DEFAULT 0,
    FOREIGN KEY(ListingID) REFERENCES Listings(ListingID) ON DELETE CASCADE,
    FOREIGN KEY(BuyerID) REFERENCES Users(UserID) ON DELETE CASCADE,
);

CREATE TABLE RefreshTokens(
    TokenID INT IDENTITY PRIMARY KEY,
    UserID INT NOT NULL,
    TokenValue NVARCHAR(512) NOT NULL,
    ExpirationDate DATETIME2 NOT NULL,
    CreationDate DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    FOREIGN KEY(UserID) REFERENCES Users(UserID) ON DELETE CASCADE
);

CREATE INDEX IX_Listings_UserID ON Listings(UserID);
CREATE INDEX IX_Listings_BookID ON Listings(BookID);
CREATE INDEX IX_ListingPhoto_ListingID ON ListingPhoto(ListingID);
CREATE INDEX IX_Reports_ListingID ON Reports(ListingID);
CREATE INDEX IX_Reports_UserID ON Reports(UserID);
CREATE INDEX IX_UserNotification_UserID ON UserNotification(UserID);
CREATE INDEX IX_Notification_ListingID ON Notification(ListingID);

GO

ALTER TABLE Listings
ADD CONSTRAINT DF_Listings_UserID DEFAULT 1 FOR UserID;

GO

ALTER TABLE Listings
ADD CONSTRAINT FK_Listings_Users
FOREIGN KEY (UserID)
REFERENCES Users(UserID)
ON DELETE SET DEFAULT;

GO

CREATE OR ALTER TRIGGER TR_Users_DeleteMessages
ON Users
INSTEAD OF DELETE
AS
BEGIN
    SET NOCOUNT ON;

    -- Reassign SenderID
    UPDATE m
    SET SenderID = 1
    FROM Messages m
    JOIN deleted d ON m.SenderID = d.UserID;

    -- Reassign ReceiverID
    UPDATE m
    SET ReceiverID = 1
    FROM Messages m
    JOIN deleted d ON m.ReceiverID = d.UserID;

    -- Now it is safe to delete the users
    DELETE u
    FROM Users u
    JOIN deleted d ON u.UserID = d.UserID;
END;
GO