from fastapi import HTTPException
from sqlalchemy import select, and_, or_, func, case

from backend.config.db import metadata
from backend.scripts.gamification import award_points


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
        print(f"[ERROR] Failed to add transaction: {type(e).__name__}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=409, detail=f"Couldn't add transaction: {str(e)}")

def confirm_transaction_by_listingid_and_buyeid(listingid: int, buyerid: int, BySeller: bool, db):
    transactions = metadata.tables["Transactions"]
    listings = metadata.tables["Listings"]

    # First, update the side that is confirming now
    if BySeller:
        stmt = transactions.update().where(
            and_(transactions.c.ListingID == listingid,
                 transactions.c.BuyerID == buyerid)
        ).values(ConfirmedBySeller=True)
    else:
        stmt = transactions.update().where(
            and_(transactions.c.ListingID == listingid,
                 transactions.c.BuyerID == buyerid)
        ).values(ConfirmedByBuyer=True)

    try:
        db.execute(stmt)
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=409, detail="Couldn't confirm transaction")

    # Reload transaction to see current state
    tx = get_transaction_by_listingid_and_userid(listingid, buyerid, db)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # If BOTH sides are now confirmed, close listing and award points
    if tx.ConfirmedByBuyer and tx.ConfirmedBySeller:
        # Mark transaction as completed
        stmt_tx_done = transactions.update().where(
            and_(transactions.c.ListingID == listingid,
                 transactions.c.BuyerID == buyerid)
        ).values(TransactionStatus=1)
        # Close listing
        stmt_listing = listings.update().where(
            listings.c.ListingID == listingid
        ).values(ListingState="Closed")

        try:
            db.execute(stmt_tx_done)
            db.execute(stmt_listing)
            db.commit()
        except Exception:
            db.rollback()
            raise HTTPException(status_code=409, detail="Couldn't close listing")

        # Award points to both buyer and seller
        try:
            # Seller is the listing owner
            sellerid = listings.select().where(
                listings.c.ListingID == listingid
            )
            # Fetch seller id
            seller_row = db.execute(
                select(listings.c.UserID).where(listings.c.ListingID == listingid)
            ).fetchone()
            if seller_row:
                seller_id = seller_row.UserID
                award_points(buyerid, "COMPLETE_TRANSACTION", db)
                award_points(seller_id, "COMPLETE_TRANSACTION", db)
        except Exception:
            # Do not break transaction if points fail
            pass

    return True


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
    
    # JOIN with Listings to get seller's UserID
    stmt = select(transactions).select_from(
        transactions.join(listings, transactions.c.ListingID == listings.c.ListingID)
    ).where(
        or_(
            transactions.c.BuyerID == userid,  # User is buyer
            listings.c.UserID == userid        # User is seller (listing owner)
        )
    )
    
    return db.execute(stmt).fetchall()
