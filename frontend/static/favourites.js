// Require login
if (!isLoggedIn()) {
    window.location.href = 'Login.html';
}

// State
let allFavorites = [];
let listingToRemove = null;

// DOM elements
const booksGrid = document.getElementById('favoritesGrid');
const removeModal = document.getElementById('removeModal');

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
        openRemoveModal(book.id);
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
    window.location.href = `listing.html?id=${bookId}`;
}

// Modal Functions
function openRemoveModal(listingId) {
    listingToRemove = listingId;
    removeModal.classList.add('active');
}

function closeRemoveModal() {
    listingToRemove = null;
    removeModal.classList.remove('active');
}

async function confirmRemoveFavorite() {
    if (!listingToRemove) return;

    try {
        const accessToken = getAccessToken();
        await removeFavorite(listingToRemove, accessToken);

        // Remove from local array
        allFavorites = allFavorites.filter(book => book.id !== listingToRemove);

        // Reload books
        loadBooks(allFavorites);

        // Update SearchManager with new data
        if (window.SearchManager && typeof SearchManager.updateData === 'function') {
            SearchManager.updateData(allFavorites);
        }

        closeRemoveModal();
    } catch (error) {
        console.error('Error removing favorite:', error);
        alert('Failed to remove from favorites. Please try again.');
        closeRemoveModal();
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
