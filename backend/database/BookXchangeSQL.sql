-- BookXchange  db Schema
-- Naming: Plural tables, CamelCase, ID uppercase, "Date" suffix, "Type" for enums

-- Drop tables in dependency order
IF OBJECT_ID('UserNotification','U') IS NOT NULL DROP TABLE UserNotification;
IF OBJECT_ID('Notification','U') IS NOT NULL DROP TABLE Notification;
IF OBJECT_ID('Reports','U') IS NOT NULL DROP TABLE Reports;
IF OBJECT_ID('AuthorBook','U') IS NOT NULL DROP TABLE AuthorBook;
IF OBJECT_ID('Authors','U') IS NOT NULL DROP TABLE Authors;
IF OBJECT_ID('ListingPhoto','U') IS NOT NULL DROP TABLE ListingPhoto;
IF OBJECT_ID('Listings','U') IS NOT NULL DROP TABLE Listings;
IF OBJECT_ID('Books','U') IS NOT NULL DROP TABLE Books;
IF OBJECT_ID('Preferences','U') IS NOT NULL DROP TABLE Preferences;
IF OBJECT_ID('Genres','U') IS NOT NULL DROP TABLE Genres;
IF OBJECT_ID('Users','U') IS NOT NULL DROP TABLE Users;


CREATE TABLE Favorites(
        UserID INT NOT NULL,
        ListingID INT NOT NULL,
        CreationDate DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        PRIMARY KEY(UserID, ListingID),
        FOREIGN KEY(UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
        FOREIGN KEY(ListingID) REFERENCES Listings(ListingID) ON DELETE CASCADE
    );
    
CREATE TABLE Users(
    UserID INT IDENTITY PRIMARY KEY,
    [Name] NVARCHAR(256) NOT NULL,
    DateOfBirth DATE NOT NULL,
    Email NVARCHAR(256) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(256) NOT NULL,
    ProfileImagePath NVARCHAR(512),
    UserRole NVARCHAR(64) NOT NULL,
    AboutMe NVARCHAR(512),
    CreationDate DATETIME2 NOT NULL DEFAULT SYSDATETIME()
    FOREIGN KEY(Location_ID) REFERENCES Locations(Location_ID)
);

CREATE TABLE Locations (
    Location_ID INT IDENTITY(1,1) PRIMARY KEY,
    Country NVARCHAR(100) NOT NULL,
    City NVARCHAR(100) NOT NULL
);

CREATE TABLE Genres(
    GenreID INT IDENTITY PRIMARY KEY,
    GenreName NVARCHAR(256) NOT NULL
);

CREATE TABLE Preferences(
    UserID INT NOT NULL,
    GenreID INT NOT NULL,
    PRIMARY KEY(UserID, GenreID),
    FOREIGN KEY(UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY(GenreID) REFERENCES Genres(GenreID) ON DELETE CASCADE
);

CREATE TABLE Books(
    BookID INT IDENTITY PRIMARY KEY,
    Title NVARCHAR(256) NOT NULL,
    Language NVARCHAR(64),
    ReleaseDate DATE,
    Edition INT
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

CREATE TABLE Listings(
    ListingID INT IDENTITY PRIMARY KEY,
    UserID INT NOT NULL,
    BookID INT NOT NULL,
    ListingType NVARCHAR(64) NOT NULL,
    Price FLOAT,
    ListingState NVARCHAR(64) NOT NULL,
    CreationDate DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    FOREIGN KEY(UserID) REFERENCES Users(UserID),
    FOREIGN KEY(BookID) REFERENCES Books(BookID)
);

CREATE TABLE ListingPhoto(
    PhotoID INT IDENTITY PRIMARY KEY,
    ListingID INT NOT NULL,
    ImagePath NVARCHAR(512) NOT NULL,
    FOREIGN KEY(ListingID) REFERENCES Listings(ListingID) ON DELETE CASCADE
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

-- Performance Indexes
CREATE INDEX IX_Listings_UserID ON Listings(UserID);
CREATE INDEX IX_Listings_BookID ON Listings(BookID);
CREATE INDEX IX_ListingPhoto_ListingID ON ListingPhoto(ListingID);
CREATE INDEX IX_Reports_ListingID ON Reports(ListingID);
CREATE INDEX IX_Reports_UserID ON Reports(UserID);
CREATE INDEX IX_UserNotification_UserID ON UserNotification(UserID);
CREATE INDEX IX_Notification_ListingID ON Notification(ListingID);