
import os
import sys
from sqlalchemy import create_engine, MetaData, text

password = "1L0V3800K3XCHANG3ANDDATA8A333!"
host = "localhost" 
database_url = f"mssql+pyodbc://sa:{password}@{host}:1433/BookXchange?driver=ODBC+Driver+18+for+SQL+Server&Encrypt=no&TrustServerCertificate=yes"

print(f"Connecting to {database_url}...")

try:
    engine = create_engine(database_url)
    connection = engine.connect()
    
    print("\n--- Users Table ---")
    result = connection.execute(text("SELECT UserID, Name, Email FROM Users"))
    users = result.fetchall()
    print(f"Total Users: {len(users)}")
    for user in users:
        print(f"ID: {user.UserID}, Name: {user.Name}, Email: {user.Email}")
        
    print("\n--- UserPoints Table ---")
    result = connection.execute(text("SELECT * FROM UserPoints"))
    points = result.fetchall()
    print(f"Total UserPoints Records: {len(points)}")
    for point in points:
        print(f"UserID: {point.UserID}, TotalPoints: {point.TotalPoints}, Level: {point.Level}")
        
    connection.close()
except Exception as e:
    print(f"Error: {e}")
