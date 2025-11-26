-- Populate BookXchange Database with Mock Data
USE BookXchange;
GO

-- Clear existing data (for testing purposes)
DELETE FROM UserNotification;
DELETE FROM Notification;
DELETE FROM Reports;
DELETE FROM Favorites;
DELETE FROM ListingPhoto;
DELETE FROM Transactions;
DELETE FROM Messages;
DELETE FROM Listings;
DELETE FROM Preferences;
DELETE FROM BookGenre;
DELETE FROM AuthorBook;
DELETE FROM Books;
DELETE FROM Authors;
DELETE FROM Genres;
DELETE FROM Users;
DELETE FROM Locations;
DELETE FROM RefreshTokens;
GO

-- Insert Locations
INSERT INTO Locations (Longitude, Latitude, Address, [Description]) VALUES
(-9.1393, 38.7223, 'Lisbon, Portugal', 'Capital city of Portugal'),
(-74.0060, 40.7128, 'New York, NY, USA', 'Big Apple'),
(-118.2437, 34.0522, 'Los Angeles, CA, USA', 'City of Angels'),
(-0.1278, 51.5074, 'London, UK', 'Capital of England'),
(2.3522, 48.8566, 'Paris, France', 'City of Light'),
(13.4050, 52.5200, 'Berlin, Germany', 'Capital of Germany'),
(23.7275, 37.9838, 'Athens, Greece', 'Ancient city'),
(139.6917, 35.6895, 'Tokyo, Japan', 'Capital of Japan'),
(151.2093, -33.8688, 'Sydney, Australia', 'Harbor City'),
(-77.0369, 38.9072, 'Washington, DC, USA', 'Capital of USA');

-- Insert Users
INSERT INTO Users ([Name], DateOfBirth, Email, PasswordHash, ProfileImagePath, UserRole, AboutMe, LocationID) VALUES
('Alice Johnson', '1990-05-15', 'alice@email.com', 'hashed_password_1', '/images/alice.jpg', 'User', 'Book lover and sci-fi enthusiast', 1),
('Bob Smith', '1985-12-03', 'bob@email.com', 'hashed_password_2', '/images/bob.jpg', 'User', 'Collector of first editions', 2),
('Carlos Mendes', '1992-08-22', 'carlos@email.com', 'hashed_password_3', '/images/carlos.jpg', 'User', 'Portuguese literature fan', 1),
('Diana Prince', '1988-03-10', 'diana@email.com', 'hashed_password_4', '/images/diana.jpg', 'User', 'Mystery and romance reader', 3),
('Ethan Hunt', '1987-11-25', 'ethan@email.com', 'hashed_password_5', '/images/ethan.jpg', 'User', 'Thriller and action books', 4),
('Fiona Green', '1995-01-30', 'fiona@email.com', 'hashed_password_6', '/images/fiona.jpg', 'User', 'Fantasy and young adult novels', 5),
('George Wilson', '1980-07-14', 'george@email.com', 'hashed_password_7', '/images/george.jpg', 'User', 'Classic literature collector', 6),
('Helen Brown', '1993-09-18', 'helen@email.com', 'hashed_password_8', '/images/helen.jpg', 'User', 'Romance and contemporary fiction', 7),
('Ian Black', '1986-04-05', 'ian@email.com', 'hashed_password_9', '/images/ian.jpg', 'User', 'Horror and dark fantasy', 8),
('Julia White', '1991-06-12', 'julia@email.com', 'hashed_password_10', '/images/julia.jpg', 'User', 'Non-fiction and biographies', 9);

-- Insert Authors
INSERT INTO Authors (AuthorName) VALUES
('Frank Herbert'),
('J.R.R. Tolkien'),
('George Orwell'),
('Harper Lee'),
('J.K. Rowling'),
('F. Scott Fitzgerald'),
('Jane Austen'),
('Stephen King'),
('Agatha Christie'),
('Isaac Asimov'),
('Douglas Adams'),
('Dan Brown'),
('Margaret Atwood'),
('Ernest Hemingway'),
('Mark Twain');

-- Insert Genres
INSERT INTO Genres (GenreName) VALUES
('Science Fiction'),
('Fantasy'),
('Mystery'),
('Romance'),
('Horror'),
('Classic Literature'),
('Thriller'),
('Biography'),
('History'),
('Young Adult'),
('Non-Fiction'),
('Adventure'),
('Dystopian'),
('Crime'),
('Philosophy');

