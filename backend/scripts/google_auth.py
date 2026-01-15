import os
from urllib.parse import urlencode

import requests
from fastapi import APIRouter, HTTPException
from starlette.responses import RedirectResponse, JSONResponse

# Use .get() to provide fallback and prevent KeyError during import
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "")

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


@router.get("/callback", status_code=200)
def google_callback(code: str | None = None, error: str | None = None):
    """
    Google OAuth2 callback endpoint.
    
    This endpoint receives the authorization code from Google after user authentication.
    It exchanges the code for user information and returns the user's profile data.
    
    :param code: Authorization code from Google (provided as query parameter)
    :type code: str | None
    :param error: Error message from Google if authentication failed
    :type error: str | None
    :return: JSON response containing user information from Google
    :rtype: JSONResponse
    :raises HTTPException: If authentication fails or code is missing
    """
    if error:
        raise HTTPException(status_code=400, detail=f"Google error: {error}")
    if not code:
        raise HTTPException(status_code=400, detail="Missing code")

    google_user = exchange_code_for_userinfo(code)
    return JSONResponse(google_user)
