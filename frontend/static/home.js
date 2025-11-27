// Initialize the page
document.addEventListener('DOMContentLoaded', async function () {
    if (typeof isLoggedIn === 'undefined') {
        console.error('api.js not loaded properly. Token management functions are missing.');
        showError('Authentication system not available. Please refresh the page.');
        return;
    }

    if (!isLoggedIn()) {
        window.location.href = 'Login.html';
        return;
    }

    try {
        const books = await getBooks();
        loadBooks(books);
        hideSkeletonAndShowBooks();
    } catch (error) {
        console.error('Failed to load books:', error);
        showError('Failed to load books from server.');
    }
});

// Initialize search after components are loaded
document.addEventListener('componentsLoaded', function () {
    if (window.SearchManager && typeof SearchManager.init === 'function') {
        SearchManager.init([], loadBooks);
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

// Load books into the grid
function loadBooks(books) {
    const booksGrid = document.getElementById('booksGrid');
    if (!booksGrid) return;

    booksGrid.innerHTML = '';

    if (!books || books.length === 0) {
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

// Toggle favorite status (wire to backend later)
function toggleFavorite(bookId) {
    console.log('Toggle favorite for book ID:', bookId);
}

// View book details
function viewBookDetails(bookId) {
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
