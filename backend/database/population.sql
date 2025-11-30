USE BookXchange;
GO


INSERT INTO Locations (Longitude, Latitude, Address, [Description])
VALUES
(-74.0060, 40.7128, '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA', 'room 5'),
(-118.2437, 34.0522, '1 Apple Park Way, Cupertino, CA 95014, USA', ''),
(-0.1276, 51.5074, '221B Baker Street, London NW1 6XE, United Kingdom', ''),
(151.2093, -33.8688, '350 Fifth Avenue, New York, NY 10118, USA', ''),
(139.6917, 35.6895, 'Piazza del Colosseo, 1, 00184 Rome RM, Italy', '');


INSERT INTO Users ([Name], Email, PasswordHash, ProfileImagePath, UserRole, AboutMe, CreationDate, DateOfBirth, LocationID)
VALUES
('Alice Johnson', 'alice@example.com', 'Password123!', 'backend/images/profile_pictures/user1.jpg', 'Admin', 'Avid reader and book collector.', SYSDATETIME(), '1990-05-15', 1),
('Bob Smith', 'bob@example.com', 'Password123!', 'backend/images/profile_pictures/user2.jpg', 'Member', 'Love trading rare editions.', SYSDATETIME(), '1985-08-22', 2),
('Charlie Brown', 'charlie@example.com', 'Password123!', 'backend/images/profile_pictures/user3.jpg', 'Member', 'Casual reader.', SYSDATETIME(), '1992-11-30', 3),
('Diana Prince', 'diana@example.com', 'Password123!', 'backend/images/profile_pictures/user4.jpg', 'Admin', 'Always on the lookout for classics.', SYSDATETIME(), '1988-03-10', 4),
('Ethan Hunt', 'ethan@example.com', 'Password123!', 'backend/images/profile_pictures/user5.jpg', 'Member', 'Enjoys mystery novels.', SYSDATETIME(),'1979-07-13', 5);


INSERT INTO Genres (GenreName)
VALUES
('Science Fiction'),
('Mystery'),
('Fantasy'),
('Non-Fiction'),
('Romance'),
('History'),
('Biography'),
('Horror'),
('Adventure'),
('Thriller');
 


INSERT INTO Books (Title, [Language], ReleaseDate, [Edition], ISBN)
VALUES
('Dune', 'English', '1965-01-01', 1, 123),
('The Hound of the Baskervilles', 'English', '1902-01-01', 1, 132),
('The Hobbit', 'English', '1937-01-01', 2, 312),
('Sapiens: A Brief History of Humankind', 'English', '2011-01-01', 1, 213),
('Pride and Prejudice', 'English', '1813-01-01', 3, 321);

INSERT INTO BookGenre (BookID, GenreID)
VALUES
(1, 1),
(1,2),
(2,3)


INSERT INTO Authors (AuthorName)
VALUES
('Frank Herbert'),
('Arthur Conan Doyle'),
('J.R.R. Tolkien'),
('Yuval Noah Harari'),
('Jane Austen');


INSERT INTO Preferences (UserID, GenreID)
VALUES
(1, 1), 
(1, 3), 
(2, 2), 
(3, 3), 
(4, 4), 
(5, 5); 


INSERT INTO AuthorBook (AuthorID, BookID)
VALUES
(1, 1), 
(2, 2), 
(3, 3), 
(4, 4), 
(5, 5); 


INSERT INTO Listings (UserID, BookID, ListingType, Price, ListingState, CreationDate, [Description], LocationID, Condition)
VALUES
(1, 1, 'Sale', 15.99, 'Active', SYSDATETIME(), "baaaad", 1, "good"),
(2, 2, 'Sale', 10.50, 'Active', SYSDATETIME(), "baaaad", 1, "good"),
(3, 3, 'Exchange', NULL, 'Active', SYSDATETIME(), "baaaad", 1, "good"),
(4, 4, 'Sale', 20.00, 'Active', SYSDATETIME(), "baaaad", 1, "good"),
(5, 5, 'Donation', NULL, 'Active', SYSDATETIME(), "baaaad", 1, "good");


INSERT INTO ListingPhoto (ListingID, ImagePath)
VALUES
(1, 'backend/images/listing_pictures/book1.jpg'),
(2, 'backend/images/listing_pictures/book2-1.jpg'),
(2, 'backend/images/listing_pictures/book2-2.jpg'),
(3, 'backend/images/listing_pictures/book3.jpg'),
(4, 'backend/images/listing_pictures/book4.jpg'),
(5, 'backend/images/listing_pictures/book5.jpg');


INSERT INTO Reports (UserID, ListingID, ReportType, [Description], CreationDate)
VALUES
(3, 1, 'IncorrectDescription', 'Book condition does not match description.', SYSDATETIME()),
(4, 2, 'InappropriatePricing', 'Price seems unfair for book condition.', SYSDATETIME()),
(5, 3, 'DuplicateListing', 'This book has been listed multiple times.', SYSDATETIME());


INSERT INTO Notification (NotificationType, Content, CreationDate, ListingID, MessageID)
VALUES
('NewListing', 'A new book matching your preferences has been listed!', SYSDATETIME(), 1, NULL),
('Message', 'You have received a new message.', SYSDATETIME(), NULL, NULL),
('ListingSold', 'Your book has been sold!', SYSDATETIME(), 2, NULL),
('PriceUpdate', 'Price updated for listing you are watching.', SYSDATETIME(), 3, NULL),
('System', 'Welcome to BookXchange!', SYSDATETIME(), NULL, NULL);


INSERT INTO UserNotification (UserID, NotificationID)
VALUES
(1, 1),
(2, 2), 
(2, 3), 
(3, 4), 
(4, 5), 
(5, 5);

INSERT INTO Messages (SenderID, ListingID, ReceiverID, Content, SentDate)
VALUES
(2, 1, 1, "Is it still for sale?", '2025-01-10 09:00:00'),
(1, 1, 2, "Yeah, sure!", '2025-01-10 09:01:00'),
(1, 1, 2, "Want to meet? I can show you",'2025-01-10 09:02:00'),
(3, 2, 2, "Hello, can I get this one cheaper?", '2025-01-10 09:00:00'),
(2, 2, 3, "Nope.", '2025-01-10 09:05:00');

