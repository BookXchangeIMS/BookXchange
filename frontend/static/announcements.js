// Mock Data (replaces API calls)
const MOCK_USER_BOOKS_DATA = [
    {
        ListingID: 101,
        Name: "Harry Potter and the Sorcerer's Stone",
        Image_Path: "../static/resources/harry_potter.jpg",
        PublicationDate: "1997-06-26",
        Location: "Benfica - Lisboa"
    },
    {
        ListingID: 102,
        Name: "The Lord of the Rings: The Fellowship of the Ring (First Edition)",
        Image_Path: "../static/resources/lotr.jpg",
        PublicationDate: "1954-07-29",
        Location: "Benfica - Lisboa"
    },
    {
        ListingID: 103,
        Name: "Sapiens: A Brief History of Humankind",
        Image_Path: "../static/resources/sapiens.jpg",
        PublicationDate: "2011-09-08",
        Location: "Benfica - Lisboa"
    }
];

// Simple HTML escaping function (needed for createBookCard)
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
const searchInput = document.getElementById('searchInput');

// Initial load
document.addEventListener('DOMContentLoaded', function () {
    loadUserBooks();

    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
});

/**
 * 📚 Load user books from mock data (API removed)
 */
function loadUserBooks() {
    // Simulate loading data locally
    const books = MOCK_USER_BOOKS_DATA;
    displayUserBooks(books);
}

/**
 * 🖼️ Display books
 */
function displayUserBooks(books) {
    if (!userBooksGrid) return;

    userBooksGrid.innerHTML = '';

    if (books.length === 0) {
        userBooksGrid.innerHTML =
            '<p style="text-align:center;color:#666;">No books found.</p>';
        return;
    }

    books.forEach(book => {
        const bookCard = createBookCard(book);
        userBooksGrid.appendChild(bookCard);
    });
}

/**
 * 🏷️ Create a book card
 */
function createBookCard(book) {
    const card = document.createElement('div');
    card.className = 'book-card';

    // Note: Since location is hardcoded in the original, we keep it that way here.
    const location = book.Location ? escapeHtml(book.Location) : "Benfica - Lisboa";

    card.innerHTML = `
        <img src="${book.Image_Path}"
             alt="${escapeHtml(book.Name)}"
             class="book-image"
             onerror="this.src='../static/resources/placeholder.jpg'">

        <div class="book-info">
            <h3 class="book-title">${escapeHtml(book.Name)}</h3>
            <p class="book-location">${location}</p>
            <p class="book-date">${escapeHtml(book.PublicationDate)}</p>

            <button class="edit-btn" onclick="goToEditListing(${book.ListingID})">
                Edit
            </button>
        </div>
    `;

    return card;
}

/**
 * 🔍 Handle search using mock data
 */
function handleSearch() {
    const term = searchInput.value.trim().toLowerCase();

    // Filter mock data locally based on the search term
    const filteredBooks = MOCK_USER_BOOKS_DATA.filter(book =>
        book.Name.toLowerCase().includes(term)
    );

    displayUserBooks(filteredBooks);
    console.log(`Search for "${term}" completed locally.`);
}

// --- Navigation (Unchanged) ---

function goToEditListing(id) {
    window.location.href = `editlisting.html?id=${id}`;
}

function goToAddListing() {
    window.location.href = 'addlisting.html';
}

function goToHome() {
    window.location.href = 'home.html';
}

function goToAnnouncements() {
    window.location.href = 'announcements.html';
}

function goToFavorites() {
    window.location.href = 'favourites.html';
}

function goToProfile() {
    window.location.href = 'profile.html';
}

function goToMessages() {
    window.location.href = "messages.html";
}