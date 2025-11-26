# backend/api/recommendations.py
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import threading
from datetime import datetime
import logging

# Import your existing modules
from backend.scripts.auth import get_userid_by_access_token, verify_access_token
from backend.config.db import get_db

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router with prefix
router = APIRouter(prefix="/api/recommendations", tags=["Recommendations"])

# Recommendation Models
class ListingRecommendation(BaseModel):
    ListingID: int
    BookID: int
    Title: str
    AuthorName: str
    Price: Optional[float]
    Condition: str  # ListingState from your schema
    Location: str
    SellerName: str
    ListingDate: str
    AverageRating: float
    Description: str
    Genres: List[str]
    ConfidenceScore: float
    RecommendationReason: str
    RecommendationType: str

class RecommendationResponse(BaseModel):
    recommendations: List[ListingRecommendation]
    total_found: int
    generated_at: str
    user_profile_summary: dict

class StorefrontRecommendations(BaseModel):
    featured_listings: List[ListingRecommendation]
    popular_listings: List[ListingRecommendation]
    new_listings: List[ListingRecommendation]

# Global variables for recommendation system
listings_df = None
tfidf_matrix = None
tfidf = None
data_lock = threading.Lock()

def load_listings_from_db(db):
    """Load active listings with book and author information from database"""
    global listings_df, tfidf_matrix, tfidf
    
    try:
        # Load listings with book and author information
        listings_query = """
        SELECT DISTINCT 
            l.ListingID,
            l.BookID,
            b.Title,
            a.AuthorName,
            l.Price,
            l.ListingState as Condition,
            loc.Address as Location,
            u.Name as SellerName,
            l.CreationDate as ListingDate,
            COALESCE(AVG(CAST(r.RatingValue AS FLOAT)), 3.0) as AverageRating,
            CASE 
                WHEN b.Title IS NOT NULL AND a.AuthorName IS NOT NULL 
                THEN b.Title + ' by ' + a.AuthorName + ' - ' + ISNULL(b.Language, 'Unknown Language')
                ELSE 'Book Listing'
            END as Description
        FROM Listings l
        JOIN Books b ON l.BookID = b.BookID
        JOIN AuthorBook ab ON b.BookID = ab.BookID
        JOIN Authors a ON ab.AuthorID = a.AuthorID
        JOIN Users u ON l.UserID = u.UserID
        JOIN Locations loc ON u.LocationID = loc.LocationID
        LEFT JOIN Reviews r ON l.ListingID = r.ListingID  -- Assuming you have a Reviews table
        WHERE l.ListingState IN ('Active', 'Available')  -- Only active listings
        GROUP BY l.ListingID, l.BookID, b.Title, a.AuthorName, l.Price, 
                 l.ListingState, loc.Address, u.Name, l.CreationDate, b.Language
        ORDER BY l.CreationDate DESC
        """
        
        listings_df = pd.read_sql(listings_query, db.bind.raw_connection())
        
        # Add genres information (you'll need to join with your genre tables)
        # For now, we'll add a simple genre assignment based on title keywords
        listings_df['Genres'] = listings_df['Title'].apply(extract_genres_from_title)
        
        # Add missing columns if they don't exist
        if 'Description' not in listings_df.columns:
            listings_df['Description'] = listings_df['Title'] + ' by ' + listings_df['AuthorName']
        
        prepare_tfidf_features()
        logger.info(f"Loaded {len(listings_df)} active listings from database")
        
    except Exception as e:
        logger.error(f"Error loading listings from database: {str(e)}")
        # Create minimal mock data if database is empty
        create_minimal_mock_listings()

def extract_genres_from_title(title):
    """Extract genres from title keywords (simplified approach)"""
    title_lower = title.lower()
    genres = []
    
    genre_keywords = {
        'Science Fiction': ['dune', 'space', 'galaxy', 'future', 'robot', 'alien'],
        'Fantasy': ['harry potter', 'lord of the rings', 'dragon', 'magic', 'wizard'],
        'Mystery': ['detective', 'murder', 'mystery', 'sherlock', 'crime'],
        'Romance': ['love', 'romance', 'heart', 'wedding'],
        'Horror': ['horror', 'scary', 'ghost', 'haunted'],
        'Classic': ['pride and prejudice', 'great gatsby', '1984', 'classic']
    }
    
    for genre, keywords in genre_keywords.items():
        if any(keyword in title_lower for keyword in keywords):
            genres.append(genre)
    
    return genres if genres else ['Fiction']

