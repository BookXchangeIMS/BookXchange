// API Configuration
const API_BASE_URL = (typeof ENV !== 'undefined' && ENV.API_BASE_URL) || 'http://localhost:8000';
// Mock data usage removed

// ============================================
// AUTHENTICATION UTILITIES (self-contained)
// ============================================

function getAccessToken() {
    return localStorage.getItem('access-token');
}

function isLoggedIn() {
    return !!getAccessToken();
}

// Mock storage functions removed

/**
 * Fetch listings from backend API
 * @returns {Promise<Array>} List of formatted book listings
 */
async function fetchListingsFromBackend() {
    try {
        const accessToken = getAccessToken();
        if (!accessToken) {
            throw new Error('No access token found. Please login.');
        }

        const response = await fetch(`${API_BASE_URL}/api/get_your_listings`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'access-token': accessToken
            }
        });

        if (response.status === 401) {
            showToast('Session expired. Please login again.', 'error');
            setTimeout(() => window.location.href = '../templates/Login.html', 2000);
            throw new Error('Session expired');
        }

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const listings = await response.json();

        console.log('✅ Fetched listings from backend:', listings);

        // Transform backend data to match frontend format
        return listings.map(listing => {
            // Format authors and genres
            const authors = formatArray(listing.Book.Author);
            const genres = formatArray(listing.Book.Genre);

            // Format price based on listing type
            let price;
            if (listing.Price !== null && listing.Price !== undefined) {
                price = `€${parseFloat(listing.Price).toFixed(2)}`;
            } else {
                // No price - check listing type
                if (listing.ListingType === 'Exchange') {
                    price = 'XChange';
                } else if (listing.ListingType === 'Donation') {
                    price = 'Free';
                } else {
                    price = 'Free';
                }
            }

            return {
                ListingID: listing.ListingID,
                Name: listing.Book.Title,
                Image_Path: `${API_BASE_URL}/api/get_listing_primary_image?listingid=${listing.ListingID}&access_token=${accessToken}`,
                PublicationDate: listing.Book.ReleaseDate,
                Location: listing.Location.Address,
                author: authors,
                price: price,
                condition: listing.BookCondition,
                genres: genres,
                description: listing.Description
            };
        });
    } catch (error) {
        console.error('Failed to fetch listings from backend:', error);
        throw error;
    }
}



// DOM elements
const userBooksGrid = document.getElementById('userBooksGrid');

// Initial load
document.addEventListener('DOMContentLoaded', async function () {
    await loadUserBooks();
});

// Initialize search after components are loaded
document.addEventListener('componentsLoaded', async function () {
    const books = await fetchListingsFromBackend();

    // Convert to format SearchManager expects (with title and author)
    const searchableData = books.map(book => ({
        ...book,
        title: book.Name,
        author: book.author || ''
    }));

    if (window.SearchManager) {
        SearchManager.init(searchableData, displayUserBooks);
    }
});

/**
 * Load user books from backend
 */
async function loadUserBooks() {
    try {
        // Fetch from backend
        const books = await fetchListingsFromBackend();

        displayUserBooks(books);
    } catch (error) {
        console.error('Error loading books:', error);
        showToast('Failed to load listings', 'error');
        // Fallback to empty array
        displayUserBooks([]);
    }
}

/**
 * Display books in grid
 * @param {Array} books - List of book objects to display
 */
function displayUserBooks(books) {
    if (!userBooksGrid) return;

    // Get the add-book-card element (first child)
    const addBookCard = userBooksGrid.querySelector('.add-book-card');

    // Clear grid but keep add-book-card
    userBooksGrid.innerHTML = '';

    // Re-add the add-book-card as first item
    if (addBookCard) {
        userBooksGrid.appendChild(addBookCard);
    } else {
        // If it doesn't exist, create it
        const newAddBookCard = document.createElement('div');
        newAddBookCard.className = 'book-card add-book-card';
        newAddBookCard.onclick = goToAddListing;
        newAddBookCard.innerHTML = `
            <div class="add-book-content">
                <i class="fas fa-plus"></i>
                <p>Add a Book</p>
            </div>
        `;
        userBooksGrid.appendChild(newAddBookCard);
    }

    // Check if there are books to display
    if (books.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            <i class="fas fa-book-open"></i>
            <p>No books found.</p>
            <small>Add your first book to get started!</small>
        `;
        userBooksGrid.appendChild(emptyState);
        return;
    }

    // Add book cards
    books.forEach(book => {
        const bookCard = createAnnouncementCard(book);
        userBooksGrid.appendChild(bookCard);
    });

    // Add stagger animation to cards
    const bookCards = userBooksGrid.querySelectorAll('.book-card:not(.add-book-card)');
    staggeredFadeIn(bookCards, 100);
}

/**
 * Create a book card element for announcements
 * @param {Object} book - Book data object
 * @returns {HTMLElement} wrapper element containing the book card
 */
function createAnnouncementCard(book) {
    return createBookCard(book, {
        showFavoriteButton: false,
        showContactButton: false,
        showEditButton: true,
        onEditClick: editListing
    });
}

/**
 * Navigate to edit listing page
 * @param {number|string} listingId - ID of the listing to edit
 */
function editListing(listingId) {
    console.log('Editing listing:', listingId);
    window.location.href = `editlisting.html?id=${listingId}`;
}

/**
 * Navigate to add listing page
 */
function goToAddListing() {
    console.log('Navigate to add listing page');
    window.location.href = 'addlisting.html';
}
