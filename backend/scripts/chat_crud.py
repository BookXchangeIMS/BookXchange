from fastapi import HTTPException
from sqlalchemy import select, and_, or_, func, case

from backend.models import *
from backend.config.db import metadata

def get_message_by_id(messageid: int, db):
    messages = metadata.tables["Messages"]
    stmt = select(messages).where(messages.c.MessageID == messageid)
    return db.execute(stmt).fetchone()

def get_messages_between_users(current_userid: int, userid: int, listingid: int, db):
    messages = metadata.tables["Messages"]
    stmt = select(messages).where(
        and_(
            or_(
                and_(messages.c.SenderID == current_userid, messages.c.ReceiverID == userid),
                and_(messages.c.SenderID == userid,  messages.c.ReceiverID == current_userid)
            ),
        messages.c.ListingID == listingid
        )
    )
    try:
        result = db.execute(stmt).fetchall()
        return result
    except Exception as e:
        raise HTTPException(status_code=404, detail="Couldn't find messages")
    
def get_all_user_dialogues(current_userid: int, db):
    messages = metadata.tables["Messages"]

    # Canonical user pair (sorted)
    user1 = case(
        (messages.c.SenderID < messages.c.ReceiverID, messages.c.SenderID),
        else_=messages.c.ReceiverID
    ).label("User1")

    user2 = case(
        (messages.c.SenderID < messages.c.ReceiverID, messages.c.ReceiverID),
        else_=messages.c.SenderID
    ).label("User2")

    # Subquery: get latest message per conversation
    latest_sub = (
        select(
            messages.c.ListingID,
            user1,
            user2,
            func.max(messages.c.SentDate).label("LatestDate")
        )
        .where(
            or_(
                messages.c.SenderID == current_userid,
                messages.c.ReceiverID == current_userid
            )
        )
        .group_by(
            messages.c.ListingID,
            user1,
            user2
        )
        .subquery()
    )
    stmt = (
        select(messages)
        .join(
            latest_sub,
            and_(
                messages.c.ListingID == latest_sub.c.ListingID,
                user1 == latest_sub.c.User1,
                user2 == latest_sub.c.User2,
                messages.c.SentDate == latest_sub.c.LatestDate
            )
        )
    )
    try:
        return db.execute(stmt).fetchall()
    except Exception:
        raise HTTPException(status_code=404, detail="Couldn't find messages")

def delete_message_by_id(messageid: int, db):
    messages = metadata.tables["Messages"]
    stmt = messages.delete().where(messages.c.MessageID == messageid)
    result = db.execute(stmt)
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail=f"Couldn't find message:{messageid}")
    db.commit()

def post_new_message(senderid: int, receiverid: int, listingid: int, content: str, db):
    messages = metadata.tables["Messages"]
    stmt = messages.insert().values(SenderID=senderid, ReceiverID=receiverid, ListingID=listingid, Content=content)
    try:
        db.execute(stmt)
        db.commit()
        return True
    except Exception as e:
        raise HTTPException(status_code=409, detail="Couldn't add message")