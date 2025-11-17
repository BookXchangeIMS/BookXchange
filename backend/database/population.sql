USE BookXchange;
GO

-- Populate Users
INSERT INTO [User] (Name, Email, PasswordHash, ProfileImagePath, UserRole, AboutMe, CreationDate)
VALUES
('Alice Johnson', 'alice@example.com', 'Password123!', 'images/user1.jpg', 'Admin', 'Avid reader and book collector.', SYSDATETIME()),
('Bob Smith', 'bob@example.com', 'Password123!', 'images/user2.jpg', 'Member', 'Love trading rare editions.', SYSDATETIME()),
('Charlie Brown', 'charlie@example.com', 'Password123!', 'images/user3.jpg', 'Member', 'Casual reader.', SYSDATETIME()),
('Diana Prince', 'diana@example.com', 'Password123!', 'images/user4.jpg', 'Admin', 'Always on the lookout for classics.', SYSDATETIME()),
('Ethan Hunt', 'ethan@example.com', 'Password123!', 'images/user5.jpg', 'Member', 'Enjoys mystery novels.', SYSDATETIME());

-- Populate Genres
INSERT INTO Genre (GenreName)
VALUES
('Science Fiction'),
('Mystery'),
('Fantasy'),
('Non-Fiction'),
('Romance');

-- Populate User Genre Preferences
INSERT INTO UserGenrePreference (UserID, GenreID)
VALUES
(1, 1), -- Alice likes Sci-Fi
(1, 3), -- Alice likes Fantasy
(2, 2), -- Bob likes Mystery
(3, 3), -- Charlie likes Fantasy
(4, 4), -- Diana likes Non-Fiction
(5, 5); -- Ethan likes Romance

-- Populate Books
INSERT INTO Book (Title, Language, ReleaseDate, Edition)
VALUES
('Dune', 'English', '1965-01-01', 1),
('The Hound of the Baskervilles', 'English', '1902-01-01', 1),
('The Hobbit', 'English', '1937-01-01', 2),
('Sapiens: A Brief History of Humankind', 'English', '2011-01-01', 1),
('Pride and Prejudice', 'English', '1813-01-01', 3);

-- Populate Authors
INSERT INTO Author (AuthorName)
VALUES
('Frank Herbert'),
('Arthur Conan Doyle'),
('J.R.R. Tolkien'),
('Yuval Noah Harari'),
('Jane Austen');

-- Link Authors to Books (Many-to-Many)
INSERT INTO AuthorBook (AuthorID, BookID)
VALUES
(1, 1), -- Frank Herbert → Dune
(2, 2), -- Arthur Conan Doyle → Hound of Baskervilles
(3, 3), -- J.R.R. Tolkien → The Hobbit
(4, 4), -- Yuval Noah Harari → Sapiens
(5, 5); -- Jane Austen → Pride and Prejudice

-- Populate Listings
INSERT INTO Listing (UserID, BookID, Price, ListingType, ListingState, CreationDate)
VALUES
(1, 1, 15.99, 'Sale', 'Active', SYSDATETIME()),
(2, 2, 10.50, 'Sale', 'Active', SYSDATETIME()),
(3, 3, 8.75, 'Exchange', 'Active', SYSDATETIME()),
(4, 4, 20.00, 'Sale', 'Active', SYSDATETIME()),
(5, 5, 5.99, 'Donation', 'Active', SYSDATETIME());

-- Populate Listing Photos
INSERT INTO ListingPhoto (ListingID, ImagePath)
VALUES
(1, 'images/book1.jpg'),
(1, 'images/book1_alt.jpg'), -- Multiple photos for same listing
(2, 'images/book2.jpg'),
(3, 'images/book3.jpg'),
(4, 'images/book4.jpg'),
(5, 'images/book5.jpg');

-- Populate Notifications
INSERT INTO Notification (NotificationType, Content, CreationDate, ListingID, MessageID)
VALUES
('NewListing', 'A new book matching your preferences has been listed!', SYSDATETIME(), 1, NULL),
('Message', 'You have received a new message.', SYSDATETIME(), NULL, NULL),
('ListingSold', 'Your book has been sold!', SYSDATETIME(), 2, NULL),
('PriceUpdate', 'Price updated for listing you are watching.', SYSDATETIME(), 3, NULL),
('System', 'Welcome to BookXchange!', SYSDATETIME(), NULL, NULL);

-- Link Notifications to Users (Many-to-Many)
INSERT INTO UserNotification (UserID, NotificationID, IsRead, ReadDate)
VALUES
(1, 1, 0, NULL),           -- Alice has unread notification
(2, 2, 1, SYSDATETIME()),  -- Bob read his message
(2, 3, 1, SYSDATETIME()),  -- Bob's book sold
(3, 4, 0, NULL),           -- Charlie has unread price update
(4, 5, 1, SYSDATETIME()),  -- Diana read welcome message
(5, 5, 0, NULL);           -- Ethan has unread welcome message