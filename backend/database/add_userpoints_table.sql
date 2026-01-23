-- Migration script to add UserPoints table for gamification
-- Safe to run on existing database without data loss
USE BookXchange;
GO

-- Check if table already exists before creating
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserPoints')
BEGIN
    -- Create UserPoints table
    CREATE TABLE UserPoints(
        UserID INT PRIMARY KEY,
        TotalPoints INT NOT NULL DEFAULT 0,
        Level INT NOT NULL DEFAULT 1,
        LastUpdated DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        FOREIGN KEY(UserID) REFERENCES Users(UserID) ON DELETE CASCADE
    );
    
    -- Initialize UserPoints for all existing users
    INSERT INTO UserPoints (UserID, TotalPoints, Level, LastUpdated)
    SELECT UserID, 0, 1, SYSDATETIME()
    FROM Users;
    
    PRINT 'UserPoints table created and populated successfully';
    END
ELSE
BEGIN
    PRINT 'UserPoints table already exists, skipping migration';
END
GO
