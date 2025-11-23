from datetime import timedelta
from fastapi import HTTPException, status
from sqlalchemy import select
import uuid

from backend.config.config import Settings
from backend.models import *
from backend.config.db import metadata

# ===============================================================================================================
# Preferences
# ===============================================================================================================

def post_preferences_by_userid(userid: int, preferences_names: list[str], db):
    """
    Adds a list of genres to a user's preferences in the database.

    This function retrieves genre IDs based on the given genre names and associates
    them with a specific user in the preferences table. If a genre name does not
    exist in the database, an HTTP exception with a 404 status code is raised. If
    a genre is already associated with the user's preferences, an HTTP exception
    with a 409 status code is raised.

    :param userid: User ID of the individual whose preferences are being updated.
    :type userid: int
    :param preferences_names: List of genre names to be added to the user's preferences.
    :type preferences_names: list[str]
    :param db: Database connection/session used for querying and committing changes.
    :type db: object
    :return: None. The function modifies the database state but does not return a value.
    :rtype: None
    """
    genres = metadata.tables["Genres"]
    preferences = metadata.tables["Preferences"]
    genres_ids = []
    for genre in preferences_names:
        try:
            stmt = select(genres).where(genres.c.GenreName == genre)
            row = db.execute(stmt).fetchone()
            genres_ids.append(row.GenreID)
        except Exception as e:
            raise HTTPException(status_code=404, detail="Couldn't find genre with name:" + genre)
    for genre_id in genres_ids:
        try:
            stmt = preferences.insert().values(UserID=userid, GenreID=genre_id)
            db.execute(stmt)
            db.commit()
        except Exception as e:
            raise HTTPException(status_code=409, detail="This genre is already added to user's preferences")

def get_preferences_by_userid(userid: int, db):
    """
    Retrieve user preferences by their UserID and translate them into genre names.

    This function fetches all associated genre IDs for the given user and maps them
    to their respective genre names. Any error during the retrieval or mapping process
    will result in an HTTPException. This function interacts with the 'Preferences' table
    to fetch user preferences and the 'Genres' table for fetching genre names.

    :param userid: Unique identifier of the user for whom preferences need to be fetched
    :param db: Database connection/session used to execute the query
    :return: A list of genre names corresponding to the user's preferences
    :rtype: list[str]
    :raises HTTPException: If the user's preferences cannot be found or if a genre ID
        does not have a corresponding name
    """
    preferences = metadata.tables["Preferences"]
    genres = metadata.tables["Genres"]
    try:
        stmt = select(preferences.c.GenreID).where(preferences.c.UserID == userid)
        rows = db.execute(stmt).fetchall()
    except Exception as e:
        raise HTTPException(status_code=404, detail="Couldn't find user's preferences")
    genres_ids = [row.GenreID for row in rows]
    genres_names = []
    for genre_id in genres_ids:
        try:
            stmt = select(genres.c.GenreName).where(genres.c.GenreID == genre_id)
            row = db.execute(stmt).fetchone()
            genres_names.append(row.GenreName)
        except Exception as e:
            raise HTTPException(status_code=404, detail="Couldn't find genre with id:" + genre_id)
    return genres_names

def delete_preference_by_userid(userid: int, genre_name: str, db):
    """
    Deletes a user's preference for a specific genre in the database.

    This function removes a preference record associated with a given user ID and
    genre name from the database. If the genre name or the corresponding preference
    record cannot be located, appropriate HTTP exceptions are raised. After a
    successful deletion, the changes are committed to the database.

    :param userid: The unique identifier of the user whose preference is being deleted.
    :type userid: int
    :param genre_name: The name of the genre to delete the user's preference for.
    :type genre_name: str
    :param db: The active database connection/session to execute the SQL queries.
    :return: None
    :raises HTTPException:
        - If the genre with the specified name cannot be found.
        - If the user's preference for the specified genre does not exist.
    """
    preferences = metadata.tables["Preferences"]
    genres = metadata.tables["Genres"]
    try:
        stmt = select(genres).where(genres.c.GenreName == genre_name)
        row = db.execute(stmt).fetchone()
        genre_id = row.GenreID
    except Exception as e:
        raise HTTPException(status_code=404, detail="Couldn't find genre with name:" + genre_name)
    stmt = preferences.delete().where(preferences.c.UserID == userid).where(preferences.c.GenreID == genre_id)
    result = db.execute(stmt)
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail=f"Couldn't find preference:{userid}:{genre_name}")
    db.commit()

# ===============================================================================================================
# Profile
# ===============================================================================================================

def update_profile_by_userid(userid: int, new_info: UpdateUser, db):
    """
    Updates a user profile in the database based on the provided user ID and new information. The function
    executes an update statement to modify the user record and commits the changes. If any exception occurs
    during the database operation, an HTTPException with a 409 status code will be raised.

    :param userid: The ID of the user whose profile is to be updated
    :type userid: int
    :param new_info: The updated user information including name, profile image path, and about me
    :type new_info: UpdateUser
    :param db: The database connection or session used to execute the query
    :return: The updated user information after successful profile update
    :rtype: UpdateUser
    """
    users = metadata.tables["Users"]
    try:
        stmt = users.update().where(users.c.UserID == userid).values(Name=new_info.Name, ProfileImagePath=new_info.ProfileImagePath, AboutMe=new_info.AboutMe)
        db.execute(stmt)
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=409, detail="Couldn't update profile")
    return new_info


# ===============================================================================================================
# Transactions
# ===============================================================================================================