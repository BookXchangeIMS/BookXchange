from fastapi import HTTPException
from sqlalchemy import select, or_, and_, func

from backend.models import *
from backend.config.db import metadata
from math import radians, sin, cos, sqrt, atan2

# ===============================================================================================================
# SCORING HELPER FUNCTIONS
# ===============================================================================================================

def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points on Earth using the Haversine formula.
    
    :param lat1: Latitude of the first point in degrees
    :type lat1: float
    :param lon1: Longitude of the first point in degrees
    :type lon1: float
    :param lat2: Latitude of the second point in degrees
    :type lat2: float
    :param lon2: Longitude of the second point in degrees
    :type lon2: float
    :return: Distance between the two points in kilometers
    :rtype: float
    """
    # Earth's radius in kilometers
    R = 6371.0
    
    # Convert coordinates to radians
    lat1_rad = radians(lat1)
    lon1_rad = radians(lon1)
    lat2_rad = radians(lat2)
    lon2_rad = radians(lon2)
    
    # Haversine formula
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    a = sin(dlat / 2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(dlon / 2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    
    distance = R * c
    return distance

def calculate_distance_score(distance):
    """
    Convert distance to a score where closer listings get higher scores.
    
    :param distance: Distance in kilometers
    :type distance: float
    :return: Score between 0 and 1, where 1 is closest
    :rtype: float
    """
    # Inverse relationship: closer = higher score
    # Using 1 / (1 + distance) so that:
    # - 0 km -> score = 1.0
    # - 10 km -> score ≈ 0.09
    # - 100 km -> score ≈ 0.01
    return 1.0 / (1.0 + distance)

def calculate_genre_match_score(book_genres, user_preferences):
    """
    Calculate how well a book's genres match a user's preferences.
    
    :param book_genres: List of genre names for the book
    :type book_genres: list[str]
    :param user_preferences: List of genre names the user prefers
    :type user_preferences: list[str]
    :return: Score between 0 and 1, where 1 means perfect match
    :rtype: float
    """
    if not user_preferences:
        # User has no preferences, return neutral score
        return 0.5
    
    if not book_genres:
        # Book has no genres
        return 0.0
    
    # Calculate intersection of genres
    book_genre_set = set(book_genres)
    user_pref_set = set(user_preferences)
    matches = len(book_genre_set & user_pref_set)
    
    # Score based on what percentage of user's preferences are matched
    return matches / len(user_pref_set)

# ===============================================================================================================
# EXISTING FUNCTIONS
# ===============================================================================================================


def get_authorids_by_names(author_names: str, db):
    """
    Retrieves a list of author IDs corresponding to the provided list of author names. The function
    queries the database for each author name and fetches the associated author ID. If a specific
    author name is not found in the database, None is appended to the result list for that name.

    :param author_names: A string containing the names of authors to look up.
    :param db: The database connection object used to execute the queries.
    :return: A list of author IDs corresponding to the given author names. If an author
             name is not found, the respective position in the returned list will contain None.
    """
    authorids = []
    for author_name in author_names:
        stmt = select(metadata.tables["Authors"]).where(metadata.tables["Authors"].c.AuthorName == author_name)
        row = db.execute(stmt).fetchone()
        authorids.append(row.AuthorID) if row else authorids.append(None)
    return authorids

def get_genreids_by_names(genre_names: list, db):
    """
    Retrieves a list of genre IDs corresponding to the provided list of genre names.
    
    :param genre_names: A list containing the names of genres to look up.
    :param db: The database connection object used to execute the queries.
    :return: A list of genre IDs corresponding to the given genre names. If a genre
             name is not found, the respective position in the returned list will contain None.
    """
    genreids = []
    for genre_name in genre_names:
        stmt = select(metadata.tables["Genres"]).where(metadata.tables["Genres"].c.GenreName == genre_name.strip())
        row = db.execute(stmt).fetchone()
        genreids.append(row.GenreID) if row else genreids.append(None)
    return genreids

def get_author_by_bookid(bookid: int, db):
    """
    Fetches a list of authors associated with a specific book.

    This function retrieves all authors linked to a given book using its unique
    identifier (bookid). It queries the associated database to perform the lookup
    and returns a list of author names. If the operation fails, it raises an
    HTTPException indicating a server-side issue.

    :param bookid: The unique identifier of the book to retrieve authors for.
    :type bookid: int
    :param db: The database session/connection used to execute the query.
    :return: A list of names of authors associated with the specified book.
    :rtype: list[str]
    :raises HTTPException: If querying the authors fails due to a server error.
    """
    stmt = select(metadata.tables["AuthorBook"]).where(metadata.tables["AuthorBook"].c.BookID == bookid)
    try:
        rows = db.execute(stmt).fetchall()
        authorids = [row.AuthorID for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail="Couldn't get author. Please try again later.")
    authornames = []
    for authorid in authorids:
        stmt = select(metadata.tables["Authors"]).where(metadata.tables["Authors"].c.AuthorID == authorid)
        try:
            row = db.execute(stmt).fetchone()
            authornames.append(row.AuthorName)
        except Exception as e:
            raise HTTPException(status_code=500, detail="Couldn't get author. Please try again later.")
    return authornames


def get_genre_by_bookid(bookid, db):
    """
    Retrieves the genre names associated with a given book ID by querying the database.
    The function first fetches all genre IDs linked to the book, then retrieves the
    corresponding genre names for those IDs. It returns a list of genre names.

    :param bookid: The ID of the book for which genres are to be fetched.
    :type bookid: int
    :param db: The database connection object used to execute queries.
    :type db: sqlalchemy.engine.Connection
    :return: A list containing the names of genres associated with the book.
    :rtype: list
    """
    stmt = select(metadata.tables["BookGenre"]).where(metadata.tables["BookGenre"].c.BookID == bookid)
    rows = db.execute(stmt).fetchall()
    genreids = [row.GenreID for row in rows]
    genrenames = []
    for genreid in genreids:
        stmt = select(metadata.tables["Genres"]).where(metadata.tables["Genres"].c.GenreID == genreid)
        row = db.execute(stmt).fetchone()
        genrenames.append(row.GenreName)
    return genrenames




def get_bookid_by_book(book: PostBook, db):
    """
    Retrieve the unique identifier (BookID) of a book from the database based on
    the book details provided. If no matching book is found, an HTTP exception
    with a 404 status code is raised.

    :param book: A data model that includes information about the book such as
        Title, Language, Edition, and ReleaseDate, which are used as search
        criteria.
    :type book: PostBook
    :param db: A database connection or session used to execute the query.
    :return: The unique identifier (BookID) of the book if found in the database.
    :rtype: Any

    :raises HTTPException: If no book matching the provided details is found, an
        HTTP exception with status code 404 and a message "Book not found" is
        raised.
    """
    stmt = select(metadata.tables["Books"]).where(
        metadata.tables["Books"].c.Title == book.Title,
        metadata.tables["Books"].c.Language == book.Language,
        metadata.tables["Books"].c.Edition == book.Edition,
        metadata.tables["Books"].c.ReleaseDate == book.ReleaseDate
    )
    row = db.execute(stmt).fetchone()
    if row:
        return row.BookID
    else:
        raise HTTPException(status_code=404, detail="Book not found")

def get_bookid_by_isbn(isbn: str, db):
    """
    Retrieves the BookID associated with the provided ISBN from the database.

    This function queries the database to find the BookID that corresponds to
    the given ISBN. If no matching record exists in the database, the function
    will return None.

    :param isbn: The ISBN of the book to look up.
    :type isbn: str
    :param db: A database connection object used to execute the query.
    :return: The BookID of the book if found, otherwise None.
    :rtype: Optional[int]
    """
    stmt = select(metadata.tables["Books"]).where(
            metadata.tables["Books"].c.ISBN == isbn
        )
    row = db.execute(stmt).fetchone()
    if row:
        return row.BookID
    else:
        return None

def get_book_by_id(bookid: int, db):
    """
    Fetches a book record by its unique identifier from the database. If a record corresponding
    to the provided book ID does not exist, an HTTPException is raised with a 404 status code.

    :param bookid: The unique identifier for the book to fetch.
    :type bookid: int
    :param db: The database connection/session to execute the query.
    :return: The matching book record as a row from the database.
    :rtype: sqlalchemy.engine.Row
    :raises HTTPException: If no book is found with the given ID.
    """
    stmt = select(metadata.tables["Books"]).where(metadata.tables["Books"].c.BookID == bookid)
    row = db.execute(stmt).fetchone()
    if row:
        return row
    else:
        raise HTTPException(status_code=404, detail="Book not found")

def get_listingid_by_userid_and_bookit(userid: int, bookid: int, db):
    """
    Fetches the `ListingID` for a specific user and a specific book from the database.

    This function queries the `Listings` table using the provided user ID and
    book ID, and retrieves the corresponding listing ID. If no match is found,
    an HTTPException with a 404 status code is raised.

    :param userid: The unique identifier of the user.
    :type userid: int
    :param bookid: The unique identifier of the book.
    :type bookid: int
    :param db: The database connection or session used to execute the query.
    :return: The `ListingID` that corresponds to the provided user ID and book ID.
    :rtype: Depends on the database schema (e.g., int, str, etc.).
    :raises HTTPException: If no listing matching the given user ID and book ID is found.
    """
    stmt = select(metadata.tables["Listings"]).where(
        metadata.tables["Listings"].c.UserID == userid,
        metadata.tables["Listings"].c.BookID == bookid
    )
    row = db.execute(stmt).fetchone()
    if row:
        return row.ListingID
    else:
        raise HTTPException(status_code=404, detail="Listing not found")

def get_listing_by_listingid(listingid: int, db):
    """
    Fetches a listing from the database based on the provided listing ID. If the
    listing exists in the database, it returns the corresponding row. If the listing
    is not found, an HTTPException with a 404 status code is raised, indicating a
    "Listing not found" error.

    :param listingid: The unique identifier of the listing to be retrieved.
    :type listingid: int
    :param db: The database connection or session used to execute the query.
    :return: The row corresponding to the listing, if found, otherwise raises an
        HTTPException.
    :rtype: Any
    :raises HTTPException: If the listing with the given ID does not exist.
    """
    stmt = select(metadata.tables["Listings"]).where(metadata.tables["Listings"].c.ListingID == listingid)
    row = db.execute(stmt).fetchone()
    if row:
        return row
    else:
        raise HTTPException(status_code=404, detail="Listing not found")


def post_authors(author_names: str, db):
    """
    Adds a list of author names to the "Authors" table in the database.

    This function iterates over the provided list of author names and attempts to
    insert each name as a new entry in the "Authors" table. If any operation within
    the process fails, appropriate HTTP exceptions with status code 500 are raised.

    :param author_names: A string containing author names to be inserted into the
        "Authors" table.
    :param db: Database connection or session object used for executing and
        committing database operations.
    :return: None
    """
    try:
        for author_name in author_names:

            stmt = metadata.tables["Authors"].insert().values(
                AuthorName=author_name
            )
            try:
                db.execute(stmt)
                db.commit()
            except Exception as e:
                raise HTTPException(status_code=500, detail="Couldn't create new author. Please try again later.")
    except Exception as e:
        raise HTTPException(status_code=500, detail="Couldn't create new author. Please try again later.")

def post_genres(genre_names: list, db):
    """
    Adds a list of genre names to the "Genre" table in the database.
    
    This function iterates over the provided list of genre names and attempts to
    insert each name as a new entry in the "Genre" table. If any operation within
    the process fails, appropriate HTTP exceptions with status code 500 are raised.
    
    :param genre_names: A list containing genre names to be inserted into the "Genre" table.
    :param db: Database connection or session object used for executing and committing database operations.
    :return: None
    """
    try:
        for genre_name in genre_names:
            stmt = metadata.tables["Genres"].insert().values(
                GenreName=genre_name.strip()
            )
            try:
                db.execute(stmt)
                db.commit()
            except Exception as e:
                raise HTTPException(status_code=500, detail="Couldn't create new genre. Please try again later.")
    except Exception as e:
        raise HTTPException(status_code=500, detail="Couldn't create new genre. Please try again later.")

def post_book(book: PostBook, db):
    """
    Inserts a new book along with its associated authors into the database. If the authors provided
    are not already in the database, they will also be added. The function ensures the linkage
    between books and authors by populating the `BookAuthors` table accordingly.

    :param book: An instance of PostBook containing attributes such as Title, ReleaseDate,
        Language, Edition, and Author details for the book to be added.
    :type book: PostBook
    :param db: The database session/connection where the book and associated data will
        be inserted. This is used to perform the database operations.
    :type db: SQLAlchemy session or equivalent database connection type.
    :return: None
    :rtype: None
    :raises HTTPException: If any database operation fails, an HTTPException with status
        code 500 and an appropriate detail message is raised.
    """
    authorids = get_authorids_by_names(book.Author, db)
    for cur_authorid, cur_author in zip(authorids, book.Author):
        if cur_authorid is None:
            post_authors([cur_author], db)
    authorid = get_authorids_by_names(book.Author, db)
    stmt = metadata.tables["Books"].insert().values(
        Title=book.Title,
        ReleaseDate=book.ReleaseDate,
        Language=book.Language,
        Edition=book.Edition,
        ISBN=book.ISBN
    )
    try:
        db.execute(stmt)
        db.commit()
    except Exception as e:
        print(f"ERROR in post_book: {str(e)}")
        print(f"Book data: Title={book.Title}, ISBN={book.ISBN}, Authors={book.Author}")
        raise HTTPException(status_code=500, detail=f"Couldn't create new book: {str(e)}")
    bookid = get_bookid_by_book(book, db)
    for cur_authorid in authorid:
        # Check if the relationship already exists
        check_stmt = select(metadata.tables["AuthorBook"]).where(
            metadata.tables["AuthorBook"].c.BookID == bookid,
            metadata.tables["AuthorBook"].c.AuthorID == cur_authorid
        )
        existing = db.execute(check_stmt).fetchone()
        
        if not existing:
            stmt = metadata.tables["AuthorBook"].insert().values(
                BookID=bookid,
                AuthorID=cur_authorid
            )
            try:
                db.execute(stmt)
                db.commit()
            except Exception as e:
                raise HTTPException(status_code=500, detail="Couldn't create new book. Please try again later.")
    
    # Process genres (similar to authors)
    if book.Genre:
        genreids = get_genreids_by_names(book.Genre, db)
        for cur_genreid, cur_genre in zip(genreids, book.Genre):
            if cur_genreid is None:
                post_genres([cur_genre], db)
        genreid = get_genreids_by_names(book.Genre, db)
        
        for cur_genreid in genreid:
            # Check if the relationship already exists
            check_stmt = select(metadata.tables["BookGenre"]).where(
                metadata.tables["BookGenre"].c.BookID == bookid,
                metadata.tables["BookGenre"].c.GenreID == cur_genreid
            )
            existing = db.execute(check_stmt).fetchone()
            
            if not existing:
                stmt = metadata.tables["BookGenre"].insert().values(
                    BookID=bookid,
                    GenreID=cur_genreid
                )
                try:
                    db.execute(stmt)
                    db.commit()
                except Exception as e:
                    raise HTTPException(status_code=500, detail="Couldn't create genre relationship. Please try again later.")
    
    return bookid

def update_book(bookid: int, book: PostBook, db):
    """
    Updates an existing book's details in the database by its unique identifier.
    This function constructs an SQL update statement based on the provided
    `bookid` and `book` object and executes the update using the provided database connection.
    In case the update fails, an HTTP exception will be raised with proper details.

    :param bookid: The unique identifier of the book to be updated.
    :type bookid: int
    :param book: An object of type `Book` containing updated details of the book.
    :type book: Book
    :param db: Database connection or session object used to execute the update and manage transactions.
    :type db: Any
    :return: None. The function either updates the book successfully or raises an exception.

    """
    stmt = metadata.tables["AuthorBook"].delete().where(metadata.tables["AuthorBook"].c.BookID == bookid)
    try:
        db.execute(stmt)
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Couldn't delete authors of the book. Please try again later.")
    authorids = get_authorids_by_names(book.Author, db)
    for cur_authorid, cur_author in zip(authorids, book.Author):
        if cur_authorid is None:
            post_authors([cur_author], db)
    authorid = get_authorids_by_names(book.Author, db)
    for cur_authorid in authorid:
        stmt = metadata.tables["AuthorBook"].insert().values(
            BookID=bookid,
            AuthorID=cur_authorid
        )
        try:
            db.execute(stmt)
            db.commit()
        except Exception as e:
            raise HTTPException(status_code=500, detail="Couldn't create new book. Please try again later.")
            
    # Update Genres
    # Delete existing genres
    stmt = metadata.tables["BookGenre"].delete().where(metadata.tables["BookGenre"].c.BookID == bookid)
    try:
        db.execute(stmt)
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Couldn't delete genres of the book. Please try again later.")
        
    # Insert new genres
    if book.Genre:
        genreids = get_genreids_by_names(book.Genre, db)
        for cur_genreid, cur_genre in zip(genreids, book.Genre):
            if cur_genreid is None:
                post_genres([cur_genre], db)
        
        genreid = get_genreids_by_names(book.Genre, db)
        for cur_genreid in genreid:
            # Check if relationship exists (shouldn't since we just deleted, but good for safety)
            # Actually, since we deleted all for this bookid, we can just insert.
            # But duplicate genres in the input list could cause issues if not handled.
            # get_genreids_by_names returns unique IDs if input has duplicates? 
            # Let's assume input might have duplicates, but get_genreids_by_names handles names.
            # Ideally we should deduplicate the input list first or check before insert.
            
            # Simple check to avoid primary key violation if list has duplicates
            check_stmt = select(metadata.tables["BookGenre"]).where(
                metadata.tables["BookGenre"].c.BookID == bookid,
                metadata.tables["BookGenre"].c.GenreID == cur_genreid
            )
            existing = db.execute(check_stmt).fetchone()
            
            if not existing:
                stmt = metadata.tables["BookGenre"].insert().values(
                    BookID=bookid,
                    GenreID=cur_genreid
                )
                try:
                    db.execute(stmt)
                    db.commit()
                except Exception as e:
                    raise HTTPException(status_code=500, detail="Couldn't create genre relationship. Please try again later.")
    stmt = metadata.tables["Books"].update().where(metadata.tables["Books"].c.BookID == bookid).values(
        Title=book.Title,
        ReleaseDate=book.ReleaseDate,
        Language=book.Language,
        Edition=book.Edition,
        ISBN=book.ISBN
    )
    try:
        db.execute(stmt)
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Couldn't update book. Please try again later.")

def post_new_listing(listing: PostListing, userid, new_locationid, new_bookid, db):
    """
    Post a new listing into the database. This function inserts the given listing
    data, user ID, location ID, and book ID into the Listings table. It commits
    the transaction to the database and raises an exception if the process fails.

    :param listing: A PostListing object containing details like price, condition,
        and description of the listing to be added.
    :param userid: An identifier for the user posting the listing.
    :param new_locationid: The ID referring to the item's location.
    :param new_bookid: The ID of the book associated with the listing.
    :param db: The database session used for executing queries.

    :return: None
    """
    stmt = metadata.tables["Listings"].insert().values(
        BookID=new_bookid,
        UserID=userid,
        Price=listing.Price,
        Condition=listing.BookCondition,
        Description=listing.Description,
        ListingState="Active",
        ListingType=listing.ListingType,
        LocationID=new_locationid
    )
    try:
        db.execute(stmt)
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Couldn't create new listing. Please try again later.")

def update_new_listing(listing_form: UpdateListing, new_locationid: int, new_bookid: int, db):
    stmt = metadata.tables["Listings"].update().where(metadata.tables["Listings"].c.ListingID == listing_form.ListingID).values(
        Price=listing_form.Price,
        Condition=listing_form.BookCondition,
        Description=listing_form.Description,
        ListingType=listing_form.ListingType,
        LocationID=new_locationid,
        BookID=new_bookid
    )
    try:
        db.execute(stmt)
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Couldn't update listing. Please try again later.")

def delete_new_listing(listingid: int, db):
    """
    Deletes a listing from the database based on the provided listing ID.

    This function executes a delete SQL statement on the "Listings" table to remove
    the listing specified by the given listing ID. If the execution is successful, it
    commits the changes to the database. In the case of an error during the operation,
    an HTTPException is raised with the appropriate error message.

    :param listingid: The ID of the listing to be deleted
    :type listingid: int
    :param db: The database connection object to execute the query
    :return: None
    :raises HTTPException: If an error occurs during the deletion process, raising an exception
        with HTTP status code 500 and a message detailing the failure.
    """
    try:
        # First, delete all associated images from ListingPhoto table
        listingphoto = metadata.tables["ListingPhoto"]
        img_stmt = listingphoto.delete().where(listingphoto.c.ListingID == listingid)
        
        # Delete favorites (CRITICAL: This was missing and causing foreign key constraint errors)
        favorites_stmt = metadata.tables["Favorites"].delete().where(metadata.tables["Favorites"].c.ListingID == listingid)
        
        # Delete messages
        messages_stmt = metadata.tables["Messages"].delete().where(metadata.tables["Messages"].c.ListingID == listingid)
        
        # Delete reports
        reports_stmt = metadata.tables["Reports"].delete().where(metadata.tables["Reports"].c.ListingID == listingid)
        
        # Delete notifications
        notifications_stmt = metadata.tables["Notification"].delete().where(metadata.tables["Notification"].c.ListingID == listingid)
        
        # Then delete the listing itself
        listing_stmt = metadata.tables["Listings"].delete().where(metadata.tables["Listings"].c.ListingID == listingid)

        # Execute deletions in order (respecting foreign key constraints)
        db.execute(img_stmt)
        db.execute(favorites_stmt)  # CRITICAL: Delete favorites before listing
        db.execute(messages_stmt)
        db.execute(reports_stmt)
        db.execute(notifications_stmt)
        db.execute(listing_stmt)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Couldn't delete listing: {str(e)}")

def get_listings_by_userid(user_id: int, db):
    """
    Retrieves a list of listings from the database for a specific user, identified by
    their user ID. This function queries the database by selecting all records from the
    "Listings" table that match the given user ID. If an error occurs during the
    execution of the database query, an HTTPException will be raised.

    :param user_id: The ID of the user whose listings are being retrieved
    :type user_id: int
    :param db: The database connection object used to execute the SQL statement
    :return: A list of records corresponding to the listings for the specified user ID
    :rtype: list
    :raises HTTPException: If the database query fails for any reason
    """
    stmt = select(metadata.tables["Listings"]).where(metadata.tables["Listings"].c.UserID == user_id)
    try:
        rows = db.execute(stmt).fetchall()
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail="Couldn't get listings. Please try again later.")
    
def get_favorite_listings_by_userid(userid: int, db):
    """
    Retrieves all favorite listings for a specific user from the database.

    This function queries the Favorites table to get all listings that a user
    has marked as favorite. If the database query fails, it raises an
    HTTPException with a 500 status code.

    :param userid: The ID of the user whose favorite listings are being retrieved
    :type userid: int
    :param db: The database connection object used to execute the SQL statement
    :return: A list of records corresponding to the favorite listings for the specified user ID
    :rtype: list
    :raises HTTPException: If the database query fails for any reason
    """
    stmt = select(metadata.tables["Listings"]).join(
        metadata.tables["Favorites"],
        metadata.tables["Listings"].c.ListingID == metadata.tables["Favorites"].c.ListingID
    ).where(metadata.tables["Favorites"].c.UserID == userid)
    try:
        rows = db.execute(stmt).fetchall()
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail="Couldn't get favorite listings. Please try again later.")

def check_if_listing_is_favorite(listingid: int, youruserid: int, db):
    """
    Checks if a specific listing is marked as favorite by a user.

    This function queries the Favorites table to determine if there exists a record
    matching both the provided listing ID and user ID. If such a record exists,
    the listing is considered a favorite for that user.

    :param listingid: The ID of the listing to check
    :type listingid: int
    :param youruserid: The ID of the user to check favorites for
    :type youruserid: int
    :param db: The database connection object used to execute the query
    :return: True if the listing is marked as favorite, False otherwise
    :rtype: bool
    :raises HTTPException: If there is an error executing the database query
    """
    stmt = select(metadata.tables["Favorites"]).where(
        metadata.tables["Favorites"].c.UserID == youruserid,
        metadata.tables["Favorites"].c.ListingID == listingid
    )
    try:
        row = db.execute(stmt).fetchone()
        return row is not None
    except Exception as e:
        raise HTTPException(status_code=500, detail="Couldn't check favorite status. Please try again later.")


def post_new_favorite(userid: int, listing_id: int, db):
    """
    Adds a new favorite to the 'Favorites' table in the database for the given user
    and listing id. Executes the database insertion statement and commits the
    transaction.

    :param userid: The ID of the user adding a favorite.
    :type userid: int
    :param listing_id: The ID of the listing to be marked as favorite.
    :type listing_id: int
    :param db: The database connection/session object used to execute the statement.
    :return: None
    :rtype: None

    :raises HTTPException: If the database operation fails during the insertion or
        commit, an HTTPException is raised with status code 500 and an appropriate
        detail message.
    """
    stmt = metadata.tables["Favorites"].insert().values(UserID=userid, ListingID=listing_id)
    try:
        db.execute(stmt)
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Couldn't create new favorite. Please try again later.")


def delete_favorite_by_userid(userid: int, listing_id: int, db):
    """
    Deletes a favorite record associated with the specified user ID and listing ID from the database.

    This function constructs a delete SQL statement targeting the Favorites table where the user ID
    and listing ID match the provided values. It then executes the statement and commits the
    transaction, ensuring the record is removed from the Favorites table. If an error occurs during
    execution or commitment, an HTTPException with status code 500 is raised, indicating a failure
    to delete the favorite record.

    :param userid: The ID of the user whose favorite record is to be deleted.
    :type userid: int
    :param listing_id: The ID of the listing to be removed from the user's favorites.
    :type listing_id: int
    :param db: The database session used to execute the delete operation.
    :type db: Any
    :return: None
    :rtype: None
    :raises HTTPException: If there is an issue connecting to the database or committing the transaction.
    """
    stmt = metadata.tables["Favorites"].delete().where(metadata.tables["Favorites"].c.UserID == userid, metadata.tables["Favorites"].c.ListingID == listing_id)
    try:
        db.execute(stmt)
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Couldn't delete favorite. Please try again later.")

def get_all_listings(db):
    """
    Retrieves all listings from the database.
    
    This function queries the database to fetch all available listings regardless of the user.
    This is useful for displaying all books/listings on the home page or marketplace view.
    

    :param db: The database connection object used to execute the SQL statement
    :return: A list of all listing records from the database
    :rtype: list
    :raises HTTPException: If the database query fails for any reason
    """
    stmt = select(metadata.tables["Listings"])
    try:
        rows = db.execute(stmt).fetchall()
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail="Couldn't get listings. Please try again later.")

def search_listings(query: str, db, genres: list = None, min_price: float = None, max_price: float = None, listing_types: list = None, lat: float = None, lon: float = None, radius: float = None):
    """
    Searches for listings based on a query string and optional filters, including location radius (km).
    """
    listings_t = metadata.tables["Listings"]
    books_t = metadata.tables["Books"]
    author_book_t = metadata.tables["AuthorBook"]
    authors_t = metadata.tables["Authors"]
    book_genre_t = metadata.tables["BookGenre"]
    genres_t = metadata.tables["Genres"]
    locations_t = metadata.tables["Locations"]
    
    stmt = select(listings_t).join(
        books_t, listings_t.c.BookID == books_t.c.BookID
    ).outerjoin(
        author_book_t, books_t.c.BookID == author_book_t.c.BookID
    ).outerjoin(
        authors_t, author_book_t.c.AuthorID == authors_t.c.AuthorID
    ).outerjoin(
        locations_t, listings_t.c.LocationID == locations_t.c.LocationID
    )

    conditions = []
    
    # Text Search
    if query:
        conditions.append(or_(
            books_t.c.Title.ilike(f"%{query}%"),
            books_t.c.ISBN.ilike(f"%{query}%"),
            authors_t.c.AuthorName.ilike(f"%{query}%")
        ))
        
    # Price Filter
    if min_price is not None:
        conditions.append(listings_t.c.Price >= min_price)
    if max_price is not None:
        conditions.append(or_(listings_t.c.Price <= max_price, listings_t.c.Price == None))
        
    # Listing Type Filter
    if listing_types:
        conditions.append(listings_t.c.ListingType.in_(listing_types))
        
    # Genre Filter
    if genres:
        stmt = stmt.join(
            book_genre_t, books_t.c.BookID == book_genre_t.c.BookID
        ).join(
            genres_t, book_genre_t.c.GenreID == genres_t.c.GenreID
        )
        conditions.append(genres_t.c.GenreName.in_(genres))

    # Location Filter (Haversine Formula)
    if lat is not None and lon is not None and radius is not None:
        # 6371 km is Earth's radius
        distance = func.acos(
            func.sin(func.radians(lat)) * func.sin(func.radians(locations_t.c.Latitude)) +
            func.cos(func.radians(lat)) * func.cos(func.radians(locations_t.c.Latitude)) *
            func.cos(func.radians(locations_t.c.Longitude) - func.radians(lon))
        ) * 6371
        conditions.append(distance <= radius)

    if conditions:
        stmt = stmt.where(and_(*conditions))
        
    stmt = stmt.distinct()
    
    try:
        rows = db.execute(stmt).fetchall()
        return rows
    except Exception as e:
        print(f"Search Error: {e}")
        raise HTTPException(status_code=500, detail="Couldn't search listings.")

def get_sorted_listings_for_user(userid: int, db):
    """
    Retrieves all listings sorted by relevance to the user based on:
    1. Distance from user's location (closer is better)
    2. Genre match with user's preferences (more matches is better)
    
    The function combines both scores with configurable weights to provide
    personalized listing recommendations.
    
    :param userid: The ID of the user to personalize listings for
    :type userid: int
    :param db: The database connection object used to execute queries
    :return: A list of all listing records sorted by relevance score (highest first)
    :rtype: list
    :raises HTTPException: If the database query fails for any reason
    """
    print(f"DEBUG: get_sorted_listings_for_user called for userid: {userid}")
    
    # Configurable weights for combining scores
    GENRE_WEIGHT = 0.6  # 60% weight on genre preferences
    DISTANCE_WEIGHT = 0.4  # 40% weight on distance
    
    try:
        # Get user's location
        users_table = metadata.tables["Users"]
        locations_table = metadata.tables["Locations"]
        
        user_stmt = select(users_table).where(users_table.c.UserID == userid)
        user_row = db.execute(user_stmt).fetchone()
        
        if not user_row:
            # User not found, return unsorted listings
            return get_all_listings(db)
        
        user_location_id = user_row.LocationID
        user_location_stmt = select(locations_table).where(locations_table.c.LocationID == user_location_id)
        user_location = db.execute(user_location_stmt).fetchone()
        
        if not user_location:
            # User has no location, return unsorted listings
            return get_all_listings(db)
        
        user_lat = user_location.Latitude
        user_lon = user_location.Longitude
        print(f"DEBUG: User location - Lat: {user_lat}, Lon: {user_lon}")
        
        # Get user's genre preferences
        from backend.scripts.profile_crud import get_preferences_by_userid
        try:
            user_preferences = get_preferences_by_userid(userid, db)
        except:
            # User has no preferences
            user_preferences = []
        
        print(f"DEBUG: User preferences: {user_preferences}")
        
        # Get all listings
        all_listings = get_all_listings(db)
        print(f"DEBUG: Total listings to sort: {len(all_listings)}")
        
        # Calculate scores for each listing
        listings_with_scores = []
        
        for listing in all_listings:
            # Get listing location
            listing_location_stmt = select(locations_table).where(
                locations_table.c.LocationID == listing.LocationID
            )
            listing_location = db.execute(listing_location_stmt).fetchone()
            
            # Calculate distance score
            if listing_location:
                distance = calculate_distance(
                    user_lat, user_lon,
                    listing_location.Latitude, listing_location.Longitude
                )
                distance_score = calculate_distance_score(distance)
            else:
                distance_score = 0.0
            
            # Get book genres for this listing
            book_genres = get_genre_by_bookid(listing.BookID, db)
            
            # Calculate genre match score
            genre_score = calculate_genre_match_score(book_genres, user_preferences)
            
            # Calculate combined score
            combined_score = (GENRE_WEIGHT * genre_score) + (DISTANCE_WEIGHT * distance_score)
            
            listings_with_scores.append({
                'listing': listing,
                'score': combined_score
            })
        
        # Sort by score (highest first)
        listings_with_scores.sort(key=lambda x: x['score'], reverse=True)
        
        print(f"DEBUG: Sorted {len(listings_with_scores)} listings. Top 3 scores: {[item['score'] for item in listings_with_scores[:3]]}")
        
        # Return just the listings in sorted order
        return [item['listing'] for item in listings_with_scores]
        
    except Exception as e:
        import traceback
        print(f"Sorting Error: {type(e).__name__}: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        # Fall back to unsorted listings on any error
        return get_all_listings(db)


