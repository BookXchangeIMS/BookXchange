from fastapi import HTTPException
from sqlalchemy import select

from backend.models import *
from backend.config.db import metadata

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
    authorid = get_authorids_by_names(book.Author, db)
    if not all(authorid):
        post_authors(book.Author, db)
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
        raise HTTPException(status_code=500, detail="Couldn't create new book. Please try again later.")
    bookid = get_bookid_by_book(book, db)
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
    return bookid

def update_book(bookid: int, book: Book, db):
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
    stmt = metadata.tables["Listings"].delete().where(metadata.tables["Listings"].c.ListingID == listingid)
    try:
        db.execute(stmt)
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Couldn't delete listing. Please try again later.")

def get_listings_by_userid(user_id: int, db):
    stmt = select(metadata.tables["Listings"]).where(metadata.tables["Listings"].c.UserID == user_id)
    try:
        rows = db.execute(stmt).fetchall()
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail="Couldn't get listings. Please try again later.")