-- Insert Books
INSERT INTO Books (Title, [Language], ReleaseDate, ISBN, AvgRating, Edition) VALUES
('Dune', 'English', '1965-08-01', '9780441172719', 4.25, 1),
('The Hobbit', 'English', '1937-09-21', '9780547928227', 4.28, 1),
('1984', 'English', '1949-06-08', '9780451524935', 4.18, 1),
('To Kill a Mockingbird', 'English', '1960-07-11', '9780061120084', 4.27, 1),
('Harry Potter and the Sorcerer''s Stone', 'English', '1997-06-26', '9780439708180', 4.47, 1),
('The Great Gatsby', 'English', '1925-04-10', '9780743273565', 3.91, 1),
('Pride and Prejudice', 'English', '1813-01-28', '9780141439518', 4.27, 1),
('The Shining', 'English', '1977-01-28', '9780307743657', 4.22, 1),
('Murder on the Orient Express', 'English', '1934-01-01', '9780062693662', 4.17, 1),
('Foundation', 'English', '1951-05-01', '9780553293357', 4.15, 1),
('The Hitchhiker''s Guide to the Galaxy', 'English', '1979-10-12', '9780345391803', 4.22, 1),
('The Da Vinci Code', 'English', '2003-03-18', '9780307475458', 3.84, 1),
('The Handmaid''s Tale', 'English', '1985-01-01', '9780385490818', 4.11, 1),
('The Old Man and the Sea', 'English', '1952-09-01', '9780684801223', 3.80, 1),
('The Adventures of Tom Sawyer', 'English', '1876-12-01', '9780486400778', 3.91, 1),
('It', 'English', '1986-09-15', '9780307743657', 4.24, 1),
('Emma', 'English', '1815-12-01', '9780141439518', 4.00, 1),
('The Catcher in the Rye', 'English', '1951-07-16', '9780316769488', 3.80, 1),
('Brave New World', 'English', '1932-01-01', '9780060850524', 4.18, 1),
('The Girl with the Dragon Tattoo', 'English', '2005-08-01', '9780307949486', 4.13, 1);

-- Insert Author-Book Relationships
INSERT INTO AuthorBook (AuthorID, BookID) VALUES
(1, 1),   -- Frank Herbert - Dune
(2, 2),   -- J.R.R. Tolkien - The Hobbit
(3, 3),   -- George Orwell - 1984
(4, 4),   -- Harper Lee - To Kill a Mockingbird
(5, 5),   -- J.K. Rowling - Harry Potter
(6, 6),   -- F. Scott Fitzgerald - The Great Gatsby
(7, 7),   -- Jane Austen - Pride and Prejudice
(8, 8),   -- Stephen King - The Shining
(9, 9),   -- Agatha Christie - Murder on the Orient Express
(10, 10), -- Isaac Asimov - Foundation
(11, 11), -- Douglas Adams - Hitchhiker's Guide
(12, 12), -- Dan Brown - The Da Vinci Code
(13, 13), -- Margaret Atwood - The Handmaid's Tale
(14, 14), -- Ernest Hemingway - The Old Man and the Sea
(15, 15), -- Mark Twain - Tom Sawyer
(8, 16),  -- Stephen King - It
(7, 17),  -- Jane Austen - Emma
(15, 18), -- J.D. Salinger - The Catcher in the Rye
(3, 19),  -- George Orwell - Brave New World
(12, 20); -- Stieg Larsson - The Girl with the Dragon Tattoo

-- Insert Book-Genre Relationships
INSERT INTO BookGenre (BookID, GenreID) VALUES
(1, 1),   -- Dune - Science Fiction
(1, 12),  -- Dune - Adventure
(2, 2),   -- The Hobbit - Fantasy
(2, 12),  -- The Hobbit - Adventure
(3, 13),  -- 1984 - Dystopian
(3, 6),   -- 1984 - Classic Literature
(4, 6),   -- To Kill a Mockingbird - Classic Literature
(5, 2),   -- Harry Potter - Fantasy
(5, 10),  -- Harry Potter - Young Adult
(6, 6),   -- The Great Gatsby - Classic Literature
(6, 4),   -- The Great Gatsby - Romance
(7, 4),   -- Pride and Prejudice - Romance
(7, 6),   -- Pride and Prejudice - Classic Literature
(8, 5),   -- The Shining - Horror
(9, 3),   -- Murder on the Orient Express - Mystery
(9, 14),  -- Murder on the Orient Express - Crime
(10, 1),  -- Foundation - Science Fiction
(11, 1),  -- Hitchhiker's Guide - Science Fiction
(11, 2),  -- Hitchhiker's Guide - Fantasy
(12, 7),  -- The Da Vinci Code - Thriller
(12, 3),  -- The Da Vinci Code - Mystery
(13, 13), -- The Handmaid's Tale - Dystopian
(14, 6),  -- The Old Man and the Sea - Classic Literature
(15, 12), -- Tom Sawyer - Adventure
(16, 5),  -- It - Horror
(17, 4),  -- Emma - Romance
(18, 6),  -- The Catcher in the Rye - Classic Literature
(19, 13), -- Brave New World - Dystopian
(20, 3),  -- The Girl with the Dragon Tattoo - Mystery
(20, 14); -- The Girl with the Dragon Tattoo - Crime

