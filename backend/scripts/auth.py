from datetime import timedelta
from jose import jwt, JWTError
from fastapi import HTTPException, status
from sqlalchemy import select
import uuid

from backend.config.config import Settings
from backend.models import *
from backend.config.db import metadata

# Fetching Config file
SECRET_KEY = Settings().SECRET_KEY
ALGORITHM = Settings().ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = Settings().ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = Settings().REFRESH_TOKEN_EXPIRE_DAYS

def get_userid_by_credentials(data: SignIn, db):
    """
    Fetches the user ID by matching the provided credentials against the database.

    The function performs a query on the "Users" table to locate a user record that matches
    the provided email and password hash. If a record exists, the corresponding user ID is
    returned. If no match is found, the function returns None.

    :param data: An object containing the user's sign-in credentials, including email and
        password hash.
    :type data: SignIn
    :param db: The database session or connection object used to execute the query.
    :return: The user ID if credentials match a record in the database, or None if no match is
        found.
    :rtype: int or None
    """
    users = metadata.tables["Users"]
    stmt = select(users).where(users.c.Email == data.Email).where(users.c.PasswordHash == data.PasswordHash)
    row = db.execute(stmt).fetchone()
    return row.UserID if row else None

def check_if_email_exists(data: SignUp, db):
    """
    Check if an email already exists in the database.

    This function verifies whether a given email address is already present
    in the `Users` table of the database. It executes a `SELECT` query to
    find a match for the provided email. If a match is found, it indicates
    that the email already exists.

    :param data: The data object containing the email to be checked.
    :type data: SignUp
    :param db: The database connection or session used to execute queries.
    :type db: sqlalchemy.engine.base.Connection | sqlalchemy.orm.Session
    :return: Returns `True` if the email exists in the database, otherwise
        `False`.
    :rtype: bool
    """
    users = metadata.tables["Users"]
    stmt = select(users).where(users.c.Email == data.Email)
    row = db.execute(stmt).fetchone()
    return True if row else False

def sign_user_up(data: SignUp):
    pass

def create_access_token(data: dict):
    """
    Generates a JWT access token for the given data. The token includes
    an expiration timestamp and is encoded using the specified secret
    key and algorithm.

    :param data: A dictionary containing information to be included
        in the access token. The contents of this dictionary will
        be encoded into the token.
    :type data: dict
    :return: A JWT access token as a string that includes the encoded
        data and expiration timestamp.
    :rtype: str

    """
    to_encode = data.copy()
    expire = datetime.now() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# REFRESH TOKENS ========================================

def create_refresh_token():
    return str(uuid.uuid4())

def store_refresh_token(refresh_token, userid, db):
    """
    Stores a refresh token in the database by inserting it into the 'RefreshTokens' table.
    This function associates the provided refresh token with a specific user, including
    its creation and expiration details, and ensures the data is committed to the database.

    :param refresh_token: The token to be stored, representing the refresh token for
        the user.
    :type refresh_token: str
    :param userid: The unique identifier of the user to associate with the refresh token.
    :type userid: int
    :param db: The database connection/engine used to execute the insertion query.
    :type db: sqlalchemy.engine.base.Connection
    :return: A boolean indicating whether the token was successfully stored in
        the database.
    :rtype: bool
    """
    refreshtokens = metadata.tables["RefreshTokens"]
    stmt = refreshtokens.insert().values(
        UserID=userid,
        TokenValue=refresh_token,
        CreationDate=datetime.now(),
        ExpirationDate=datetime.now() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    try:
        db.execute(stmt)
        db.commit()
        return True
    except Exception as e:
        return False
#=======================================================
def verify_access_token(token: str):
    """
    Verifies the validity of a given access token. This function attempts to decode
    the provided token using the predefined secret key and algorithm. If the token
    is valid and decodes successfully, it returns `True`. If the token is invalid or
    malformed, an HTTP exception is raised with an unauthorized status.

    :param token: The token string to be validated
    :type token: str
    :return: `True` if the token decodes successfully, otherwise raises an exception
    :rtype: bool
    :raises HTTPException: When the token is invalid or cannot be decoded
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return True if payload else False
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
