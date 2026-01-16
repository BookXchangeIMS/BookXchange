// Require login
/*if (!isLoggedIn()) {
    window.location.href = '../templates/Login.html';
}*/

// State
let allListings = [];
let currentPage = 1;
const PAGE_SIZE = 4; // Set the # of results per page here

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

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        // Remove any existing listeners (clone node trick)
        const newSearchInput = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newSearchInput, searchInput);

        newSearchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => handleSearch(e.target.value), 500);
        });

        // Also handle "Enter" key
        newSearchInput.addEventListener('keypress', (e) => {
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

async function handleSearch(query) {
    const accessToken = getAccessToken();
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
async function loadAllListings() {
    try {
        // Show skeleton loading state
        if (skeletonGrid) skeletonGrid.style.display = 'grid';
        if (booksGrid) booksGrid.style.display = 'none';

        const accessToken = getAccessToken();
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
    window.location.href = `listing?id=${bookId}`;
}