-- Insert User Preferences (Genres)
INSERT INTO Preferences (UserID, GenreID) VALUES
(1, 1),   -- Alice - Science Fiction
(1, 2),   -- Alice - Fantasy
(2, 6),   -- Bob - Classic Literature
(2, 12),  -- Bob - Adventure
(3, 6),   -- Carlos - Classic Literature
(4, 3),   -- Diana - Mystery
(4, 4),   -- Diana - Romance
(5, 7),   -- Ethan - Thriller
(6, 2),   -- Fiona - Fantasy
(6, 10),  -- Fiona - Young Adult
(7, 6),   -- George - Classic Literature
(8, 4),   -- Helen - Romance
(9, 5),   -- Ian - Horror
(10, 8),  -- Julia - Biography
(10, 9);  -- Julia - History

-- Insert Listings
INSERT INTO Listings (UserID, BookID, ListingType, [Description], Price, ListingState, CreationDate) VALUES
(1, 1, 'Sale', 'Excellent condition, barely read. Great sci-fi classic!', 15.99, 'Active', DATEADD(DAY, -5, GETDATE())),     
(2, 2, 'Sale', 'Hardcover edition in very good condition. Minor wear on cover.', 12.50, 'Active', DATEADD(DAY, -3, GETDATE())),     
(3, 3, 'Sale', 'Paperback copy, pages are clean and bright. Classic dystopian novel.', 10.25, 'Active', DATEADD(DAY, -10, GETDATE())),    
(4, 4, 'Sale', 'First edition hardcover with dust jacket. Minor foxing on pages.', 14.99, 'Active', DATEADD(DAY, -2, GETDATE())),     
(5, 5, 'Sale', 'Brand new copy, never opened. Perfect for Harry Potter fans!', 18.75, 'Active', DATEADD(DAY, -1, GETDATE())),     
(6, 6, 'Sale', 'Vintage paperback from the 1950s. Some yellowing but complete.', 13.50, 'Active', DATEADD(DAY, -7, GETDATE())),     
(7, 7, 'Sale', 'Beautiful leather-bound edition. Great gift item.', 11.25, 'Active', DATEADD(DAY, -15, GETDATE())),    
(8, 8, 'Sale', 'Hardcover with some spine wear. Pages clean and tight.', 16.80, 'Active', DATEADD(DAY, -4, GETDATE())),     
(9, 9, 'Sale', 'Mass market paperback, good condition. Classic mystery!', 14.25, 'Active', DATEADD(DAY, -6, GETDATE())),     
(10, 10, 'Sale', 'Science Fiction classic. Minor cover wear, pages clean.', 17.50, 'Active', DATEADD(DAY, -8, GETDATE())),   
(1, 11, 'Sale', 'Hilarious space adventure. Like new condition!', 12.99, 'Active', DATEADD(DAY, -2, GETDATE())),    
(2, 12, 'Sale', 'Thriller with codes and secrets. Good condition throughout.', 15.25, 'Active', DATEADD(DAY, -9, GETDATE())),    
(3, 13, 'Sale', 'Dystopian masterpiece. Some highlighting in margins.', 13.75, 'Active', DATEADD(DAY, -12, GETDATE())),   
(4, 14, 'Sale', 'Ernest Hemingway classic. Paperback with readable cover.', 9.99, 'Active', DATEADD(DAY, -11, GETDATE())),    
(5, 15, 'Sale', 'Mark Twain adventure. Hardcover with library binding.', 8.50, 'Active', DATEADD(DAY, -14, GETDATE())),    
(6, 16, 'Sale', 'Stephen King horror classic. Some spine creasing but solid.', 19.99, 'Active', DATEADD(DAY, -3, GETDATE())),    
(7, 17, 'Sale', 'Jane Austen romance. Beautiful cover art, clean pages.', 10.75, 'Active', DATEADD(DAY, -13, GETDATE())),   
(8, 18, 'Sale', 'Coming of age classic. Paperback with readable cover.', 11.99, 'Active', DATEADD(DAY, -16, GETDATE())),   
(9, 19, 'Sale', 'Dystopian vision of the future. Good condition.', 12.25, 'Active', DATEADD(DAY, -18, GETDATE())),   
(10, 20, 'Sale', 'Nordic noir thriller. Clean pages, tight binding.', 16.50, 'Active', DATEADD(DAY, -17, GETDATE()));

