from datetime import timedelta
from jose import jwt, JWTError
from fastapi import HTTPException, status
from sqlalchemy import select
import uuid
import hashlib
import os

from backend.config.config import Settings
from backend.models import *
from backend.config.db import metadata

# Fetching Config file
SECRET_KEY = Settings().SECRET_KEY
ALGORITHM = Settings().ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = Settings().ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = Settings().REFRESH_TOKEN_EXPIRE_DAYS

#================================================================================================================
# USER-DB LOOK-UPS ==============================================================================================

def verify_password_hash(stored_password: str, provided_password: str) -> bool:
    """
    Verify a password against a stored hash.

    :param stored_password: The hex-encoded password hash from the database
    :param provided_password: The plain password to verify
    :return: True if password matches, False otherwise
    """
    # Convert stored hex string back to bytes
    stored_bytes = bytes.fromhex(stored_password)
    salt = stored_bytes[:32]  # First 32 bytes are salt
    stored_hash = stored_bytes[32:]  # Rest is the hash

    # Hash the provided password with the same salt
    new_hash = hashlib.pbkdf2_hmac(
        Settings().HASH_ALGORITHM,
        provided_password.encode('utf-8'),
        salt,
        Settings().HASH_ITERATIONS
    )
    return new_hash == stored_hash


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
    stmt = select(users).where(users.c.Email == data.Email)
    row = db.execute(stmt).fetchone()

    if row and verify_password_hash(row.PasswordHash, data.PasswordHash):
        return row.UserID
    return None


def check_if_email_exists(email: str, db):
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
    stmt = select(users).where(users.c.Email == email)
    row = db.execute(stmt).fetchone()
    return True if row else False


def sign_user_up(data: SignUp, locationid: int, db):
    """
    Inserts a new user into the "Users" table in the database. The function takes
    user sign-up data and a database connection to create a user account record.
    If an exception occurs during the execution, an HTTPException with status 
    code 409 is raised.

    :param data: Data object that contains details of the user to be signed up,
        including Name, Email, PasswordHash, etc.
    :param db: Database connection object used to execute the insertion and
        commit the changes.
    :return: None
    """
    # Generate random salt and hash password
    salt = os.urandom(32)
    hash = hashlib.pbkdf2_hmac(
        Settings().HASH_ALGORITHM,
        data.PasswordHash.encode('utf-8'),
        salt,
        Settings().HASH_ITERATIONS
    )
    # Combine salt and hash 
    password_hash = salt + hash

    users = metadata.tables["Users"]
    stmt = users.insert().values(
        Name=data.Name,
        Email=data.Email,
        PasswordHash=password_hash.hex(),
        DateOfBirth=data.DateOfBirth,
        CreationDate=datetime.now(),
        ProfileImagePath="/image.png",
        UserRole="User",
        AboutMe="",
        LocationID=locationid
    )
    try:
        db.execute(stmt)
        db.commit()
    except Exception as e:
        print("ho nooo")
        raise HTTPException(status_code=500, detail="Couldn't create new account. Please try again later.")

def get_user_by_id(userid: int, db):
    """
    Retrieve a user by their unique identifier from the database.

    This function queries the database using the provided user ID and returns the user's
    corresponding information if they exist. An exception will be raised if the user ID
    does not match any entry in the database.

    :param userid: The unique identifier of the user to retrieve.
    :type userid: int
    :param db: The database connection object used to execute the query.
    :return: A row object containing the user's information retrieved from the database.
    :rtype: Any
    :raises HTTPException: If the user is not found in the database.
    """
    users = metadata.tables["Users"]
    stmt = select(users).where(users.c.UserID == userid)
    row = db.execute(stmt).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return row

def get_userid_by_refresh_token(refresh_token, db):
    """
    Retrieve a user ID associated with a given refresh token from the database.

    This function queries the `RefreshTokens` table in the database to find a record whose
    `TokenValue` matches the provided `refresh_token`. If such a record exists, the function
    returns the corresponding `UserID`. Otherwise, it returns `None`.

    :param refresh_token: The refresh token value used to search for the user ID.
    :type refresh_token: str
    :param db: The database connection object for executing the query.
    :type db: sqlalchemy.engine.base.Connection
    :return: The user ID associated with the provided refresh token or None if no match is found.
    :rtype: Optional[int]
    """
    refreshtokens = metadata.tables["RefreshTokens"]
    stmt = select(refreshtokens).where(refreshtokens.c.TokenValue == refresh_token)
    row = db.execute(stmt).fetchone()
    if row:
        return row.UserID
    else:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

def get_userid_by_access_token(access_token, db):
    try:
        payload = jwt.decode(access_token, SECRET_KEY, algorithms=[ALGORITHM])
        credentials = payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    users = metadata.tables["Users"]
    stmt = select(users).where(users.c.Email == credentials["Email"])
    row = db.execute(stmt).fetchone()
    if row:
        return row.UserID
    else:
        raise HTTPException(status_code=401, detail="Invalid or expired access token")
#================================================================================================================
# ACCESS TOKENS =================================================================================================

def create_access_token(data: dict):
    """
    Generates a JWT access token for the given data. The token includes
    an expiration timestamp and is encoded using the specified secret
    key and algorithm.

    :param data: A dictionary containing credentials and expiration date (look up the SignIn or SignUp endpoints for details*)
    :type data: dict
    :return: A JWT access token as a string that includes the encoded
        data and expiration timestamp.
    :rtype: str

    """
    to_encode = data.copy()
    expire = datetime.now() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

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
#================================================================================================================
# REFRESH TOKENS ================================================================================================

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

def verify_refresh_token(token: str, db):
    """
    Verifies the validity of a given refresh token by checking its existence and
    expiration against the database. If the token is valid, it returns a boolean
    value indicating success. If the token is invalid or expired, it raises an
    HTTPException with a 401 status code.

    :param token: The refresh token string to validate.
    :type token: str
    :param db: The database connection object used to execute the query.
    :return: A boolean indicating if the refresh token is valid (True).
    :rtype: bool
    :raises HTTPException: Raised if the token is invalid or expired, with a
        status code 401 and appropriate error details.
    """
    refreshtokens = metadata.tables["RefreshTokens"]
    stmt = select(refreshtokens).where(
        refreshtokens.c.TokenValue == token,
        refreshtokens.c.ExpirationDate > datetime.now())
    row = db.execute(stmt).fetchone()
    if row:
        return True
    else:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")


def destroy_refresh_token(tokens: Tokens, db):
    """
    Deletes a specified refresh token from the database. This function locates the refresh
    token in the "RefreshTokens" table and deletes the corresponding record. If no record
    is found matching the given refresh token, an HTTPException is raised with a 404 status.

    :param tokens: The Tokens object containing the refresh token to be deleted.
    :type tokens: Tokens
    :param db: The database connection object used to execute the query and manage the
        transaction.
    :type db: Any
    :return: None
    """
    refreshtokens = metadata.tables["RefreshTokens"]
    stmt = refreshtokens.delete().where(refreshtokens.c.TokenValue == tokens.refresh_token)
    result = db.execute(stmt)
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Refresh token not found")
    db.commit()

#=============================================================================================

