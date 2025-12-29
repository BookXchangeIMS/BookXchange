// API Configuration
const API_BASE_URL = (typeof ENV !== 'undefined' && ENV.API_BASE_URL) || 'http://localhost:8000';
const USE_MOCK_DATA = false; // Set to false to use backend

// Token Management
function getAccessToken() {
    return localStorage.getItem('access-token');
}

// Helper function to extract year from date string
function extractYear(dateString) {
    if (!dateString) return '';
    // Handle formats like "1902-01-01T00:00:00" or "2024-01-01"
    if (dateString.includes('T')) {
        return dateString.split('T')[0].split('-')[0];
    }
    if (dateString.includes('-')) {
        return dateString.split('-')[0];
    }
    return dateString; // Already just a year
}

// Helper function to format arrays as comma-separated strings
function formatArray(arr) {
    if (!arr) return '';
    if (Array.isArray(arr)) {
        return arr.join(', ');
    }
    return arr;
}

// Initialize books in localStorage on first load (for mock mode only)
function initializeBooksStorage() {
    if (!localStorage.getItem('MOCK_USER_BOOKS')) {
        const defaultBooks = {
            101: {
                ListingID: 101,
                Name: "Harry Potter and the Sorcerer's Stone",
                Image_Path: "../static/resources/harrypotter.png",
                PublicationDate: "1997-06-26",
                Location: "Benfica - Lisboa",
                author: "J.K. Rowling",
                price: "$18.25",
                condition: "Good",
                genres: "Fantasy, Adventure",
                description: "A magical journey begins at Hogwarts!"
            },
            102: {
                ListingID: 102,
                Name: "The Lord of the Rings: The Fellowship of the Ring (First Edition)",
                Image_Path: "../static/resources/lotr.png",
                PublicationDate: "1954-07-29",
                Location: "Benfica - Lisboa",
                author: "J.R.R. Tolkien",
                price: "$45.00",
                condition: "Almost new",
                genres: "Fantasy, Adventure",
                description: "A classic masterpiece!"
            },
            103: {
                ListingID: 103,
                Name: "Sapiens: A Brief History of Humankind",
                Image_Path: "../static/resources/sapiens.png",
                PublicationDate: "2011-09-08",
                Location: "Benfica - Lisboa",
                author: "Yuval Noah Harari",
                price: "$15.00",
                condition: "Good",
                genres: "Non-fiction, History",
                description: "History of humankind."
            }
        };
        localStorage.setItem('MOCK_USER_BOOKS', JSON.stringify(defaultBooks));
    }
}

// Get books from localStorage (mock mode only)
function getBooksFromStorage() {
    const stored = localStorage.getItem('MOCK_USER_BOOKS');
    if (stored) {
        const booksObj = JSON.parse(stored);
        return Object.values(booksObj);
    }
    return [];
}

// Fetch listings from backend
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

// Simple HTML escaping function
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// DOM elements
const userBooksGrid = document.getElementById('userBooksGrid');

// Initial load
document.addEventListener('DOMContentLoaded', async function () {
    await loadUserBooks();
});

// Initialize search after components are loaded
document.addEventListener('componentsLoaded', async function () {
    const books = USE_MOCK_DATA ? getBooksFromStorage() : await fetchListingsFromBackend();

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
 * Load user books from backend or localStorage
 */
async function loadUserBooks() {
    try {
        let books;

        if (USE_MOCK_DATA) {
            // Use localStorage
            books = getBooksFromStorage();
        } else {
            // Fetch from backend
            books = await fetchListingsFromBackend();
        }

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
        const bookCard = createBookCard(book);
        userBooksGrid.appendChild(bookCard);
    });

    // Add stagger animation to cards
    const bookCards = userBooksGrid.querySelectorAll('.book-card:not(.add-book-card)');
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

/**
 * Create a book card element
 */
function createBookCard(book) {
    const card = document.createElement('div');
    card.className = 'book-card';

    const location = book.Location ? escapeHtml(book.Location) : "Unknown Location";
    const price = book.price || "Price not set";

    card.innerHTML = `
        <img src="${escapeHtml(book.Image_Path)}" 
             alt="${escapeHtml(book.Name)}" 
             class="book-image"
             onerror="this.src='../static/resources/harrypotter.png'">
        <div class="book-info">
            <div class="book-title">${escapeHtml(book.Name)}</div>
            <div class="book-location">${location}</div>
            <div class="book-date">${price}</div>
            <button class="edit-btn" onclick="editListing(${book.ListingID})">
                Edit Listing
            </button>
        </div>
    `;

    return card;
}

/**
 * Edit listing
 */
function editListing(listingId) {
    console.log('Editing listing:', listingId);
    window.location.href = `/edit-listing?id=${listingId}`;
}

// Toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
        background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
        color: white; padding: 15px 25px; border-radius: 25px;
        font-weight: 600; z-index: 10000;
        font-family: 'Segoe UI', sans-serif; max-width: 90%;
        text-align: center; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Navigation functions
function goToHome() {
    window.location.href = '/';
}

function goToAnnouncements() {
    window.location.href = '/announcements';
}

function goToFavorites() {
    window.location.href = '/favourites';
}

function goToMessages() {
    window.location.href = '/messages';
}

function goToProfile() {
    window.location.href = '/profile';
}

function goToAddListing() {
    console.log('Navigate to add listing page');
    window.location.href = '/add-listing';
}
