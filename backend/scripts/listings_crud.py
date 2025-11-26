from datetime import timedelta
from fastapi import HTTPException, status
from sqlalchemy import select
import uuid

from backend.config.config import Settings
from backend.models import *
from backend.config.db import metadata

def get_authorids_by_names(author_names: str, db):
    authorids = []
    for author_name in author_names:
        stmt = select(metadata.tables["Authors"]).where(metadata.tables["Authors"].c.AuthorName == author_name)
        row = db.execute(stmt).fetchone()
        authorids.append(row.AuthorID) if row else authorids.append(None)
    return authorids


def get_bookid_by_book(book: PostBook, db):
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

def post_authors(author_names: str, db):
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
        Edition=book.Edition
    )
    try:
        db.execute(stmt)
        db.commit()
    except Exception as e:
        print("oh no 1")
        raise HTTPException(status_code=500, detail="Couldn't create new book. Please try again later.")
    bookid = get_bookid_by_book(book, db)
    for cur_authorid in authorid:
        stmt = metadata.tables["AuthorBook"].insert().values(
            BookID=bookid,
            AuthorID=cur_authorid
        )
        #try:
        db.execute(stmt)
        db.commit()
        #except Exception as e:
        #    print("oh no 2")
        #    raise HTTPException(status_code=500, detail="Couldn't create new book. Please try again later.")

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
        LocationID=new_locationid
    )
    #try:
    db.execute(stmt)
    db.commit()
    #except Exception as e:
    #    raise HTTPException(status_code=500, detail="Couldn't create new listing. Please try again later.")

