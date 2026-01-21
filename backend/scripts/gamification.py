# backend/scripts/gamification.py
"""
Gamification module for BookXchange.
Handles point awards and level progression for user actions.
"""

from sqlalchemy import select, update, func
from backend.config.db import metadata
from fastapi import HTTPException
from datetime import datetime


# ========================================
# POINT CONFIGURATION
# ========================================
POINT_VALUES = {
    "SIGN_UP": 50,                    # New user registration
    "SIGN_IN": 10,                    # Daily login
    "CREATE_LISTING": 300,            # Post a new book listing
    "SEND_MESSAGE": 25,               # Send message to another user
    "COMPLETE_TRANSACTION": 500,      # Successfully close a deal/handshake
}

# Level progression: every X points = 1 level
POINTS_PER_LEVEL = 500


# ========================================
# CORE GAMIFICATION FUNCTIONS
# ========================================

def ensure_user_points_record(userid: int, db):
    """
    Ensure a UserPoints record exists for the user.
    If not, create one with default values.
    
    :param userid: The ID of the user
    :param db: Database session
    """
    userpoints_table = metadata.tables["UserPoints"]
    
    # Check if record exists
    stmt = select(userpoints_table).where(userpoints_table.c.UserID == userid)
    row = db.execute(stmt).fetchone()
    
    if not row:
        # Create new record with defaults
        stmt = userpoints_table.insert().values(
            UserID=userid,
            TotalPoints=0,
            Level=1,
            LastUpdated=datetime.now()
        )
        try:
            db.execute(stmt)
            db.commit()
        except Exception as e:
            print(f"Error creating UserPoints record: {e}")
            db.rollback()


def award_points(userid: int, event_type: str, db):
    """
    Award points to a user for a specific action.
    Automatically updates level based on total points.
    
    :param userid: The ID of the user earning points
    :param event_type: Type of event (must be key in POINT_VALUES dict)
    :param db: Database session
    :return: dict with new_points, new_level, and points_awarded
    :raises HTTPException: If event_type is invalid or database operation fails
    """
    
    # Validate event type
    if event_type not in POINT_VALUES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid event type: {event_type}"
        )
    
    points_to_award = POINT_VALUES[event_type]
    
    # Ensure UserPoints record exists
    ensure_user_points_record(userid, db)
    
    userpoints_table = metadata.tables["UserPoints"]
    
    try:
        # Get current points
        stmt = select(userpoints_table).where(userpoints_table.c.UserID == userid)
        row = db.execute(stmt).fetchone()
        
        if not row:
            raise HTTPException(
                status_code=404,
                detail="User not found in points system"
            )
        
        current_points = row.TotalPoints
        new_total = current_points + points_to_award
        new_level = calculate_level(new_total)
        
        # Update UserPoints
        stmt = update(userpoints_table).where(
            userpoints_table.c.UserID == userid
        ).values(
            TotalPoints=new_total,
            Level=new_level,
            LastUpdated=datetime.now()
        )
        
        db.execute(stmt)
        db.commit()
        
        return {
            "new_points": new_total,
            "new_level": new_level,
            "points_awarded": points_to_award,
            "event_type": event_type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error awarding points: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to award points"
        )


def get_user_points(userid: int, db) -> dict:
    """
    Retrieve current points and level for a user.
    
    :param userid: The ID of the user
    :param db: Database session
    :return: dict with TotalPoints, Level, and LastUpdated
    :raises HTTPException: If user not found
    """
    userpoints_table = metadata.tables["UserPoints"]
    
    stmt = select(userpoints_table).where(userpoints_table.c.UserID == userid)
    row = db.execute(stmt).fetchone()
    
    if not row:
        # Return defaults if no record exists
        ensure_user_points_record(userid, db)
        return {
            "TotalPoints": 0,
            "Level": 1,
            "LastUpdated": datetime.now()
        }
    
    return {
        "TotalPoints": row.TotalPoints,
        "Level": row.Level,
        "LastUpdated": row.LastUpdated
    }


def calculate_level(total_points: int) -> int:
    """
    Calculate user level based on total points.
    
    Formula: Level = (total_points // POINTS_PER_LEVEL) + 1
    
    :param total_points: Total accumulated points
    :return: User's level (minimum 1)
    """
    return max(1, (total_points // POINTS_PER_LEVEL) + 1)


def get_points_until_next_level(total_points: int) -> int:
    """
    Calculate how many points are needed to reach the next level.
    
    :param total_points: Current total points
    :return: Points needed to level up (minimum 0)
    """
    current_level = calculate_level(total_points)
    points_for_next_level = current_level * POINTS_PER_LEVEL
    return max(0, points_for_next_level - total_points)


def get_leaderboard(db, limit: int = 10) -> list:
    """
    Get top users by points (leaderboard).
    
    :param db: Database session
    :param limit: Number of top users to return (default 10)
    :return: List of dicts with UserID, TotalPoints, Level, and user Name
    """
    userpoints_table = metadata.tables["UserPoints"]
    users_table = metadata.tables["Users"]
    
    # Use outerjoin to include users without point records (default to 0 points)
    stmt = select(
        users_table.c.UserID,
        users_table.c.Name,
        users_table.c.ProfileImagePath,
        func.coalesce(userpoints_table.c.TotalPoints, 0).label("TotalPoints"),
        func.coalesce(userpoints_table.c.Level, 1).label("Level")
    ).outerjoin(
        userpoints_table,
        users_table.c.UserID == userpoints_table.c.UserID
    ).order_by(
        func.coalesce(userpoints_table.c.TotalPoints, 0).desc()
    ).limit(limit)
    
    try:
        rows = db.execute(stmt).fetchall()
        return [
            {
                "UserID": row.UserID,
                "Name": row.Name,
                "ProfileImagePath": row.ProfileImagePath,
                "TotalPoints": row.TotalPoints,
                "Level": row.Level
            }
            for row in rows
        ]
    except Exception as e:
        print(f"Error fetching leaderboard: {e}")
        return []