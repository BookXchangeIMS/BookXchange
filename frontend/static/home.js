// Require login
if (!isLoggedIn()) {
    window.location.href = 'Login.html';
}

// State
let allListings = [];

// DOM elements
const booksGrid = document.getElementById('booksGrid');
const skeletonGrid = document.getElementById('skeletonGrid');

// Initialize the page
document.addEventListener('DOMContentLoaded', function () {
    loadAllListings();
});

// Initialize search after components are loaded
document.addEventListener('componentsLoaded', function () {
    // Pass all listings to SearchManager
    if (window.SearchManager && typeof SearchManager.init === 'function') {
        SearchManager.init(allListings, loadBooks);
    }
});

// Load all listings from API
async function loadAllListings() {
    try {
        // Show skeleton loading state
        if (skeletonGrid) {
            skeletonGrid.style.display = 'grid';
        }
        if (booksGrid) {
            booksGrid.style.display = 'none';
        }

        const accessToken = getAccessToken();
        const apiResponse = await getAllListings(accessToken);

        // Transform API response to internal format
        allListings = apiResponse.map(transformListingData);

        // Hide skeleton and show books
        hideSkeletonAndShowBooks();

        // Update SearchManager with new data
        if (window.SearchManager && typeof SearchManager.updateData === 'function') {
            SearchManager.updateData(allListings);
        }
    } catch (error) {
        console.error('Error loading listings:', error);
        showError('Failed to load listings. Please try again later.');
    }
}

// Transform API listing data to internal format
function transformListingData(listing) {
    // Format price
    const price = listing.Price ? `€${listing.Price.toFixed(2)}` : 'Free';

    // Format date
    const creationDate = new Date(listing.CreationDate);
    const now = new Date();
    const diffTime = Math.abs(now - creationDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let dateText;
    if (diffDays === 0) {
        dateText = 'Posted today';
    } else if (diffDays === 1) {
        dateText = 'Posted 1 day ago';
    } else if (diffDays < 7) {
        dateText = `Posted ${diffDays} days ago`;
    } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        dateText = weeks === 1 ? 'Posted 1 week ago' : `Posted ${weeks} weeks ago`;
    } else {
        const months = Math.floor(diffDays / 30);
        dateText = months === 1 ? 'Posted 1 month ago' : `Posted ${months} months ago`;
    }

    // Get first author if multiple
    const author = Array.isArray(listing.Book.Author) && listing.Book.Author.length > 0
        ? listing.Book.Author[0]
        : listing.Book.Author || 'Unknown Author';

    // Image path - use listing image endpoint with access token
    const accessToken = getAccessToken();
    const imagePath = `http://localhost:8000/api/get_listing_primary_image?listingid=${listing.ListingID}&access_token=${accessToken}`;

    return {
        id: listing.ListingID,
        title: listing.Book.Title || 'Untitled',
        author: author,
        price: price,
        location: listing.Location.Address || 'Location not specified',
        date: dateText,
        isFavorite: listing.IsFavorite || false,
        imagePath: imagePath,
        description: listing.Description,
        condition: listing.BookCondition,
        status: listing.Status,
        sellerId: listing.User.UserID,
        sellerName: listing.User.Name
    };
}

// Hide skeleton and show books with animation
function hideSkeletonAndShowBooks() {
    if (skeletonGrid) {
        skeletonGrid.style.display = 'none';
    }

    if (booksGrid) {
        booksGrid.style.display = 'grid';
        loadBooks(allListings);

        // Add stagger animation to cards
        const cards = booksGrid.querySelectorAll('.book-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
                // Remove inline transition after animation completes
                setTimeout(() => {
                    card.style.opacity = '';
                    card.style.transform = '';
                }, 500);
            }, index * 100);
        });
    }
}

