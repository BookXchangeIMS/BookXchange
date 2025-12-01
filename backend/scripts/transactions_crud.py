from fastapi import HTTPException
from sqlalchemy import select, and_, or_, func, case

from backend.config.db import metadata


def get_transaction_by_listingid_and_userid(listingid: int, buyerid: int, db):
    transactions = metadata.tables["Transactions"]
    stmt = select(transactions).where(and_(transactions.c.ListingID == listingid, transactions.c.BuyerID == buyerid))
    return db.execute(stmt).fetchone()

def post_new_transaction(listingid: int, buyerid: int, sellerid: int, BySeller: bool,  db):
    transactions = metadata.tables["Transactions"]
    if BySeller:
        stmt = transactions.insert().values(ListingID=listingid, BuyerID=buyerid, TransactionStatus=0, ConfirmedBySeller=True)
    else:
        stmt = transactions.insert().values(ListingID=listingid, BuyerID=buyerid, TransactionStatus=0, ConfirmedByBuyer=True)
    try:
        db.execute(stmt)
        db.commit()
        return True
    except Exception as e:
        raise HTTPException(status_code=409, detail="Couldn't add transaction")

def confirm_transaction_by_listingid_and_buyeid(listingid: int, buyerid: int, BySeller: bool, db):
    transactions = metadata.tables["Transactions"]
    listings = metadata.tables["Listings"]
    if BySeller:
        stmt = transactions.update().where(and_(transactions.c.ListingID == listingid, transactions.c.BuyerID == buyerid)).values(TransactionStatus=1, ConfirmedBySeller=True)
    else:
        stmt = transactions.update().where(and_(transactions.c.ListingID == listingid, transactions.c.BuyerID == buyerid)).values(TransactionStatus=1, ConfirmedByBuyer=True)
    try:
        db.execute(stmt)
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=409, detail="Couldn't confirm transaction")
    stmt2 = listings.update().where(listings.c.ListingID == listingid).values(ListingState="Closed")
    try:
        db.execute(stmt2)
        db.commit()
        return True
    except Exception as e:
        raise HTTPException(status_code=409, detail="Couldn't close listing")

def delete_transaction_by_listingid_and_buyerid(listingid: int, buyerid: int, BySeller: bool, db):
    transactions = metadata.tables["Transactions"]
    if BySeller:
        stmt = transactions.delete().where(and_(transactions.c.ListingID == listingid, transactions.c.BuyerID == buyerid, transactions.c.ConfirmedBySeller == True))
    else:
        stmt = transactions.delete().where(and_(transactions.c.ListingID == listingid, transactions.c.BuyerID == buyerid, transactions.c.ConfirmedByBuyer == True))
    result = db.execute(stmt)
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail=f"Couldn't find transaction:{listingid}:{buyerid} or Transaction is not confirmed on your side in the first place")
    db.commit()
    return True

def unconfirm_transaction_by_listingid_and_buyerid(listingid: int, buyerid: int, BySeller: bool, db):
    transactions = metadata.tables["Transactions"]
    listings = metadata.tables["Listings"]
    if BySeller:
        stmt = transactions.update().where(and_(transactions.c.ListingID == listingid, transactions.c.BuyerID == buyerid)).values(TransactionStatus=0, ConfirmedBySeller=False)
    else:
        stmt = transactions.update().where(and_(transactions.c.ListingID == listingid, transactions.c.BuyerID == buyerid)).values(TransactionStatus=0, ConfirmedByBuyer=False)
    try:
        db.execute(stmt)
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=409, detail="Couldn't unconfirm transaction")
    stmt2 = listings.update().where(listings.c.ListingID == listingid).values(ListingState="Active")
    try:
        db.execute(stmt2)
        db.commit()
        return True
    except Exception as e:
        raise HTTPException(status_code=409, detail="Couldn't open listing")

def get_transactions_by_userid(userid: int, db):
    transactions = metadata.tables["Transactions"]
    listings = metadata.tables["Listings"]
    stmt = select(transactions).where(
        or_(transactions.c.BuyerID == userid,
            and_(transactions.c.ListingID == listings.c.ListingID, listings.c.UserID == userid))
    )
    return db.execute(stmt).fetchall()
