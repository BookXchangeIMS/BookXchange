// Mock Data (replaces API calls)
const MOCK_USER_BOOKS_DATA = [
    {
        ListingID: 101,
        Name: "Harry Potter and the Sorcerer's Stone",
        Image_Path: "../static/resources/harrypotter.png",
        PublicationDate: "1997-06-26",
        Location: "Benfica - Lisboa"
    },
    {
        ListingID: 102,
        Name: "The Lord of the Rings: The Fellowship of the Ring (First Edition)",
        Image_Path: "../static/resources/lotr.png",
        PublicationDate: "1954-07-29",
        Location: "Benfica - Lisboa"
    },
    {
        ListingID: 103,
        Name: "Sapiens: A Brief History of Humankind",
        Image_Path: "../static/resources/sapiens.png",
        PublicationDate: "2011-09-08",
        Location: "Benfica - Lisboa"
    }
];

// Require login
if (!isLoggedIn()) {
    window.location.href = 'Login.html';
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
document.addEventListener('DOMContentLoaded', function () {
    loadUserBooks();
});

// Initialize search after components are loaded
document.addEventListener('componentsLoaded', function () {
    // Convert to format SearchManager expects (with title and author)
    const searchableData = MOCK_USER_BOOKS_DATA.map(book => ({
        ...book,
        title: book.Name,
        author: '' // Announcements don't have author, so search only by title
    }));

    SearchManager.init(searchableData, displayUserBooks);
});

/**
 * Load user books from mock data
 */
function loadUserBooks() {
    displayUserBooks(MOCK_USER_BOOKS_DATA);
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
        newAddBookCard.onclick = goToHome;
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

    // Add stagger animation to cards (excluding add-book-card)
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

    const location = book.Location ? escapeHtml(book.Location) : "Benfica - Lisboa";

    card.innerHTML = `
        <img src="${escapeHtml(book.Image_Path)}" 
             alt="${escapeHtml(book.Name)}" 
             class="book-image"
             onerror="this.src='../static/resources/placeholder.png'">
        <div class="book-info">
            <div class="book-title">${escapeHtml(book.Name)}</div>
            <div class="book-location">${location}</div>
            <div class="book-date">${escapeHtml(book.PublicationDate)}</div>
            <button class="edit-btn" onclick="editListing(${book.ListingID})">
                Edit Listing
            </button>
        </div>
    `;

    return card;
}

/**
 * Edit listing (placeholder)
 */
function editListing(listingId) {
    console.log('Editing listing:', listingId);
    // TODO: Navigate to edit page
    // window.location.href = `edit-listing.html?id=${listingId}`;
}

function goToAddListing() {
    console.log('Navigate to add listing page');
    // TODO: Navigate to add listing page
    // window.location.href = 'add-listing.html';
}
