-- BookXchangeDB - Revised Schema
-- Naming: Singular tables, CamelCase, ID uppercase, "Date" suffix, "Type" for enums
-- Types: VARCHAR in powers of 2 (64/128/256/512), string enums for states

-- Drop tables in dependency order
IF OBJECT_ID('UserNotification','U') IS NOT NULL DROP TABLE UserNotification;
IF OBJECT_ID('Notification','U') IS NOT NULL DROP TABLE Notification;
IF OBJECT_ID('AuthorBook','U') IS NOT NULL DROP TABLE AuthorBook;
IF OBJECT_ID('Author','U') IS NOT NULL DROP TABLE Author;
IF OBJECT_ID('ListingPhoto','U') IS NOT NULL DROP TABLE ListingPhoto;
IF OBJECT_ID('Listing','U') IS NOT NULL DROP TABLE Listing;
IF OBJECT_ID('Book','U') IS NOT NULL DROP TABLE Book;
IF OBJECT_ID('UserGenrePreference','U') IS NOT NULL DROP TABLE UserGenrePreference;
IF OBJECT_ID('Genre','U') IS NOT NULL DROP TABLE Genre;
IF OBJECT_ID('User','U') IS NOT NULL DROP TABLE [User];

-- Users Table
CREATE TABLE [User](
    UserID INT IDENTITY PRIMARY KEY,
    Name NVARCHAR(256) NOT NULL,
    Email NVARCHAR(256) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(256) NOT NULL,
    ProfileImagePath NVARCHAR(512),
    UserRole NVARCHAR(64) NOT NULL, -- e.g. 'Admin', 'Member', 'Moderator'
    AboutMe NVARCHAR(512),
    CreationDate DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);

-- Genres Table
CREATE TABLE Genre(
    GenreID INT IDENTITY PRIMARY KEY,
    GenreName NVARCHAR(128) NOT NULL UNIQUE
);

-- User Genre Preferences (Many-to-Many)
CREATE TABLE UserGenrePreference(
    UserID INT NOT NULL,
    GenreID INT NOT NULL,
    PRIMARY KEY(UserID, GenreID),
    FOREIGN KEY(UserID) REFERENCES [User](UserID) ON DELETE CASCADE,
    FOREIGN KEY(GenreID) REFERENCES Genre(GenreID) ON DELETE CASCADE
);

-- Books Table
-- Purpose: Catalog of books available in the system
-- Filled: When users create listings, if book doesn't exist yet
CREATE TABLE Book(
    BookID INT IDENTITY PRIMARY KEY,
    Title NVARCHAR(256) NOT NULL,
    Language NVARCHAR(64), -- e.g. 'English', 'Portuguese', 'Spanish'
    ReleaseDate DATE, -- Full date for future-proofing
    Edition INT
);

-- Authors Table
CREATE TABLE Author(
    AuthorID INT IDENTITY PRIMARY KEY,
    AuthorName NVARCHAR(256) NOT NULL
);

-- Author-Book Junction Table (Many-to-Many)
-- One book can have multiple authors, one author can write multiple books
CREATE TABLE AuthorBook(
    AuthorID INT NOT NULL,
    BookID INT NOT NULL,
    PRIMARY KEY(AuthorID, BookID),
    FOREIGN KEY(AuthorID) REFERENCES Author(AuthorID) ON DELETE CASCADE,
    FOREIGN KEY(BookID) REFERENCES Book(BookID) ON DELETE CASCADE
);

-- Listings Table
CREATE TABLE Listing(
    ListingID INT IDENTITY PRIMARY KEY,
    UserID INT NOT NULL,
    BookID INT NOT NULL,
    Price DECIMAL(10,2), -- Changed from FLOAT for monetary precision
    ListingType NVARCHAR(64) NOT NULL, -- e.g. 'Sale', 'Exchange', 'Donation'
    ListingState NVARCHAR(64) NOT NULL, -- e.g. 'Active', 'Sold', 'Expired', 'Deleted'
    CreationDate DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    FOREIGN KEY(UserID) REFERENCES [User](UserID),
    FOREIGN KEY(BookID) REFERENCES Book(BookID)
);

-- Listing Photos (Many-to-One)
-- One listing can have multiple photos
CREATE TABLE ListingPhoto(
    PhotoID INT IDENTITY PRIMARY KEY,
    ListingID INT NOT NULL,
    ImagePath NVARCHAR(512) NOT NULL,
    FOREIGN KEY(ListingID) REFERENCES Listing(ListingID) ON DELETE CASCADE
);

-- Notifications Table
-- Purpose: Store notification templates/content
-- Implementation: When a new listing is created, a batch process or trigger
-- creates notification records and links them to relevant users via UserNotification
CREATE TABLE Notification(
    NotificationID INT IDENTITY PRIMARY KEY,
    NotificationType NVARCHAR(64) NOT NULL, -- e.g. 'NewListing', 'Message', 'PriceUpdate'
    Content NVARCHAR(512) NOT NULL,
    CreationDate DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    ListingID INT NULL, -- Optional reference to related listing
    MessageID INT NULL, -- Optional reference to related message (future implementation)
    FOREIGN KEY(ListingID) REFERENCES Listing(ListingID) ON DELETE SET NULL
);

-- User-Notification Junction Table (Many-to-Many)
-- Links notifications to users who should receive them
-- Implementation: Populated by recommendation algorithm when new listing is created
CREATE TABLE UserNotification(
    UserID INT NOT NULL,
    NotificationID INT NOT NULL,
    IsRead BIT NOT NULL DEFAULT 0, -- Track read status per user
    ReadDate DATETIME2 NULL, -- When user read the notification
    PRIMARY KEY(UserID, NotificationID),
    FOREIGN KEY(UserID) REFERENCES [User](UserID) ON DELETE CASCADE,
    FOREIGN KEY(NotificationID) REFERENCES Notification(NotificationID) ON DELETE CASCADE
);

-- Indexes for Performance
CREATE INDEX IX_Listing_UserID ON Listing(UserID);
CREATE INDEX IX_Listing_BookID ON Listing(BookID);
CREATE INDEX IX_Listing_CreationDate ON Listing(CreationDate DESC);
CREATE INDEX IX_Notification_CreationDate ON Notification(CreationDate DESC);
CREATE INDEX IX_UserNotification_IsRead ON UserNotification(UserID, IsRead);