// Require login
if (!isLoggedIn()) {
    window.location.href = '../templates/Login.html';
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

// Load books into the grid using shared UI components
function loadBooks(books) {
    if (!booksGrid) return;

    displayBooks(books, booksGrid, {
        cardOptions: {
            showFavoriteButton: true,
            showContactButton: true,
            onCardClick: viewListing,
            onFavoriteClick: openRemoveModal,
            onContactClick: viewListing
        },
        emptyState: {
            icon: 'fa-heart-broken',
            message: "You haven't added any favorites yet!",
            subMessage: 'Browse books and click the heart icon to add favorites',
            actionButton: {
                text: 'Browse Books',
                onClick: goToHome
            }
        }
    });
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
    window.location.href = '../templates/home.html';
}
