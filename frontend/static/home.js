// Guest browsing allowed - users can view home page without login
// Authentication will be checked when trying to interact with listings
const urlParams = new URLSearchParams(window.location.search);
const hasOAuthTokens = urlParams.has('access_token') && urlParams.has('refresh_token');

// Only redirect to login if explicitly required (not for guest browsing)
// Individual interactions will prompt login when needed

// State
let allListings = [];
let currentPage = 1;
const PAGE_SIZE = 12; // Set the # of results per page here

// DOM elements
const booksGrid = document.getElementById('booksGrid');
const skeletonGrid = document.getElementById('skeletonGrid');

// Initialize the page
document.addEventListener('DOMContentLoaded', function () {
    loadAllListings();
});

// Initialize search after components are loaded
document.addEventListener('componentsLoaded', function () {
    setupSearch();
    setupFilters();
});

let searchTimeout;

/**
 * Setup search input listeners with debounce
 */
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        // Remove any existing listeners (clone node trick)
        const newSearchInput = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newSearchInput, searchInput);

        // Add login check on focus for guest users
        newSearchInput.addEventListener('focus', (e) => {
            if (!isLoggedIn()) {
                e.target.blur(); // Remove focus
                if (confirm('You need to log in to search for books. Would you like to log in now?')) {
                    window.location.href = '../templates/Login.html';
                }
                return;
            }
        });

        newSearchInput.addEventListener('input', (e) => {
            if (!isLoggedIn()) {
                if (confirm('You need to log in to search for books. Would you like to log in now?')) {
                    window.location.href = '../templates/Login.html';
                }
                return;
            }
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => handleSearch(e.target.value), 500);
        });

        // Also handle "Enter" key
        newSearchInput.addEventListener('keypress', (e) => {
            if (!isLoggedIn()) {
                if (confirm('You need to log in to search for books. Would you like to log in now?')) {
                    window.location.href = '../templates/Login.html';
                }
                return;
            }
            if (e.key === 'Enter') {
                clearTimeout(searchTimeout);
                handleSearch(e.target.value);
            }
        });
    }
}

let filterMap;
let filterMarker;
let selectedLat = null;
let selectedLon = null;
let selectedRadius = 10;

/**
 * Initialize and setup filter modal and controls
 */
function setupFilters() {
    const filterBtn = document.getElementById('filterBtn');
    const filterModal = document.getElementById('filterModal');
    const closeFilterBtn = document.getElementById('closeFilterBtn');
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    const radiusSlider = document.getElementById('radiusSlider');
    const radiusValue = document.getElementById('radiusValue');

    if (filterBtn && filterModal) {
        // Show filter button on home page
        filterBtn.style.display = 'flex';

        // Open Modal
        filterBtn.addEventListener('click', () => {
            // Check if user is logged in before opening filter modal
            if (!isLoggedIn()) {
                if (confirm('You need to log in to use filters. Would you like to log in now?')) {
                    window.location.href = '../templates/Login.html';
                }
                return;
            }
            filterModal.classList.add('active');
            // Initialize map after modal is visible to ensure correct rendering
            setTimeout(initFilterMap, 100);
        });

        // Close Modal
        if (closeFilterBtn) {
            closeFilterBtn.addEventListener('click', () => {
                filterModal.classList.remove('active');
            });
        }

        // Close on outside click
        filterModal.addEventListener('click', (e) => {
            if (e.target === filterModal) {
                filterModal.classList.remove('active');
            }
        });

        // Radius Slider
        if (radiusSlider && radiusValue) {
            radiusSlider.addEventListener('input', (e) => {
                selectedRadius = e.target.value;
                radiusValue.textContent = selectedRadius;
                if (filterMarker) {
                    // Optional: update circle radius if added
                }
            });
        }

        // Apply Filters
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => {
                const searchInput = document.getElementById('searchInput');
                const query = searchInput ? searchInput.value : '';

                handleSearch(query);
                filterModal.classList.remove('active');
            });
        }

        // Reset Filters
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', () => {
                // Clear all inputs
                document.querySelectorAll('.genre-checkbox').forEach(cb => cb.checked = false);
                document.querySelectorAll('.type-checkbox').forEach(cb => cb.checked = false);
                document.getElementById('minPrice').value = '';
                document.getElementById('maxPrice').value = '';

                // Reset Map
                if (filterMarker) {
                    filterMap.removeLayer(filterMarker);
                    filterMarker = null;
                }
                selectedLat = null;
                selectedLon = null;
                selectedRadius = 10;
                if (radiusSlider) radiusSlider.value = 10;
                if (radiusValue) radiusValue.textContent = 10;

                // Search without filters
                const searchInput = document.getElementById('searchInput');
                const query = searchInput ? searchInput.value : '';
                handleSearch(query);
            });
        }
    }
}

/**
 * Initialize the Leaflet map for location filtering
 */