// Load books into the grid
function loadBooks(books) {
    if (!booksGrid) return;

    booksGrid.innerHTML = '';

    if (books.length === 0) {
        booksGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <i class="fas fa-book-open" style="font-size: 48px; color: #c84c3d; margin-bottom: 20px;"></i>
                <p style="color: #666; font-size: 18px;">No books available at the moment.</p>
                <small style="color: #999;">Check back later for new listings!</small>
            </div>
        `;
        return;
    }

    books.forEach(book => {
        const bookCard = createBookCard(book);
        booksGrid.appendChild(bookCard);
    });
}

// Create a book card element
function createBookCard(book) {
    const card = document.createElement('div');
    card.className = 'book-card';

    card.innerHTML = `
        <img src="${book.imagePath}" 
             alt="${book.title}" 
             class="book-image" 
             onerror="this.src='../static/resources/placeholder.jpg'"
             loading="lazy">
        <div class="book-info">
            <div class="book-title">${book.title}</div>
            <div class="book-author">by ${book.author}</div>
            <div class="book-location">${book.location}</div>
            <div class="book-date">${book.date}</div>
            <div class="book-price">${book.price}</div>
            <div class="book-actions">
                <button class="contact-btn">
                    Contact Seller
                </button>
                <button class="favorite-btn ${book.isFavorite ? 'active' : ''}">
                    <i class="fas fa-heart"></i>
                </button>
            </div>
        </div>
    `;

    // Setup event listeners
    const contactBtn = card.querySelector('.contact-btn');
    const favoriteBtn = card.querySelector('.favorite-btn');

    // Contact button click
    contactBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        viewBookDetails(book.id);
    });

    // Favorite button click
    favoriteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(book.id);
    });

    // Make card clickable
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.contact-btn') && !e.target.closest('.favorite-btn')) {
            viewBookDetails(book.id);
        }
    });

    return card;
}

// Toggle favorite status
async function toggleFavorite(listingId) {
    const book = allListings.find(b => b.id === listingId);
    if (!book) return;

    try {
        const accessToken = getAccessToken();

        if (book.isFavorite) {
            // Remove from favorites
            await removeFavorite(listingId, accessToken);
            book.isFavorite = false;
            showToast('Removed from favorites');
        } else {
            // Add to favorites
            await addFavorite(listingId, accessToken);
            book.isFavorite = true;
            showToast('Added to favorites');
        }

        // Reload books to update UI
        loadBooks(allListings);

        // Update SearchManager
        if (window.SearchManager && typeof SearchManager.updateData === 'function') {
            SearchManager.updateData(allListings);
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
        showToast('Failed to update favorite. Please try again.', 'error');
    }
}

// View book details
function viewBookDetails(bookId) {
    console.log('Viewing details for book ID:', bookId);
    window.location.href = `listing.html?id=${bookId}`;
}

// Show error message
function showError(message) {
    if (skeletonGrid) {
        skeletonGrid.style.display = 'none';
    }

    if (!booksGrid) return;

    booksGrid.style.display = 'grid';
    booksGrid.innerHTML = `
        <div class="error-state" style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
            <i class="fas fa-exclamation-circle" style="font-size: 48px; color: #c84c3d; margin-bottom: 20px;"></i>
            <p style="color: #666; font-size: 18px;">${message}</p>
            <button onclick="loadAllListings()" style="margin-top: 20px; padding: 12px 30px; background: #c84c3d; color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600; font-family: 'Segoe UI', sans-serif;">
                Try Again
            </button>
        </div>
    `;
}

// Toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#27ae60' : '#c84c3d'};
        color: white;
        padding: 15px 25px;
        border-radius: 25px;
        font-weight: 600;
        z-index: 10000;
        animation: slideUp 0.3s ease;
        font-family: 'Segoe UI', sans-serif;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideDown 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from {
            transform: translate(-50%, 20px);
            opacity: 0;
        }
        to {
            transform: translate(-50%, 0);
            opacity: 1;
        }
    }
    
    @keyframes slideDown {
        from {
            transform: translate(-50%, 0);
            opacity: 1;
        }
        to {
            transform: translate(-50%, 20px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
