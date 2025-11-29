from fastapi import HTTPException
from sqlalchemy import select, and_, or_, func, case

from backend.config.db import metadata


def get_transaction_by_listingid_and_userid(listingid: int, buyerid: int, db):
    transactions = metadata.tables["Transactions"]
    stmt = select(transactions).where(and_(transactions.c.ListingID == listingid, transactions.c.BuyerID == buyerid))
    return db.execute(stmt).fetchone()

def post_new_transaction(listingid: int, buyerid: int, db):
    transactions = metadata.tables["Transactions"]
    stmt = transactions.insert().values(ListingID=listingid, BuyerID=buyerid, TransactionStatus=0)
    try:
        db.execute(stmt)
        db.commit()
        return True
    except Exception as e:
        raise HTTPException(status_code=409, detail="Couldn't add transaction")

def confirm_transaction_by_listingid_and_buyeid(listingid: int, buyerid: int, db):
    transactions = metadata.tables["Transactions"]
    stmt = transactions.update().where(and_(transactions.c.ListingID == listingid, transactions.c.BuyerID == buyerid)).values(TransactionStatus=1)
    try:
        db.execute(stmt)
        db.commit()
        return True
    except Exception as e:
        raise HTTPException(status_code=409, detail="Couldn't confirm transaction")

def delete_transaction_by_listingid_and_buyerid(listingid: int, buyerid: int, db):
    transactions = metadata.tables["Transactions"]
    stmt = transactions.delete().where(and_(transactions.c.ListingID == listingid, transactions.c.BuyerID == buyerid))
    result = db.execute(stmt)
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail=f"Couldn't find transaction:{listingid}:{buyerid}")
    db.commit()
    return True

def unconfirm_transaction_by_listingid_and_buyerid(listingid: int, buyerid: int, db):
    transactions = metadata.tables["Transactions"]
    stmt = transactions.update().where(and_(transactions.c.ListingID == listingid, transactions.c.BuyerID == buyerid)).values(TransactionStatus=0)
    try:
        db.execute(stmt)
        db.commit()
        return True
    except Exception as e:
        raise HTTPException(status_code=409, detail="Couldn't unconfirm transaction")

def get_transactions_by_userid(userid: int, db):
    transactions = metadata.tables["Transactions"]
    listings = metadata.tables["Listings"]
    stmt = select(transactions).where(
        or_(transactions.c.BuyerID == userid,
            and_(transactions.c.ListingID == listings.c.ListingID, listings.c.UserID == userid))
    )
    return db.execute(stmt).fetchall()
