USE BookXchange;
Go

INSERT INTO Locations (Country, City)
VALUES
('USA', 'New York'),
('Canada', 'Toronto'),
('UK', 'London'),
('Australia', 'Sydney'),
('Germany', 'Berlin');

INSERT INTO Users (Image_Path, Location_ID, Name, AboutMe, Points, Role, Password, Email)
VALUES
('images/user1.jpg', 1, 'Alice Johnson', 'Avid reader and book collector.', 150, 'A', 'Password123!', 'alice@example.com'),
('images/user2.jpg', 2, 'Bob Smith', 'Love trading rare editions.', 90, 'U', 'Password123!', 'bob@example.com'),
('images/user3.jpg', 3, 'Charlie Brown', 'Casual reader.', 30, 'U', 'Password123!', 'charlie@example.com'),
('images/user4.jpg', 4, 'Diana Prince', 'Always on the lookout for classics.', 200, 'A', 'Password123!', 'diana@example.com'),
('images/user5.jpg', 5, 'Ethan Hunt', 'Enjoys mystery novels.', 70, 'U', 'Password123!', 'ethan@example.com');

INSERT INTO Image (Image_Path)
VALUES
('images/book1.jpg'),
('images/book2.jpg'),
('images/book3.jpg'),
('images/book4.jpg'),
('images/book5.jpg');

INSERT INTO Genres (GenreName)
VALUES
('Science Fiction'),
('Mystery'),
('Fantasy'),
('Non-Fiction'),
('Romance');

INSERT INTO Book (ISBN, Name, Year, Author, Edition)
VALUES
(1001, 'Dune', '1965-01-01', 'Frank Herbert', 1),
(1002, 'The Hound of the Baskervilles', '1902-01-01', 'Arthur Conan Doyle', 1),
(1003, 'The Hobbit', '1937-01-01', 'J.R.R. Tolkien', 2),
(1004, 'Sapiens: A Brief History of Humankind', '2011-01-01', 'Yuval Noah Harari', 1),
(1005, 'Pride and Prejudice', '1813-01-01', 'Jane Austen', 3);

INSERT INTO Book_Genre (ISBN, GenreID)
VALUES
(1001, 1),  -- Dune → Sci-Fi
(1002, 2),  -- Hound → Mystery
(1003, 3),  -- Hobbit → Fantasy
(1004, 4),  -- Sapiens → Non-Fiction
(1005, 5);  -- Pride → Romance

INSERT INTO Listings (Notification_ID, Location_ID, UserID, Type, Price, ListingState, Image_Path)
VALUES
(NULL, 1, 1, 1, 15.99, 1, 'images/book1.jpg'),
(NULL, 2, 2, 1, 10.50, 1, 'images/book2.jpg'),
(NULL, 3, 3, 1, 8.75, 1, 'images/book3.jpg'),
(NULL, 4, 4, 1, 20.00, 1, 'images/book4.jpg'),
(NULL, 5, 5, 1, 5.99, 1, 'images/book5.jpg');

INSERT INTO BookListed (ListingID, ISBN)
VALUES
(1, 1001),
(2, 1002),
(3, 1003),
(4, 1004),
(5, 1005);

INSERT INTO Transaction_Log (UserID, ListingID)
VALUES
(2, 1),
(3, 2),
(4, 3),
(5, 4),
(1, 5);

INSERT INTO Reports (UserID, ListingID, Description, Category)
VALUES
(3, 1, 'Incorrect book description.', 1),
(4, 2, 'Inappropriate pricing.', 2),
(5, 3, 'Duplicate listing.', 3);

INSERT INTO Messages (SenderID, ReceiverID, Content)
VALUES
(1, 2, 'Hi Bob, is the book still available?'),
(2, 1, 'Yes, it is! Do you want to pick it up this weekend?'),
(3, 4, 'Hey Diana, can you recommend any fantasy books?'),
(4, 3, 'Sure! Try reading "The Hobbit" if you haven’t.'),
(5, 1, 'Hello Alice, do you ship internationally?');

INSERT INTO Notifications (UserID, Notification_Content, Status)
VALUES
(1, 'Your listing has received a message.', 0),
(2, 'Your book has been sold!', 1),
(3, 'You received a reply from Diana.', 1),
(4, 'A new report has been filed.', 0),
(5, 'Your transaction was successful.', 1);

INSERT INTO Preferences (UserID, GenreID)
VALUES
(1, 1),
(1, 3),
(2, 2),
(3, 3),
(4, 4),
(5, 5);

INSERT INTO Error_Logs (Description, Type)
VALUES
('Null reference error in message send.', 1),
('Database timeout during transaction.', 2),
('Foreign key constraint violation on insert.', 3);