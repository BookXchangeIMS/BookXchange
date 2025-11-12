USE BookXchangeDB;
GO

-- =============================================
-- LOCATIONS
-- =============================================
IF OBJECT_ID('dbo.Locations', 'U') IS NULL
CREATE TABLE dbo.Locations (
    LocationID INT IDENTITY(1,1) PRIMARY KEY,
    Country VARCHAR(100) NOT NULL,
    City VARCHAR(100) NOT NULL
);
GO

-- =============================================
-- USERS
-- =============================================
IF OBJECT_ID('dbo.Users', 'U') IS NULL
CREATE TABLE dbo.Users (
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    Image_Path VARCHAR(500),
    Location_ID INT,
    Name VARCHAR(150) NOT NULL,
    AboutMe VARCHAR(500),
    Points INT DEFAULT 0,
    Role VARCHAR(50) CHECK (Role IN ('admin','teacher','student','buyer','seller')),
    PasswordHash VARCHAR(255) NOT NULL,
    Email VARCHAR(255) NOT NULL UNIQUE,
    CONSTRAINT FK_Users_Location 
        FOREIGN KEY (Location_ID) REFERENCES dbo.Locations(LocationID)
        ON DELETE SET NULL ON UPDATE CASCADE
);
GO

-- =============================================
-- ERROR LOGS
-- =============================================
IF OBJECT_ID('dbo.Error_Logs', 'U') IS NULL
CREATE TABLE dbo.Error_Logs (
    LogID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    Description VARCHAR(MAX),
    Type INT,
    LogDate DATETIME2 DEFAULT SYSDATETIME(),
    CONSTRAINT FK_ErrorLogs_User 
        FOREIGN KEY (UserID) REFERENCES dbo.Users(UserID)
        ON DELETE CASCADE ON UPDATE CASCADE
);
GO

-- =============================================
-- GENRES
-- =============================================
IF OBJECT_ID('dbo.Genres', 'U') IS NULL
CREATE TABLE dbo.Genres (
    GenreID INT IDENTITY(1,1) PRIMARY KEY,
    GenreName VARCHAR(100) NOT NULL UNIQUE
);
GO

-- =============================================
-- AUTHORS
-- =============================================
IF OBJECT_ID('dbo.Authors', 'U') IS NULL
CREATE TABLE dbo.Authors (
    AuthorID INT IDENTITY(1,1) PRIMARY KEY,
    AuthorName VARCHAR(150) NOT NULL
);
GO

-- =============================================
-- BOOK
-- =============================================
IF OBJECT_ID('dbo.Book', 'U') IS NULL
CREATE TABLE dbo.Book (
    ISBN INT IDENTITY(1,1) PRIMARY KEY,
    AuthorID INT,
    Title VARCHAR(255) NOT NULL,
    Year INT,
    CONSTRAINT FK_Book_Author 
        FOREIGN KEY (AuthorID) REFERENCES dbo.Authors(AuthorID)
        ON DELETE SET NULL ON UPDATE CASCADE
);
GO

-- =============================================
-- BOOK_GENRE (M:N)
-- =============================================
IF OBJECT_ID('dbo.Book_Genre', 'U') IS NULL
CREATE TABLE dbo.Book_Genre (
    GenreID INT NOT NULL,
    ISBN INT NOT NULL,
    PRIMARY KEY (GenreID, ISBN),
    CONSTRAINT FK_BookGenre_Genre 
        FOREIGN KEY (GenreID) REFERENCES dbo.Genres(GenreID)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT FK_BookGenre_Book 
        FOREIGN KEY (ISBN) REFERENCES dbo.Book(ISBN)
        ON DELETE CASCADE ON UPDATE CASCADE
);
GO

-- =============================================
-- PREFERENCES (M:N)
-- =============================================
IF OBJECT_ID('dbo.Preferences', 'U') IS NULL
CREATE TABLE dbo.Preferences (
    GenreID INT NOT NULL,
    UserID INT NOT NULL,
    PRIMARY KEY (GenreID, UserID),
    CONSTRAINT FK_Preferences_Genre 
        FOREIGN KEY (GenreID) REFERENCES dbo.Genres(GenreID)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT FK_Preferences_User 
        FOREIGN KEY (UserID) REFERENCES dbo.Users(UserID)
        ON DELETE CASCADE ON UPDATE CASCADE
);
GO