def create_minimal_mock_listings():
    """Create minimal mock listings when database is empty"""
    global listings_df
    
    # Sample data for testing
    mock_data = {
        'ListingID': [101, 102, 103, 104, 105, 106, 107, 108, 109, 110],
        'BookID': [1, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        'Title': [
            "Dune", "Dune", "The Hobbit", "1984", "To Kill a Mockingbird",
            "Harry Potter and the Sorcerer's Stone", "The Great Gatsby",
            "Pride and Prejudice", "The Catcher in the Rye", "Brave New World"
        ],
        'AuthorName': [
            "Frank Herbert", "Frank Herbert", "J.R.R. Tolkien", "George Orwell", "Harper Lee",
            "J.K. Rowling", "F. Scott Fitzgerald", "Jane Austen", "J.D. Salinger", "Aldous Huxley"
        ],
        'Price': [15.99, 12.50, 18.75, 10.25, 14.99, 19.99, 13.50, 11.25, 16.80, 12.00],
        'Condition': ["Good", "Like New", "Acceptable", "Good", "Very Good", "New", "Good", "Acceptable", "Good", "Very Good"],
        'Location': [
            "New York, NY", "Boston, MA", "San Francisco, CA", "Chicago, IL", "Austin, TX",
            "Seattle, WA", "Miami, FL", "Denver, CO", "Atlanta, GA", "Portland, OR"
        ],
        'SellerName': [
            "SciFiFan", "BookCollector", "FantasyLover", "ClassicReader", "SouthernReader",
            "YoungAdultFan", "JazzAgeBuff", "RomanceReader", "TeenLitFan", "DystopianFan"
        ],
        'ListingDate': [
            "2024-01-15", "2024-01-10", "2024-01-08", "2024-01-05", "2024-01-03",
            "2024-01-01", "2023-12-28", "2023-12-25", "2023-12-20", "2023-12-15"
        ],
        'AverageRating': [4.5, 4.5, 4.8, 4.3, 4.7, 4.9, 4.2, 4.1, 3.9, 4.4],
        'Description': [
            "Classic science fiction epic about desert planet", "Mint condition sci-fi masterpiece",
            "Fantasy adventure with hobbits", "Dystopian classic about totalitarianism",
            "Award-winning novel about racial injustice", "First book in magical series",
            "Classic American novel about the Jazz Age", "Romantic novel about social class",
            "Coming-of-age novel about teenage rebellion", "Dystopian novel about future society"
        ]
    }
    
    listings_df = pd.DataFrame(mock_data)
    listings_df['Genres'] = listings_df['Title'].apply(extract_genres_from_title)
    
    prepare_tfidf_features()
    logger.info("Created minimal mock listings for testing")

def prepare_tfidf_features():
    """Prepare TF-IDF features for content-based recommendations"""
    global listings_df, tfidf_matrix, tfidf
    
    with data_lock:
        if listings_df is None or listings_df.empty:
            tfidf_matrix = np.array([]).reshape(0, 1000)
            return
        
        # Prepare text features for listings
        listings_df['combined_features'] = (
            listings_df['Title'].fillna('') + ' ' + 
            listings_df['AuthorName'].fillna('') + ' ' +
            listings_df['Description'].fillna('') + ' ' +
            listings_df['Condition'].fillna('') + ' ' +
            ' '.join(listings_df['Genres'].apply(lambda x: ' '.join(x) if isinstance(x, list) else str(x)))
        )
        
        # Create TF-IDF vectors
        tfidf = TfidfVectorizer(stop_words='english', max_features=10000, ngram_range=(1, 2))
        tfidf_matrix = tfidf.fit_transform(listings_df['combined_features'])

def get_user_preferences(userid: int, db):
    """Get user's favorite genres from database"""
    try:
        query = """
        SELECT g.GenreName
        FROM Preferences p
        JOIN Genres g ON p.GenreID = g.GenreID
        WHERE p.UserID = ?
        """
        
        # Using raw connection for parameterized queries
        conn = db.bind.raw_connection()
        cursor = conn.cursor()
        cursor.execute(query, (userid,))
        results = cursor.fetchall()
        conn.close()
        
        return [row[0] for row in results]  # Return genre names
    except Exception as e:
        logger.error(f"Error getting user preferences: {str(e)}")
        return []

# Updated approach in the code:

def get_preference_based_recommendations(userid: int, db, limit: int = 12):
    """Get listing recommendations based on user's stored preferences"""
    global listings_df
    
    with data_lock:
        if listings_df is None or listings_df.empty:
            return []
        
        # Get user preferences
        user_genres = get_user_preferences(userid, db)
        
        if not user_genres:
            return get_popular_listings(limit)
        
        # Since we don't have Genres column in listings_df yet, 
        # we'll match based on book titles/keywords for now
        # In production, you'd join with BookGenre table
        
        # For demo purposes, let's filter by any listings (improve this later)
        genre_matched_listings = listings_df.copy()
        
        if genre_matched_listings.empty:
            return get_popular_listings(limit)
        
        # Calculate recency score (newer listings = higher score)
        genre_matched_listings['ListingDateParsed'] = pd.to_datetime(
            genre_matched_listings['ListingDate'], errors='coerce'
        )
        genre_matched_listings['recency_score'] = genre_matched_listings['ListingDateParsed'].apply(
            lambda x: 1.0 if pd.isna(x) else max(0.1, 1 - (datetime.now() - x).days / 365)
        )
        
        # Price attractiveness (lower price = higher score)
        price_median = genre_matched_listings['Price'].median()
        if pd.isna(price_median):
            price_median = 15.0  # Default price
            
        genre_matched_listings['price_score'] = genre_matched_listings['Price'].apply(
            lambda x: max(0.1, 1 - abs(x - price_median) / (price_median + 1)) if not pd.isna(x) else 0.5
        )
        
        # Final score: Book quality + Recency + Price attractiveness
        genre_matched_listings['preference_score'] = (
            genre_matched_listings['AverageRating'] * 0.6 +  # Book rating importance
            genre_matched_listings['recency_score'] * 0.3 +   # New listings priority  
            genre_matched_listings['price_score'] * 0.1       # Price consideration
        )
        
        # Sort by preference score and limit results
        recommended_listings = genre_matched_listings.nlargest(limit, 'preference_score')
        
        # Convert to recommendation format
        recommendations = []
        for idx, listing in recommended_listings.iterrows():
            recommendations.append(ListingRecommendation(
                ListingID=int(listing['ListingID']),
                BookID=int(listing['BookID']),
                Title=listing['Title'],
                AuthorName=listing['AuthorName'],
                Price=float(listing['Price']) if not pd.isna(listing['Price']) else None,
                Condition=listing['Condition'],
                Location=listing['Location'],
                SellerName=listing['SellerName'],
                ListingDate=str(listing['ListingDate']),
                AverageRating=float(listing['AverageRating']),
                Description=listing.get('Description', '')[:200] + "..." if listing.get('Description') else "",
                Genres=['Popular'],  # Placeholder - improve with real genres
                ConfidenceScore=float(listing['preference_score']) / 5.0,
                RecommendationReason="Recommended based on popular listings",
                RecommendationType="preference_based"
            ))
        
        return recommendations


def get_popular_listings(limit: int = 12):
    """Get popular listings for users with no preferences"""
    global listings_df
    
    with data_lock:
        if listings_df is None or listings_df.empty:
            return []
        
        # Sort by rating and price (proxy for popularity)
        popular_listings = listings_df.copy()
        popular_listings['popularity_score'] = popular_listings['AverageRating'] * 0.8 + (5.0 - (popular_listings['Price'].fillna(15) / 100)) * 0.2
        popular_listings = popular_listings.nlargest(limit, 'popularity_score')
        
        recommendations = []
        for idx, listing in popular_listings.iterrows():
            recommendations.append(ListingRecommendation(
                ListingID=int(listing['ListingID']),
                BookID=int(listing['BookID']),
                Title=listing['Title'],
                AuthorName=listing['AuthorName'],
                Price=float(listing['Price']) if not pd.isna(listing['Price']) else None,
                Condition=listing['Condition'],
                Location=listing['Location'],
                SellerName=listing['SellerName'],
                ListingDate=str(listing['ListingDate']),
                AverageRating=float(listing['AverageRating']),
                Description=listing.get('Description', '')[:200] + "..." if listing.get('Description') else "",
                Genres=listing['Genres'] if isinstance(listing['Genres'], list) else ['Popular'],
                ConfidenceScore=float(listing['popularity_score']) / 5.0,
                RecommendationReason="Highly rated popular listing",
                RecommendationType="popular"
            ))
        
        return recommendations

def get_featured_listings(limit: int = 8):
    """Get featured listings for homepage"""
    global listings_df
    
    with data_lock:
        if listings_df is None or listings_df.empty:
            return []
        
        # Featured = high rating + recent + good price
        featured_listings = listings_df.copy()
        featured_listings['ListingDateParsed'] = pd.to_datetime(featured_listings['ListingDate'], errors='coerce')
        featured_listings['recency_score'] = featured_listings['ListingDateParsed'].apply(
            lambda x: 1.0 if pd.isna(x) else max(0.1, 1 - (datetime.now() - x).days / 30)
        )
        featured_listings['featured_score'] = (
            featured_listings['AverageRating'] * 0.6 + 
            featured_listings['recency_score'] * 0.3 + 
            (5.0 - (featured_listings['Price'].fillna(15) / 100)) * 0.1
        )
        featured_listings = featured_listings.nlargest(limit, 'featured_score')
        
        recommendations = []
        for idx, listing in featured_listings.iterrows():
            recommendations.append(ListingRecommendation(
                ListingID=int(listing['ListingID']),
                BookID=int(listing['BookID']),
                Title=listing['Title'],
                AuthorName=listing['AuthorName'],
                Price=float(listing['Price']) if not pd.isna(listing['Price']) else None,
                Condition=listing['Condition'],
                Location=listing['Location'],
                SellerName=listing['SellerName'],
                ListingDate=str(listing['ListingDate']),
                AverageRating=float(listing['AverageRating']),
                Description=listing.get('Description', '')[:150] + "..." if listing.get('Description') else "",
                Genres=listing['Genres'] if isinstance(listing['Genres'], list) else ['Featured'],
                ConfidenceScore=float(listing['featured_score']) / 5.0,
                RecommendationReason="Featured selection",
                RecommendationType="featured"
            ))
        
        return recommendations

def get_new_listings(limit: int = 8):
    """Get new listing books"""
    global listings_df
    
    with data_lock:
        if listings_df is None or listings_df.empty:
            return []
        
        # Sort by listing date (most recent first)
        new_listings = listings_df.copy()
        new_listings['ListingDateParsed'] = pd.to_datetime(new_listings['ListingDate'], errors='coerce')
        new_listings = new_listings.dropna(subset=['ListingDateParsed'])
        new_listings = new_listings.nlargest(limit, 'ListingDateParsed')
        
        recommendations = []
        for idx, listing in new_listings.iterrows():
            recommendations.append(ListingRecommendation(
                ListingID=int(listing['ListingID']),
                BookID=int(listing['BookID']),
                Title=listing['Title'],
                AuthorName=listing['AuthorName'],
                Price=float(listing['Price']) if not pd.isna(listing['Price']) else None,
                Condition=listing['Condition'],
                Location=listing['Location'],
                SellerName=listing['SellerName'],
                ListingDate=str(listing['ListingDate']),
                AverageRating=float(listing['AverageRating']),
                Description=listing.get('Description', '')[:150] + "..." if listing.get('Description') else "",
                Genres=listing['Genres'] if isinstance(listing['Genres'], list) else ['New Release'],
                ConfidenceScore=0.9,
                RecommendationReason="Newly listed book",
                RecommendationType="new_release"
            ))
        
        return recommendations

@router.get("/personalized", response_model=RecommendationResponse)
async def get_personalized_recommendations(
    access_token: str = Header(None), 
    limit: int = 12,
    db = Depends(get_db)
):
    """
    Get personalized listing recommendations based on user's stored preferences
    Requires valid access token for authentication
    """
    try:
        # Verify access token and get user ID
        if not verify_access_token(access_token):
            raise HTTPException(status_code=401, detail="Invalid access token")
        
        userid = get_userid_by_access_token(access_token, db)
        if not userid:
            raise HTTPException(status_code=401, detail="User not found")
        
        # Ensure listings are loaded
        if listings_df is None:
            load_listings_from_db(db)
        
        # Get recommendations based on preferences
        recommendations = get_preference_based_recommendations(userid, db, limit)
        
        # Create user profile summary
        user_genres = get_user_preferences(userid, db)
            
        profile_summary = {
            "user_id": userid,
            "favorite_genres": user_genres,
            "recommendation_count": len(recommendations),
            "has_preferences": len(user_genres) > 0
        }
        
        return RecommendationResponse(
            recommendations=recommendations,
            total_found=len(recommendations),
            generated_at=datetime.now().isoformat(),
            user_profile_summary=profile_summary
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating personalized recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Recommendation service error: {str(e)}")

@router.get("/storefront", response_model=StorefrontRecommendations)
async def get_storefront_recommendations(db = Depends(get_db)):
    """
    Get recommendations for storefront display (featured, popular, new listings)
    No authentication required
    """
    try:
        # Ensure listings are loaded
        if listings_df is None:
            load_listings_from_db(db)
        
        featured = get_featured_listings(8)
        popular = get_popular_listings(12)
        new_releases = get_new_listings(8)
        
        return StorefrontRecommendations(
            featured_listings=featured,
            popular_listings=popular,
            new_listings=new_releases
        )
        
    except Exception as e:
        logger.error(f"Error generating storefront recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Recommendation service error: {str(e)}")

@router.get("/popular", response_model=RecommendationResponse)
async def get_popular_recommendations(limit: int = 12, db = Depends(get_db)):
    """
    Get popular listing recommendations
    No authentication required
    """
    try:
        # Ensure listings are loaded
        if listings_df is None:
            load_listings_from_db(db)
        
        recommendations = get_popular_listings(limit)
        
        return RecommendationResponse(
            recommendations=recommendations,
            total_found=len(recommendations),
            generated_at=datetime.now().isoformat(),
            user_profile_summary={"type": "popular", "authenticated": False}
        )
        
    except Exception as e:
        logger.error(f"Error generating popular recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Recommendation service error: {str(e)}")

@router.get("/search")
async def search_listings(query: str, limit: int = 20, db = Depends(get_db)):
    """Search listings by title, author, or description"""
    global listings_df, tfidf, tfidf_matrix
    
    # Ensure listings are loaded
    if listings_df is None:
        load_listings_from_db(db)
    
    if not query or listings_df is None or listings_df.empty:
        return []
    
    with data_lock:
        try:
            # Vectorize query
            query_tfidf = tfidf.transform([query])
            cosine_sim = cosine_similarity(query_tfidf, tfidf_matrix)
            
            # Get top matches
            similarity_scores = cosine_sim[0]
            top_indices = similarity_scores.argsort()[-limit:][::-1]
            
            results = []
            for idx in top_indices:
                if idx < len(listings_df):
                    listing = listings_df.iloc[idx]
                    results.append({
                        "ListingID": int(listing['ListingID']),
                        "BookID": int(listing['BookID']),
                        "Title": listing['Title'],
                        "AuthorName": listing['AuthorName'],
                        "Price": float(listing['Price']) if not pd.isna(listing['Price']) else None,
                        "Condition": listing['Condition'],
                        "Location": listing['Location'],
                        "SellerName": listing['SellerName'],
                        "ListingDate": str(listing['ListingDate']),
                        "AverageRating": float(listing['AverageRating']),
                        "Description": listing.get('Description', '')[:150] + "..." if listing.get('Description') else "",
                        "relevance_score": float(similarity_scores[idx])
                    })
            
            return results
            
        except Exception as e:
            logger.error(f"Error searching listings: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Search service error: {str(e)}")

@router.get("/genres")
async def list_available_genres(db = Depends(get_db)):
    """Get list of all available genres"""
    try:
        query = "SELECT GenreName FROM Genres"
        conn = db.bind.raw_connection()
        genres_df = pd.read_sql(query, conn)
        conn.close()
        
        if genres_df.empty:
            return {"genres": []}
        
        return {"genres": genres_df['GenreName'].tolist()}
        
    except Exception as e:
        logger.error(f"Error getting genres: {str(e)}")
        return {"genres": ["Fiction", "Non-Fiction", "Science Fiction", "Mystery", "Romance"]}

@router.get("/health")
async def health_check(db = Depends(get_db)):
    """Health check endpoint"""
    global listings_df
    
    # Ensure listings are loaded
    if listings_df is None:
        load_listings_from_db(db)
    
    with data_lock:
        listing_count = len(listings_df) if listings_df is not None else 0
    
    return {
        "status": "healthy",
        "listings_loaded": listing_count,
        "authentication_system": "integrated"
    }