-- Insert Listing Photos
INSERT INTO ListingPhoto (ListingID, ImagePath) VALUES
(1, '/images/dune.jpg'),
(2, '/images/hobbit.jpg'),
(3, '/images/1984.jpg'),
(4, '/images/mockingbird.jpg'),
(5, '/images/harrypotter.jpg'),
(6, '/images/gatsby.jpg'),
(7, '/images/prideprejudice.jpg'),
(8, '/images/shining.jpg'),
(9, '/images/orientexpress.jpg'),
(10, '/images/foundation.jpg'),
(11, '/images/hitchhiker.jpg'),
(12, '/images/davinci.jpg'),
(13, '/images/handmaid.jpg'),
(14, '/images/oldman.jpg'),
(15, '/images/tomsawyer.jpg'),
(16, '/images/it.jpg'),
(17, '/images/emma.jpg'),
(18, '/images/catcher.jpg'),
(19, '/images/bravenew.jpg'),
(20, '/images/dragontattoo.jpg');

-- Insert Favorites
INSERT INTO Favorites (ListingID, UserID) VALUES
(5, 1),   -- Alice favorites Harry Potter
(1, 4),   -- Diana favorites Dune
(8, 9),   -- Ian favorites The Shining
(3, 7),   -- George favorites 1984
(12, 5);  -- Ethan favorites Da Vinci Code

-- Insert Sample Messages
INSERT INTO Messages (SenderID, ListingID, ReceiverID, Content, SentDate) VALUES
(1, 5, 5, 'Hi, is this Harry Potter still available?', DATEADD(DAY, -1, GETDATE())),
(5, 5, 1, 'Yes, it is! Would you like to meet to exchange?', DATEADD(DAY, -1, GETDATE())),
(2, 1, 1, 'I''m interested in your Dune listing. What condition is it in?', DATEADD(DAY, -2, GETDATE())),
(1, 1, 2, 'It''s in good condition, barely read. $15.99 firm?', DATEADD(DAY, -2, GETDATE()));

-- Insert Sample Notifications
INSERT INTO Notification (NotificationType, Content, CreationDate, ListingID) VALUES
('Message', 'You have a new message about your Harry Potter listing', DATEADD(HOUR, -6, GETDATE()), 5),
('Favorite', 'User Alice Johnson favorited your listing', DATEADD(HOUR, -12, GETDATE()), 5),
('Message', 'You have a new message about your Dune listing', DATEADD(HOUR, -18, GETDATE()), 1);

-- Insert User Notifications
INSERT INTO UserNotification (UserID, NotificationID) VALUES
(5, 1),  -- Ethan gets notification about Harry Potter message
(5, 2),  -- Ethan gets notification about favorite
(1, 3);  -- Alice gets notification about Dune message

-- Insert Sample Transactions
INSERT INTO Transactions (ListingID, BuyerID, TransactionDate, TransactionStatus) VALUES
(7, 1, DATEADD(DAY, -20, GETDATE()), 1),  -- Completed transaction: Alice bought Pride and Prejudice
(15, 4, DATEADD(DAY, -15, GETDATE()), 1), -- Completed transaction: Diana bought Tom Sawyer
(14, 2, DATEADD(DAY, -12, GETDATE()), 0); -- Pending transaction: Bob buying Old Man and the Sea

-- Insert Sample Reports
INSERT INTO Reports (UserID, ListingID, ReportType, Description, CreationDate) VALUES
(3, 8, 'Inappropriate', 'Listing photo seems inappropriate', DATEADD(DAY, -5, GETDATE())),
(6, 3, 'Misleading', 'Book condition doesn''t match description', DATEADD(DAY, -10, GETDATE()));

GO

-- Verify data insertion
PRINT 'Database populated successfully!';
PRINT 'Inserted data summary:';
PRINT '  Locations: ' + CAST((SELECT COUNT(*) FROM Locations) AS VARCHAR(10));
PRINT '  Users: ' + CAST((SELECT COUNT(*) FROM Users) AS VARCHAR(10));
PRINT '  Authors: ' + CAST((SELECT COUNT(*) FROM Authors) AS VARCHAR(10));
PRINT '  Genres: ' + CAST((SELECT COUNT(*) FROM Genres) AS VARCHAR(10));
PRINT '  Books: ' + CAST((SELECT COUNT(*) FROM Books) AS VARCHAR(10));
PRINT '  Listings: ' + CAST((SELECT COUNT(*) FROM Listings) AS VARCHAR(10));
PRINT '  Author-Book relationships: ' + CAST((SELECT COUNT(*) FROM AuthorBook) AS VARCHAR(10));
PRINT '  Book-Genre relationships: ' + CAST((SELECT COUNT(*) FROM BookGenre) AS VARCHAR(10));
PRINT '  User preferences: ' + CAST((SELECT COUNT(*) FROM Preferences) AS VARCHAR(10));
GO