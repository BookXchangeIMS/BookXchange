import os
from urllib.parse import urlencode
from datetime import datetime, timedelta
import uuid

import requests
from fastapi import APIRouter, HTTPException, Depends, Form
from starlette.responses import RedirectResponse, JSONResponse
from pydantic import BaseModel
from jose import jwt

from backend.scripts.auth import (
    check_if_email_exists, 
    create_access_token, 
    create_refresh_token,
    store_refresh_token,
    sign_user_up
)
from backend.config.db import get_db
from backend.config.config import Settings
from backend.scripts.location_scripts import post_location, address_to_coordinates
from backend.models import Location

# Use .get() to provide fallback and prevent KeyError during import
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "")
SECRET_KEY = Settings().SECRET_KEY
ALGORITHM = Settings().ALGORITHM

router = APIRouter(prefix="/auth/google", tags=["Authentication"])


@router.get("/login", status_code=307)
def google_login():
    """
    Initiates Google OAuth2 login flow.
    
    This endpoint redirects the user to Google's OAuth2 authorization page.
    After successful authentication, Google will redirect back to the callback endpoint
    with an authorization code.
    
    :return: RedirectResponse to Google OAuth2 authorization URL
    :rtype: RedirectResponse
    :raises HTTPException: If Google OAuth credentials are not configured
    """
    # Validate that environment variables are set
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET or not GOOGLE_REDIRECT_URI:
        raise HTTPException(
            status_code=500, 
            detail="Google OAuth is not configured. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI environment variables."
        )
    
    params = {
        "response_type": "code",
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)
    return RedirectResponse(url)


def exchange_code_for_userinfo(code: str):
    """
    Exchange authorization code for user information.
    
    :param code: Authorization code from Google OAuth2
    :type code: str
    :return: User information from Google
    :rtype: dict
    :raises HTTPException: If token exchange or user info retrieval fails
    """
    token_resp = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        },
        timeout=10,
    )
    if not token_resp.ok:
        raise HTTPException(status_code=400, detail="Failed to get token from Google")

    access_token = token_resp.json().get("access_token")

    userinfo_resp = requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10,
    )
    if not userinfo_resp.ok:
        raise HTTPException(status_code=400, detail="Failed to get user info from Google")

    return userinfo_resp.json()


@router.get("/callback", status_code=307)
def google_callback(code: str | None = None, error: str | None = None, db = Depends(get_db)):
    """
    Google OAuth2 callback endpoint.
    
    This endpoint handles the OAuth callback from Google. It checks if the user exists:
    - If existing user: Generates tokens and redirects to home page
    - If new user: Creates temporary JWT session and redirects to profile completion page
    
    :param code: Authorization code from Google (provided as query parameter)
    :type code: str | None
    :param error: Error message from Google if authentication failed
    :type error: str | None
    :param db: Database session dependency
    :return: RedirectResponse to either home page or profile completion page
    :rtype: RedirectResponse
    :raises HTTPException: If authentication fails or code is missing
    """
    if error:
        # Redirect to login page with error message
        return RedirectResponse(f"/login?error={error}")
    if not code:
        return RedirectResponse("/login?error=missing_code")

    try:
        google_user = exchange_code_for_userinfo(code)
        email = google_user.get("email")
        name = google_user.get("name", "")
        
        if not email:
            raise HTTPException(status_code=400, detail="Email not provided by Google")
        
        # Check if user exists
        if check_if_email_exists(email, db):
            # Existing user - generate tokens and redirect to home
            access_token = create_access_token({"Email": email})
            refresh_token = create_refresh_token()
            
            # Get user ID to store refresh token
            from backend.scripts.auth import get_userid_by_access_token
            user_id = get_userid_by_access_token(access_token, db)
            store_refresh_token(refresh_token, user_id, db)
            
            # Redirect to home with tokens in URL params
            return RedirectResponse(
                f"/?access_token={access_token}&refresh_token={refresh_token}",
                status_code=307
            )
        else:
            # New user - create JWT session token (expires in 15 minutes)
            session_data = {
                "email": email,
                "name": name,
                "exp": datetime.now() + timedelta(minutes=15)
            }
            session_token = jwt.encode(session_data, SECRET_KEY, algorithm=ALGORITHM)
            
            # Redirect to profile completion page
            return RedirectResponse(
                f"/complete-google-profile?session_token={session_token}&email={email}&name={name}",
                status_code=307
            )
    except HTTPException:
        raise
    except Exception as e:
        return RedirectResponse(f"/login?error=oauth_failed")


@router.post("/complete-profile", status_code=200)
def complete_google_profile(
    session_token: str = Form(...),
    name: str = Form(...),
    date_of_birth: str = Form(...),
    location_address: str = Form(...),
    db = Depends(get_db)
):
    """
    Complete Google OAuth profile for new users.
    
    This endpoint validates the temporary JWT session, checks age requirements,
    creates the user account, and returns authentication tokens.
    
    :param session_token: Temporary JWT session token from OAuth callback
    :type session_token: str
    :param name: User's name (can be edited from Google-provided name)
    :type name: str
    :param date_of_birth: User's date of birth (YYYY-MM-DD format)
    :type date_of_birth: str
    :param location_address: User's location address
    :type location_address: str
    :param db: Database session dependency
    :return: JSON with access and refresh tokens
    :rtype: dict
    :raises HTTPException: If session invalid, age requirement not met, or creation fails
    """
    # Validate JWT session token
    try:
        session = jwt.decode(session_token, SECRET_KEY, algorithms=[ALGORITHM])
        email = session.get("email")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired. Please try signing in again.")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid session token")
    
    if not email:
        raise HTTPException(status_code=400, detail="Invalid session data")
    
    # Parse and validate date of birth
    try:
        dob = datetime.fromisoformat(date_of_birth.replace('Z', '+00:00'))
    except:
        raise HTTPException(status_code=400, detail="Invalid date format")
    
    # Check age requirement (must be at least 18 years old)
    age = (datetime.now() - dob).days // 365
    if age < 18:
        raise HTTPException(status_code=400, detail="You must be at least 18 years old to register")
    
    # Check if email still doesn't exist (race condition protection)
    if check_if_email_exists(email, db):
        raise HTTPException(status_code=409, detail="Account already exists")
    
    # Geocode the address to get coordinates
    coords = address_to_coordinates(location_address)
    if not coords:
        raise HTTPException(status_code=400, detail="Could not geocode the provided address")
    
    latitude, longitude = coords
    
    # Create location object
    location_data = Location(
        Latitude=latitude,
        Longitude=longitude,
        Address=location_address,
        Description=""
    )
    
    # Create location in database
    location_id = post_location(location_data, db)
    
    # Create fake SignUp object for compatibility with existing function
    from backend.models import SignUp
    fake_signup = SignUp(
        Email=email,
        Name=name,
        PasswordHash=str(uuid.uuid4()),  # Random password hash (won't be used for OAuth logins)
        DateOfBirth=dob,
        LocationAddress=location_address
    )
    
    # Create user
    sign_user_up(fake_signup, location_id, db)
    
    # Generate tokens
    access_token = create_access_token({"Email": email})
    refresh_token = create_refresh_token()
    
    # Get user ID and store refresh token
    from backend.scripts.auth import get_userid_by_access_token
    user_id = get_userid_by_access_token(access_token, db)
    store_refresh_token(refresh_token, user_id, db)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token
    }
