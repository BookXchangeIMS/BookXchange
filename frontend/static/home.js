// Sample book data (in a real app, this would come from a database)
const bookData = [
    {
        id: 101,
        title: "Harry Potter and the Sorcerer's Stone",
        author: "J.K. Rowling",
        price: "$18.25",
        location: "Lisbon, Portugal",
        date: "Posted 1 day ago",
        isFavorite: false,
        imagePath: "../static/resources/harrypotter.png"
    },
    {
        id: 102,
        title: "The Lord of the Rings: The Fellowship of the Ring (First Edition)",
        author: "J.R.R. Tolkien",
        price: "$45.00",
        location: "Lisbon, Portugal",
        date: "Posted 3 days ago",
        isFavorite: true,
        imagePath: "../static/resources/lotr.png"
    },
    {
        id: 103,
        title: "Sapiens: A Brief History of Humankind",
        author: "Yuval Noah Harari",
        price: "$15.00",
        location: "Lisbon, Portugal",
        date: "Posted 1 week ago",
        isFavorite: false,
        imagePath: "../static/resources/sapiens.png"
    },
    {
        id: 1,
        title: "The Great Gatsby",
        author: "F. Scott Fitzgerald",
        price: "$12.99",
        location: "New York, NY",
        date: "Posted 2 days ago",
        isFavorite: false,
        imagePath: "../static/resources/gatsby.jpg"
    },
    {
        id: 2,
        title: "To Kill a Mockingbird",
        author: "Harper Lee",
        price: "$14.50",
        location: "Chicago, IL",
        date: "Posted 1 week ago",
        isFavorite: true,
        imagePath: "../static/resources/mockingbird.png"
    },
    {
        id: 3,
        title: "1984",
        author: "George Orwell",
        price: "$10.99",
        location: "Boston, MA",
        date: "Posted 3 days ago",
        isFavorite: false,
        imagePath: "../static/resources/1984.png"
    }
];

// Initialize the page
document.addEventListener('DOMContentLoaded', function () {
    // Check if api.js is properly loaded
    if (typeof isLoggedIn === 'undefined') {
        console.error('api.js not loaded properly. Token management functions are missing.');
        showError('Authentication system not available. Please refresh the page.');
        return;
    }

    // Require login - redirect to Login if not authenticated
    if (!isLoggedIn()) {
        window.location.href = 'Login.html';
        return;
    }

    // If logged in, proceed to load books
    hideSkeletonAndShowBooks();
});

// Initialize search after components are loaded
document.addEventListener('componentsLoaded', function () {
    // Pass bookData and loadBooks callback to SearchManager
    if (window.SearchManager && typeof SearchManager.init === 'function') {
        SearchManager.init(bookData, loadBooks);
    }
});

// Hide skeleton and show books with animation
function hideSkeletonAndShowBooks() {
    const skeletonGrid = document.getElementById('skeletonGrid');
    const booksGrid = document.getElementById('booksGrid');

    if (skeletonGrid) {
        skeletonGrid.style.display = 'none';
    }

    if (booksGrid) {
        booksGrid.style.display = 'grid';
        loadBooks(bookData);

        // Add stagger animation to cards
        const cards = booksGrid.querySelectorAll('.book-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
                // Remove inline transition after animation completes
                setTimeout(() => {
                    card.style.opacity = '';
                    card.style.transform = '';
                }, 500);
            }, index * 100);
        });
    }
}

// Load books into the grid
function loadBooks(books) {
    const booksGrid = document.getElementById('booksGrid');
    if (!booksGrid) return;

    booksGrid.innerHTML = '';

    if (books.length === 0) {
        booksGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;">No books found.</p>';
        return;
    }

    books.forEach(book => {
        const bookCard = createBookCard(book);
        booksGrid.appendChild(bookCard);
    });
}

// Create a book card element
function createBookCard(book) {
    const card = document.createElement('div');
    card.className = 'book-card';
    card.onclick = () => viewBookDetails(book.id);

    card.innerHTML = `
        <img src="${book.imagePath}" alt="${book.title}" class="book-image" onerror="this.src='../static/resources/placeholder.png'">
        <div class="book-info">
            <div class="book-title">${book.title}</div>
            <div class="book-author">by ${book.author}</div>
            <div class="book-location">${book.location}</div>
            <div class="book-date">${book.date}</div>
            <div class="book-price">${book.price}</div>
            <div class="book-actions">
                <button class="contact-btn" onclick="event.stopPropagation(); contactSeller(${book.id})">
                    Contact Seller
                </button>
                <button class="favorite-btn ${book.isFavorite ? 'active' : ''}"
                    onclick="event.stopPropagation(); toggleFavorite(${book.id})">
                    <i class="fas fa-heart"></i>
                </button>
            </div>
        </div>
    `;

    return card;
}

// Toggle favorite status
function toggleFavorite(bookId) {
    const book = bookData.find(b => b.id === bookId);
    if (book) {
        book.isFavorite = !book.isFavorite;
        loadBooks(bookData);
    }
}

// View book details
function viewBookDetails(bookId) {
    console.log('Viewing details for book ID:', bookId);
    window.location.href = `listing.html?id=${bookId}`;
}

// Contact seller
function contactSeller(bookId) {
    window.location.href = `messages.html?bookId=${bookId}`;
}

// Show error message
function showError(message) {
    const booksGrid = document.getElementById('booksGrid');
    if (booksGrid) {
        booksGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: #c84c3d;">${message}</p>`;
    }
}

// Navigation functions are now handled in include.js
