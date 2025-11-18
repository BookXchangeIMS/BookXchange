USE BookXchange;
GO

-- Core tables first (no dependencies)

-- Populate Users
INSERT INTO Users (Name, Email, PasswordHash, ProfileImagePath, UserRole, AboutMe, CreationDate)
VALUES
('Alice Johnson', 'alice@example.com', 'Password123!', 'images/user1.jpg', 'Admin', 'Avid reader and book collector.', SYSDATETIME()),
('Bob Smith', 'bob@example.com', 'Password123!', 'images/user2.jpg', 'Member', 'Love trading rare editions.', SYSDATETIME()),
('Charlie Brown', 'charlie@example.com', 'Password123!', 'images/user3.jpg', 'Member', 'Casual reader.', SYSDATETIME()),
('Diana Prince', 'diana@example.com', 'Password123!', 'images/user4.jpg', 'Admin', 'Always on the lookout for classics.', SYSDATETIME()),
('Ethan Hunt', 'ethan@example.com', 'Password123!', 'images/user5.jpg', 'Member', 'Enjoys mystery novels.', SYSDATETIME());

-- Populate Genres
INSERT INTO Genres (GenreName)
VALUES
('Science Fiction'),
('Mystery'),
('Fantasy'),
('Non-Fiction'),
('Romance');

-- Populate Books
INSERT INTO Books (Title, Language, ReleaseDate, Edition)
VALUES
('Dune', 'English', '1965-01-01', 1),
('The Hound of the Baskervilles', 'English', '1902-01-01', 1),
('The Hobbit', 'English', '1937-01-01', 2),
('Sapiens: A Brief History of Humankind', 'English', '2011-01-01', 1),
('Pride and Prejudice', 'English', '1813-01-01', 3);

-- Populate Authors
INSERT INTO Authors (AuthorName)
VALUES
('Frank Herbert'),
('Arthur Conan Doyle'),
('J.R.R. Tolkien'),
('Yuval Noah Harari'),
('Jane Austen');

-- Junction tables (depend on core tables)

-- Populate User Genre Preferences
INSERT INTO Preferences (UserID, GenreID)
VALUES
(1, 1), -- Alice likes Sci-Fi
(1, 3), -- Alice likes Fantasy
(2, 2), -- Bob likes Mystery
(3, 3), -- Charlie likes Fantasy
(4, 4), -- Diana likes Non-Fiction
(5, 5); -- Ethan likes Romance

-- Link Authors to Books
INSERT INTO AuthorBook (AuthorID, BookID)
VALUES
(1, 1), -- Frank Herbert → Dune
(2, 2), -- Arthur Conan Doyle → Hound of Baskervilles
(3, 3), -- J.R.R. Tolkien → The Hobbit
(4, 4), -- Yuval Noah Harari → Sapiens
(5, 5); -- Jane Austen → Pride and Prejudice

-- Listings (depends on Users and Books)

-- Populate Listings
INSERT INTO Listings (UserID, BookID, ListingType, Price, ListingState, CreationDate)
VALUES
(1, 1, 'Sale', 15.99, 'Active', SYSDATETIME()),
(2, 2, 'Sale', 10.50, 'Active', SYSDATETIME()),
(3, 3, 'Exchange', NULL, 'Active', SYSDATETIME()),
(4, 4, 'Sale', 20.00, 'Active', SYSDATETIME()),
(5, 5, 'Donation', NULL, 'Active', SYSDATETIME());

-- Tables depending on Listings

-- Populate Listing Photos
INSERT INTO ListingPhoto (ListingID, ImagePath)
VALUES
(1, 'images/book1.jpg'),
(1, 'images/book1_alt.jpg'),
(2, 'images/book2.jpg'),
(3, 'images/book3.jpg'),
(4, 'images/book4.jpg'),
(5, 'images/book5.jpg');

-- Populate Reports
INSERT INTO Reports (UserID, ListingID, ReportType, Description, CreationDate)
VALUES
(3, 1, 'IncorrectDescription', 'Book condition does not match description.', SYSDATETIME()),
(4, 2, 'InappropriatePricing', 'Price seems unfair for book condition.', SYSDATETIME()),
(5, 3, 'DuplicateListing', 'This book has been listed multiple times.', SYSDATETIME());

-- Populate Notifications
INSERT INTO Notification (NotificationType, Content, CreationDate, ListingID, MessageID)
VALUES
('NewListing', 'A new book matching your preferences has been listed!', SYSDATETIME(), 1, NULL),
('Message', 'You have received a new message.', SYSDATETIME(), NULL, NULL),
('ListingSold', 'Your book has been sold!', SYSDATETIME(), 2, NULL),
('PriceUpdate', 'Price updated for listing you are watching.', SYSDATETIME(), 3, NULL),
('System', 'Welcome to BookXchange!', SYSDATETIME(), NULL, NULL);

-- Final junction table

-- Link Notifications to Users
INSERT INTO UserNotification (UserID, NotificationID)
VALUES
(1, 1), -- Alice gets new listing notification
(2, 2), -- Bob gets message notification
(2, 3), -- Bob gets sold notification
(3, 4), -- Charlie gets price update
(4, 5), -- Diana gets welcome message
(5, 5); -- Ethan gets welcome message
