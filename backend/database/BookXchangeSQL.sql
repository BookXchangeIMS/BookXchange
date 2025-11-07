-- ==========================
-- USERS
-- ==========================
CREATE TABLE Users (
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    Image_Path NVARCHAR(255),
    Location_ID INT,
    Name NVARCHAR(100) NOT NULL,
    AboutMe NVARCHAR(500),
    Points INT DEFAULT 0,
    Role CHAR(1),
    Password NVARCHAR(255) NOT NULL,
    Email NVARCHAR(255) NOT NULL
);

-- ==========================
-- LOCATIONS
-- ==========================
CREATE TABLE Locations (
    Location_ID INT IDENTITY(1,1) PRIMARY KEY,
    Country NVARCHAR(100) NOT NULL,
    City NVARCHAR(100) NOT NULL
);

ALTER TABLE Users
ADD CONSTRAINT FK_Users_Location
    FOREIGN KEY (Location_ID)
    REFERENCES Locations(Location_ID);

-- ==========================
-- MESSAGES
-- ==========================
CREATE TABLE Messages (
    MessageID INT IDENTITY(1,1) PRIMARY KEY,
    SenderID INT NOT NULL,
    ReceiverID INT NOT NULL,
    Content NVARCHAR(MAX),
    Date DATETIME2 DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Messages_Sender
        FOREIGN KEY (SenderID) REFERENCES Users(UserID),
    CONSTRAINT FK_Messages_Receiver
        FOREIGN KEY (ReceiverID) REFERENCES Users(UserID)
);

-- ==========================
-- IMAGE (Profile or Listing)
-- ==========================
CREATE TABLE Image (
    ImageID INT IDENTITY(1,1) PRIMARY KEY,
    Image_Path NVARCHAR(255) NOT NULL
);

-- ==========================
-- GENRES
-- ==========================
CREATE TABLE Genres (
    GenreID INT IDENTITY(1,1) PRIMARY KEY,
    GenreName NVARCHAR(100) NOT NULL
);

-- ==========================
-- BOOK
-- ==========================
CREATE TABLE Book (
    ISBN INT PRIMARY KEY,
    Name NVARCHAR(200) NOT NULL,
    Year DATE,
    Author NVARCHAR(150),
    Edition INT
);

-- ==========================
-- BOOK_GENRE (Many-to-Many)
-- ==========================
CREATE TABLE Book_Genre (
    ISBN INT NOT NULL,
    GenreID INT NOT NULL,
    PRIMARY KEY (ISBN, GenreID),
    CONSTRAINT FK_BookGenre_Book
        FOREIGN KEY (ISBN) REFERENCES Book(ISBN),
    CONSTRAINT FK_BookGenre_Genre
        FOREIGN KEY (GenreID) REFERENCES Genres(GenreID)
);

-- ==========================
-- LISTINGS
-- ==========================
CREATE TABLE Listings (
    ListingID INT IDENTITY(1,1) PRIMARY KEY,
    Notification_ID INT,
    Location_ID INT,
    UserID INT NOT NULL,
    Type INT,
    Price FLOAT,
    DataPosted DATETIME2 DEFAULT SYSUTCDATETIME(),
    ListingState SMALLINT,
    Image_Path NVARCHAR(255),
    CONSTRAINT FK_Listings_User
        FOREIGN KEY (UserID) REFERENCES Users(UserID),
    CONSTRAINT FK_Listings_Location
        FOREIGN KEY (Location_ID) REFERENCES Locations(Location_ID)
);

-- ==========================
-- BOOKLISTED
-- ==========================
CREATE TABLE BookListed (
    ListingID INT NOT NULL,
    ISBN INT NOT NULL,
    PRIMARY KEY (ListingID, ISBN),
    CONSTRAINT FK_BookListed_Listing
        FOREIGN KEY (ListingID) REFERENCES Listings(ListingID),
    CONSTRAINT FK_BookListed_Book
        FOREIGN KEY (ISBN) REFERENCES Book(ISBN)
);

-- ==========================
-- TRANSACTION_LOG
-- ==========================
CREATE TABLE Transaction_Log (
    TransactionID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    ListingID INT NOT NULL,
    Transaction_Date DATETIME2 DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Transaction_User
        FOREIGN KEY (UserID) REFERENCES Users(UserID),
    CONSTRAINT FK_Transaction_Listing
        FOREIGN KEY (ListingID) REFERENCES Listings(ListingID)
);

-- ==========================
-- REPORTS
-- ==========================
CREATE TABLE Reports (
    ReportID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    ListingID INT NOT NULL,
    Description NVARCHAR(1000),
    Category INT,
    CONSTRAINT FK_Reports_User
        FOREIGN KEY (UserID) REFERENCES Users(UserID),
    CONSTRAINT FK_Reports_Listing
        FOREIGN KEY (ListingID) REFERENCES Listings(ListingID)
);

-- ==========================
-- PREFERENCES
-- ==========================
CREATE TABLE Preferences (
    UserID INT NOT NULL,
    GenreID INT NOT NULL,
    PRIMARY KEY (UserID, GenreID),
    CONSTRAINT FK_Preferences_User
        FOREIGN KEY (UserID) REFERENCES Users(UserID),
    CONSTRAINT FK_Preferences_Genre
        FOREIGN KEY (GenreID) REFERENCES Genres(GenreID)
);

-- ==========================
-- NOTIFICATIONS
-- ==========================
CREATE TABLE Notifications (
    Notification_ID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    Notification_Content NVARCHAR(500),
    Status SMALLINT DEFAULT 0,
    CONSTRAINT FK_Notifications_User
        FOREIGN KEY (UserID) REFERENCES Users(UserID)
);

-- ==========================
-- ERROR_LOGS
-- ==========================
CREATE TABLE Error_Logs (
    LogID INT IDENTITY(1,1) PRIMARY KEY,
    Description NVARCHAR(500),
    Type INT
);
