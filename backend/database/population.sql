USE BookXchange;
GO


INSERT INTO Locations (Longitude, Latitude, [Description])
VALUES
(-74.0060, 40.7128, 'New York City, NY'),
(-118.2437, 34.0522, 'Los Angeles, CA'),
(-0.1276, 51.5074, 'London, UK'),
(151.2093, -33.8688, 'Sydney, Australia'),
(139.6917, 35.6895, 'Tokyo, Japan');


INSERT INTO Users ([Name], Email, PasswordHash, ProfileImagePath, UserRole, AboutMe, CreationDate, DateOfBirth, LocationID)
VALUES
('Alice Johnson', 'alice@example.com', 'Password123!', 'images/user1.jpg', 'Admin', 'Avid reader and book collector.', SYSDATETIME(), '1990-05-15', 1),
('Bob Smith', 'bob@example.com', 'Password123!', 'images/user2.jpg', 'Member', 'Love trading rare editions.', SYSDATETIME(), '1985-08-22', 2),
('Charlie Brown', 'charlie@example.com', 'Password123!', 'images/user3.jpg', 'Member', 'Casual reader.', SYSDATETIME(), '1992-11-30', 3),
('Diana Prince', 'diana@example.com', 'Password123!', 'images/user4.jpg', 'Admin', 'Always on the lookout for classics.', SYSDATETIME(), '1988-03-10', 4),
('Ethan Hunt', 'ethan@example.com', 'Password123!', 'images/user5.jpg', 'Member', 'Enjoys mystery novels.', SYSDATETIME(),'1979-07-13', 5);


INSERT INTO Genres (GenreName)
VALUES
('Science Fiction'),
('Mystery'),
('Fantasy'),
('Non-Fiction'),
('Romance');


INSERT INTO Books (Title, [Language], ReleaseDate, [Edition])
VALUES
('Dune', 'English', '1965-01-01', 1),
('The Hound of the Baskervilles', 'English', '1902-01-01', 1),
('The Hobbit', 'English', '1937-01-01', 2),
('Sapiens: A Brief History of Humankind', 'English', '2011-01-01', 1),
('Pride and Prejudice', 'English', '1813-01-01', 3);


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


INSERT INTO Listings (UserID, BookID, ListingType, Price, ListingState, CreationDate)
VALUES
(1, 1, 'Sale', 15.99, 'Active', SYSDATETIME()),
(2, 2, 'Sale', 10.50, 'Active', SYSDATETIME()),
(3, 3, 'Exchange', NULL, 'Active', SYSDATETIME()),
(4, 4, 'Sale', 20.00, 'Active', SYSDATETIME()),
(5, 5, 'Donation', NULL, 'Active', SYSDATETIME());


INSERT INTO ListingPhoto (ListingID, ImagePath)
VALUES
(1, 'images/book1.jpg'),
(1, 'images/book1_alt.jpg'),
(2, 'images/book2.jpg'),
(3, 'images/book3.jpg'),
(4, 'images/book4.jpg'),
(5, 'images/book5.jpg');


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
