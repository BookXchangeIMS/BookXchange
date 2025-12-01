// Require login
if (!isLoggedIn()) {
    window.location.href = '/login';
}

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

// ---- PAGINATION LOGIC ----
function loadBooks(books) {
    if (!booksGrid) return;
    booksGrid.innerHTML = '';

    // Pagination
    const totalPages = Math.ceil(books.length / PAGE_SIZE) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pageBooks = books.slice(start, end);

    if (pageBooks.length === 0) {
        booksGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <i class="fas fa-book-open" style="font-size: 48px; color: #c84c3d; margin-bottom: 20px;"></i>
                <p style="color: #666; font-size: 18px;">No books available at the moment.</p>
                <small style="color: #999;">Check back later for new listings!</small>
            </div>
        `;
    } else {
        pageBooks.forEach(book => {
            const bookCard = createBookCard(book);
            booksGrid.appendChild(bookCard);
        });
    }

    renderPaginationControls(totalPages);
}

function renderPaginationControls(totalPages) {
    const container = document.getElementById('paginationControls');
    if (!container) return;
    container.innerHTML = '';

    if (totalPages < 2) return;

    // Prev
    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Previous';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => { currentPage--; loadBooks(allListings); };
    container.appendChild(prevBtn);

    // Page numbers (up to 5, with ... for gaps)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    if (currentPage === 1) endPage = Math.min(totalPages, 5);
    if (currentPage === totalPages) startPage = Math.max(1, totalPages - 4);

    if (startPage > 1) {
        container.appendChild(makePageButton(1));
        if (startPage > 2) {
            container.appendChild(document.createTextNode('...'));
        }
    }
    for (let i = startPage; i <= endPage; i++) {
        container.appendChild(makePageButton(i));
    }
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            container.appendChild(document.createTextNode('...'));
        }
        container.appendChild(makePageButton(totalPages));
    }

    // Next
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => { currentPage++; loadBooks(allListings); };
    container.appendChild(nextBtn);

    // Quick styling
    container.querySelectorAll('button').forEach(btn => {
        btn.style.margin = '0 5px';
        btn.style.padding = '6px 12px';
        btn.style.borderRadius = '7px';
        btn.style.border = 'none';
        btn.style.background = '#c84c3d';
        btn.style.color = '#fff';
        btn.style.fontWeight = '600';
        btn.style.cursor = btn.disabled ? 'not-allowed' : 'pointer';
    });
}

function makePageButton(pageNum) {
    const btn = document.createElement('button');
    btn.textContent = pageNum;
    btn.disabled = currentPage === pageNum;
    btn.onclick = () => { currentPage = pageNum; loadBooks(allListings); };
    if (btn.disabled) btn.style.background = '#d6d6d6';
    return btn;
}
// ---- End pagination logic ----

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
    window.location.href = `listing?id=${bookId}`;
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

// Add CSS for toast animations
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
