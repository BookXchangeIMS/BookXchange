// Initialize the page
document.addEventListener('DOMContentLoaded', function () {
    loadRecommendations();
});

// Initialize search after components are loaded
document.addEventListener('componentsLoaded', function () {
    // Search functionality will be handled separately
    if (window.SearchManager && typeof SearchManager.init === 'function') {
        // We'll initialize search with empty data for now
        SearchManager.init([], loadBooks);
    }
});

// Load recommendations from API
async function loadRecommendations() {
    const booksGrid = document.getElementById('booksGrid');
    if (!booksGrid) return;

    try {
        // Show loading state
        booksGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;">Loading recommendations...</p>';

        // Get access token from localStorage or cookies
        const accessToken = localStorage.getItem('access_token') || getCookie('access_token');
        
        let recommendations;
        
        if (accessToken) {
            // Try to get personalized recommendations
            try {
                const response = await fetch('/api/recommendations/personalized', {
                    headers: {
                        'access_token': accessToken
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    recommendations = data.recommendations;
                } else if (response.status === 401) {
                    // Token expired, try storefront recommendations
                    throw new Error('Unauthorized');
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
            } catch (authError) {
                console.log('Failed to get personalized recommendations, falling back to storefront');
                // Fallback to storefront recommendations
                const storefrontResponse = await fetch('/api/recommendations/storefront');
                if (storefrontResponse.ok) {
                    const storefrontData = await storefrontResponse.json();
                    // Combine all storefront recommendations
                    recommendations = [
                        ...storefrontData.featured_books,
                        ...storefrontData.popular_books,
                        ...storefrontData.new_releases
                    ].slice(0, 20); // Limit to 20 books
                } else {
                    throw new Error('Failed to load recommendations');
                }
            }
        } else {
            // No auth token, get storefront recommendations
            const response = await fetch('/api/recommendations/storefront');
            if (response.ok) {
                const data = await response.json();
                // Combine all storefront recommendations
                recommendations = [
                    ...data.featured_books,
                    ...data.popular_books,
                    ...data.new_releases
                ].slice(0, 20); // Limit to 20 books
            } else {
                throw new Error('Failed to load recommendations');
            }
        }

        if (recommendations && recommendations.length > 0) {
            loadBooks(recommendations);
        } else {
            showError('No recommendations available.');
        }

    } catch (error) {
        console.error('Error loading recommendations:', error);
        showError('Failed to load recommendations. Please try again later.');
    }
}

// Load books into the grid
function loadBooks(books) {
    const booksGrid = document.getElementById('booksGrid');
    if (!booksGrid) return;

    booksGrid.innerHTML = '';

    if (books.length === 0) {
        booksGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;">No books found.</p>';
        return;
    }

    books.forEach(book => {
        const bookCard = createBookCard(book);
        booksGrid.appendChild(bookCard);
    });
}

// Create a book card element from recommendation data
function createBookCard(book) {
    const card = document.createElement('div');
    card.className = 'book-card';
    
    // Use BookID for viewing details
    card.onclick = () => viewBookDetails(book.BookID || book.bookId);

    // Format date for display
    const displayDate = formatBookDate(book.ReleaseDate || book.releaseDate);
    
    // Create placeholder image path or use a default
    const imagePath = book.ImagePath || book.imagePath || '../static/resources/placeholder.png';

    card.innerHTML = `
        <img src="${imagePath}" alt="${book.Title || book.title}" class="book-image" onerror="this.src='../static/resources/placeholder.png'">
        <div class="book-info">
            <div class="book-title">${book.Title || book.title}</div>
            <div class="book-author">by ${book.AuthorName || book.authorName || 'Unknown Author'}</div>
            <div class="book-location">${book.Language || book.language || 'Unknown Language'}</div>
            <div class="book-date">${displayDate}</div>
            <div class="book-price">${formatPrice(book.Price || book.price)}</div>
            <div class="book-actions">
                <button class="contact-btn" onclick="event.stopPropagation(); contactSeller(${book.BookID || book.bookId})">
                    Contact Seller
                </button>
                <button class="favorite-btn" onclick="event.stopPropagation(); toggleFavorite(${book.BookID || book.bookId})">
                    <i class="fas fa-heart"></i>
                </button>
            </div>
        </div>
    `;

    return card;
}

// Format book date for display
function formatBookDate(dateString) {
    if (!dateString) return 'Recently added';
    
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return 'Posted today';
        if (diffDays < 7) return `Posted ${diffDays} days ago`;
        if (diffDays < 30) return `Posted ${Math.ceil(diffDays / 7)} weeks ago`;
        return `Posted on ${date.toLocaleDateString()}`;
    } catch (error) {
        return 'Recently added';
    }
}

// Format price for display
function formatPrice(price) {
    if (price === null || price === undefined) return 'Price not set';
    if (typeof price === 'string') return price;
    return `$${parseFloat(price).toFixed(2)}`;
}

// Get cookie value by name
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// Toggle favorite status (you'll need to implement the actual API call)
function toggleFavorite(bookId) {
    // This is a placeholder - you'll need to implement actual favorite functionality
    console.log('Toggling favorite for book ID:', bookId);
    
    // Find the button and toggle visual state
    const card = event.currentTarget.closest('.book-card');
    const favoriteBtn = card.querySelector('.favorite-btn');
    favoriteBtn.classList.toggle('active');
    
    // Here you would make an API call to actually save the favorite
    // fetch('/api/favorites/toggle', {
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/json',
    //         'access_token': localStorage.getItem('access_token')
    //     },
    //     body: JSON.stringify({ bookId: bookId })
    // });
}

// View book details
function viewBookDetails(bookId) {
    console.log('Viewing details for book ID:', bookId);
    window.location.href = `listing.html?id=${bookId}`;
}

// Contact seller
function contactSeller(bookId) {
    // You might want to redirect to messages or open a contact modal
    window.location.href = `messages.html?bookId=${bookId}`;
}

// Show error message
function showError(message) {
    const booksGrid = document.getElementById('booksGrid');
    if (booksGrid) {
        booksGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: #c84c3d;">${message}</p>`;
    }
}

// Search functionality (placeholder - you can enhance this)
async function searchBooks(query) {
    if (!query.trim()) {
        loadRecommendations(); // Reload recommendations
        return;
    }
    
    try {
        const response = await fetch(`/api/recommendations/search?query=${encodeURIComponent(query)}`);
        if (response.ok) {
            const results = await response.json();
            loadBooks(results);
        } else {
            showError('Search failed. Please try again.');
        }
    } catch (error) {
        console.error('Search error:', error);
        showError('Search failed. Please try again.');
    }
}

// Expose search function globally for use by search components
window.searchBooks = searchBooks;

// Navigation functions are now handled in include.js