function initFilterMap() {
    if (filterMap) {
        filterMap.invalidateSize();
        return;
    }

    // Default to Lisbon
    filterMap = L.map('filterMap').setView([38.7223, -9.1393], 11);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(filterMap);

    filterMap.on('click', function (e) {
        selectedLat = e.latlng.lat;
        selectedLon = e.latlng.lng;

        if (filterMarker) {
            filterMap.removeLayer(filterMarker);
        }

        filterMarker = L.marker([selectedLat, selectedLon]).addTo(filterMap);
    });
}

/**
 * Collect current filter values from UI
 * @returns {Object} Filter object containing genres, price range, types, and location
 */
function getFilterValues() {
    const filters = {
        genres: [],
        minPrice: document.getElementById('minPrice')?.value || null,
        maxPrice: document.getElementById('maxPrice')?.value || null,
        listingTypes: [],
        lat: selectedLat,
        lon: selectedLon,
        radius: selectedRadius
    };

    // Collect Genres
    document.querySelectorAll('.genre-checkbox:checked').forEach(cb => {
        filters.genres.push(cb.value);
    });

    // Collect Types
    document.querySelectorAll('.type-checkbox:checked').forEach(cb => {
        filters.listingTypes.push(cb.value);
    });

    return filters;
}

/**
 * Handle search execution with current filters
 * @param {string} query - Search query string
 */
async function handleSearch(query) {
    // Get access token if logged in, otherwise null for guest browsing
    const accessToken = isLoggedIn() ? getAccessToken() : null;
    try {
        const filters = getFilterValues();

        // If query is empty and no filters, load all
        if (!query.trim() && !filters.genres.length && !filters.minPrice && !filters.maxPrice && !filters.listingTypes.length && filters.lat === null) {
            loadAllListings();
            return;
        }

        // Show skeleton while searching
        if (skeletonGrid) skeletonGrid.style.display = 'grid';
        if (booksGrid) booksGrid.style.display = 'none';

        const results = await searchListings(query, filters, accessToken);
        allListings = results.map(transformListingData);
        currentPage = 1; // Reset to page 1 on search/filter
        hideSkeletonAndShowBooks();

    } catch (error) {
        console.error('Search error:', error);
        showError('Failed to search listings.');
    }
}

// Load all listings from API
/**
 * Load all listings from API and render them
 */
async function loadAllListings() {
    try {
        // Show skeleton loading state
        if (skeletonGrid) skeletonGrid.style.display = 'grid';
        if (booksGrid) booksGrid.style.display = 'none';

        // Get access token if logged in, otherwise null for guest browsing
        const accessToken = isLoggedIn() ? getAccessToken() : null;
        const apiResponse = await getAllListings(accessToken);

        // Transform API response to internal format using centralized function
        allListings = apiResponse.map(transformListingData);

        currentPage = 1; // Reset to page 1
        hideSkeletonAndShowBooks();

    } catch (error) {
        console.error('Error loading listings:', error);
        showError('Failed to load listings. Please try again later.');
    }
}

// Hide skeleton and show books with animation
/**
 * Transition from skeleton loader to actual book grid
 */
function hideSkeletonAndShowBooks() {
    if (skeletonGrid) skeletonGrid.style.display = 'none';

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
                setTimeout(() => {
                    card.style.opacity = '';
                    card.style.transform = '';
                }, 500);
            }, index * 100);
        });
    }
}

// Load books with pagination using shared UI components
/**
 * Render books grid with pagination
 * @param {Array} books - Array of book objects to display
 */
function loadBooks(books) {
    if (!booksGrid) return;

    displayBooks(books, booksGrid, {
        currentPage: currentPage,
        pageSize: PAGE_SIZE,
        onPageChange: (page) => {
            currentPage = page;
            loadBooks(allListings);
        },
        cardOptions: {
            showFavoriteButton: true,
            showContactButton: true,
            onCardClick: viewBookDetails,
            onFavoriteClick: toggleFavorite,
            onContactClick: viewBookDetails
        },
        emptyState: {
            icon: 'fa-book-open',
            message: 'No books available at the moment.',
            subMessage: 'Check back later for new listings!'
        }
    });
}

// Toggle favorite status
/**
 * Toggle favorite status for a listing
 * @param {number|string} listingId - ID of the listing to toggle
 */
async function toggleFavorite(listingId) {
    // Check if user is logged in
    if (!isLoggedIn()) {
        if (confirm('You need to log in to add favorites. Would you like to log in now?')) {
            window.location.href = '../templates/Login.html';
        }
        return;
    }

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
/**
 * Navigate to book details page
 * @param {number|string} bookId - ID of the book listing
 */
function viewBookDetails(bookId) {
    // Check if user is logged in
    if (!isLoggedIn()) {
        if (confirm('You need to log in to view listing details. Would you like to log in now?')) {
            window.location.href = '../templates/Login.html';
        }
        return;
    }

    console.log('Viewing details for book ID:', bookId);
    window.location.href = `listing?id=${bookId}`;
}