-- =============================================
-- NOTIFICATIONS
-- =============================================
IF OBJECT_ID('dbo.Notifications', 'U') IS NULL
CREATE TABLE dbo.Notifications (
    NotificationID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    NotificationContent VARCHAR(500),
    Status SMALLINT DEFAULT 0,
    CONSTRAINT FK_Notifications_User 
        FOREIGN KEY (UserID) REFERENCES dbo.Users(UserID)
        ON DELETE CASCADE ON UPDATE CASCADE
);
GO

-- =============================================
-- IMAGE
-- =============================================
IF OBJECT_ID('dbo.Image', 'U') IS NULL
CREATE TABLE dbo.Image (
    ImageID INT IDENTITY(1,1) PRIMARY KEY,
    Image_Path VARCHAR(500) NOT NULL,
    UploadedBy INT,
    UploadedAt DATETIME2 DEFAULT SYSDATETIME(),
    CONSTRAINT FK_Image_User 
        FOREIGN KEY (UploadedBy) REFERENCES dbo.Users(UserID)
        ON DELETE SET NULL ON UPDATE CASCADE
);
GO

-- =============================================
-- LISTINGS
-- =============================================
IF OBJECT_ID('dbo.Listings', 'U') IS NULL
CREATE TABLE dbo.Listings (
    ListingID INT IDENTITY(1,1) PRIMARY KEY,
    NotificationID INT,
    Location_ID INT,
    ISBN INT,
    Use_UserID INT,
    UserID INT,
    Image_Path VARCHAR(500),
    Type VARCHAR(20) CHECK (Type IN ('sale','exchange')),
    Price FLOAT CHECK (Price >= 0),
    DatePosted DATETIME2 DEFAULT SYSDATETIME(),
    ListingState SMALLINT DEFAULT 1,
    CONSTRAINT FK_Listings_Notification 
        FOREIGN KEY (NotificationID) REFERENCES dbo.Notifications(NotificationID)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT FK_Listings_Location 
        FOREIGN KEY (Location_ID) REFERENCES dbo.Locations(LocationID)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT FK_Listings_Book 
        FOREIGN KEY (ISBN) REFERENCES dbo.Book(ISBN)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT FK_Listings_User 
        FOREIGN KEY (UserID) REFERENCES dbo.Users(UserID)
        ON DELETE CASCADE ON UPDATE CASCADE
);
GO

-- =============================================
-- MESSAGES
-- =============================================
IF OBJECT_ID('dbo.Messages', 'U') IS NULL
CREATE TABLE dbo.Messages (
    MessageID INT IDENTITY(1,1) PRIMARY KEY,
    SenderID INT NOT NULL,
    ReceiverID INT NOT NULL,
    Content VARCHAR(MAX) NOT NULL,
    DateSent DATETIME2 DEFAULT SYSDATETIME(),
    CONSTRAINT FK_Messages_Sender 
        FOREIGN KEY (SenderID) REFERENCES dbo.Users(UserID)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT FK_Messages_Receiver 
        FOREIGN KEY (ReceiverID) REFERENCES dbo.Users(UserID)
        ON DELETE NO ACTION ON UPDATE CASCADE
);
GO

-- =============================================
-- REPORTS
-- =============================================
IF OBJECT_ID('dbo.Reports', 'U') IS NULL
CREATE TABLE dbo.Reports (
    ReportID INT IDENTITY(1,1) PRIMARY KEY,
    Description VARCHAR(500),
    Category INT,
    ListingID INT,
    UserID INT,
    ReportedUserID INT,
    CreatedAt DATETIME2 DEFAULT SYSDATETIME(),
    CONSTRAINT FK_Reports_Listing 
        FOREIGN KEY (ListingID) REFERENCES dbo.Listings(ListingID)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT FK_Reports_User 
        FOREIGN KEY (UserID) REFERENCES dbo.Users(UserID)
        ON DELETE NO ACTION ON UPDATE CASCADE,
    CONSTRAINT FK_Reports_ReportedUser 
        FOREIGN KEY (ReportedUserID) REFERENCES dbo.Users(UserID)
        ON DELETE SET NULL ON UPDATE CASCADE
);
GO

-- =============================================
-- GAMIFICATION_EXTRACT
-- =============================================
IF OBJECT_ID('dbo.Gamification_Extract', 'U') IS NULL
CREATE TABLE dbo.Gamification_Extract (
    ExtractID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    Transaction_Date DATETIME2 DEFAULT SYSDATETIME(),
    Points_Transacted FLOAT,
    Reason VARCHAR(255),
    CONSTRAINT FK_Gamification_User 
        FOREIGN KEY (UserID) REFERENCES dbo.Users(UserID)
        ON DELETE CASCADE ON UPDATE CASCADE
);
GO
