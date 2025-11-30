// Require login
if (!isLoggedIn()) {
    window.location.href = 'Login.html';
}

// State
let allFavorites = [];

// DOM elements
const booksGrid = document.getElementById('favoritesGrid');

// Initialize the page
document.addEventListener('DOMContentLoaded', function () {
    loadFavorites();
});

// Initialize search after components are loaded
document.addEventListener('componentsLoaded', function () {
    // Pass favorites to SearchManager
    if (window.SearchManager && typeof SearchManager.init === 'function') {
        SearchManager.init(allFavorites, loadBooks);
    }
});

// Load favorites from API
async function loadFavorites() {
    try {
        const accessToken = getAccessToken();
        const apiResponse = await getMyFavorites(accessToken);

        // Transform API response to internal format using centralized function
        allFavorites = apiResponse.map(transformListingData);

        // Load books into grid
        loadBooks(allFavorites);

        // Update SearchManager with new data
        if (window.SearchManager && typeof SearchManager.updateData === 'function') {
            SearchManager.updateData(allFavorites);
        }
    } catch (error) {
        console.error('Error loading favorites:', error);
        showError('Failed to load favorites. Please try again later.');
    }
}

// Load books into the grid
function loadBooks(books) {
    if (!booksGrid) return;

    booksGrid.innerHTML = '';

    if (books.length === 0) {
        booksGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <i class="fas fa-heart-broken" style="font-size: 48px; color: #c84c3d; margin-bottom: 20px;"></i>
                <p style="color: #666; font-size: 18px;">You haven't added any favorites yet!</p>
                <small style="color: #999;">Browse books and click the heart icon to add favorites</small>
                <button onclick="goToHome()" style="margin-top: 20px; padding: 12px 30px; background: #c84c3d; color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600; font-family: 'Segoe UI', sans-serif;">
                    Browse Books
                </button>
            </div>
        `;
        return;
    }

    books.forEach(book => {
        const bookCard = createBookCard(book);
        booksGrid.appendChild(bookCard);
    });

    // Add stagger animation to cards
    const bookCards = booksGrid.querySelectorAll('.book-card');
    bookCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
            // Remove inline styles after animation
            setTimeout(() => {
                card.style.opacity = '';
                card.style.transform = '';
            }, 500);
        }, index * 100);
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
                <button class="favorite-btn active">
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
        viewListing(book.id);
    });

    // Favorite button click (Removal logic)
    favoriteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleRemoveFavorite(book.id);
    });

    // Make card clickable
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.contact-btn') && !e.target.closest('.favorite-btn')) {
            viewListing(book.id);
        }
    });

    return card;
}

// View listing details
function viewListing(bookId) {
    console.log('Viewing details for book ID:', bookId);
    window.location.href = `listing.html?id=${bookId}`;
}

// Remove from favorites
async function handleRemoveFavorite(listingId) {
    if (!confirm('Remove this book from your favorites?')) {
        return;
    }

    try {
        const accessToken = getAccessToken();
        await removeFavorite(listingId, accessToken);

        showToast('Removed from favorites');

        // Remove from local array
        allFavorites = allFavorites.filter(book => book.id !== listingId);

        // Reload books
        loadBooks(allFavorites);

        // Update SearchManager with new data
        if (window.SearchManager && typeof SearchManager.updateData === 'function') {
            SearchManager.updateData(allFavorites);
        }
    } catch (error) {
        console.error('Error removing favorite:', error);
        showToast('Failed to remove from favorites. Please try again.', 'error');
    }
}

// Navigation functions
function goToHome() {
    window.location.href = 'home.html';
}

// Show error message
function showError(message) {
    if (!booksGrid) return;

    booksGrid.innerHTML = `
        <div class="error-state" style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
            <i class="fas fa-exclamation-circle" style="font-size: 48px; color: #c84c3d; margin-bottom: 20px;"></i>
            <p style="color: #666; font-size: 18px;">${message}</p>
            <button onclick="loadFavorites()" style="margin-top: 20px; padding: 12px 30px; background: #c84c3d; color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600; font-family: 'Segoe UI', sans-serif;">
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
