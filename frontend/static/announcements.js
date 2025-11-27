// Initialize books in localStorage on first load
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
                description: "A magical journey begins at Hogwarts! Follow Harry Potter as he discovers his true identity and battles the forces of darkness."
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
                description: "A classic masterpiece by J.R.R. Tolkien! This book will take you on an unforgettable journey through Middle-earth."
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
                description: "Explore the history of humankind from the Stone Age to the modern era in this thought-provoking book."
            }
        };
        localStorage.setItem('MOCK_USER_BOOKS', JSON.stringify(defaultBooks));
    }
}

// Get books from localStorage
function getBooksFromStorage() {
    const stored = localStorage.getItem('MOCK_USER_BOOKS');
    if (stored) {
        const booksObj = JSON.parse(stored);
        // Convert object to array
        return Object.values(booksObj);
    }
    return [];
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

// Initialize storage and get books
initializeBooksStorage();

// DOM elements
const userBooksGrid = document.getElementById('userBooksGrid');

// Initial load
document.addEventListener('DOMContentLoaded', function () {
    loadUserBooks();
});

// Initialize search after components are loaded
document.addEventListener('componentsLoaded', function() {
    // Convert to format SearchManager expects (with title and author)
    const books = getBooksFromStorage();
    const searchableData = books.map(book => ({
        ...book,
        title: book.Name,
        author: book.author || ''
    }));
    
    SearchManager.init(searchableData, displayUserBooks);
});

/**
 * Load user books from localStorage
 */
function loadUserBooks() {
    const books = getBooksFromStorage();
    displayUserBooks(books);
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
 * Edit listing
 */
function editListing(listingId) {
    console.log('Editing listing:', listingId);
    window.location.href = `editlisting.html?id=${listingId}`;
}

// Navigation functions
function goToHome() {
    window.location.href = 'home.html';
}

function goToAnnouncements() {
    window.location.href = 'announcements.html';
}

function goToFavorites() {
    window.location.href = 'favourites.html';
}

function goToMessages() {
    window.location.href = 'messages.html';
}

function goToProfile() {
    window.location.href = 'profile.html';
}

function goToAddListing() {
    console.log('Navigate to add listing page');
    window.location.href = 'addlisting.html';
}
