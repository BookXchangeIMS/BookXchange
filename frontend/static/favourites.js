// Sample book data (Copied from the Home page script, maintaining local state)
const ALL_LISTINGS_DATA = [
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

// Filter only favorites
let filteredFavorites = ALL_LISTINGS_DATA.filter(book => book.isFavorite);

// DOM elements
const booksGrid = document.getElementById('favoritesGrid');

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadBooks(filteredFavorites);
});

// Initialize search after components are loaded
document.addEventListener('componentsLoaded', function() {
    // Pass only favorites to SearchManager
    SearchManager.init(filteredFavorites, loadBooks);
});

// Load books into the grid
function loadBooks(books) {
    if (!booksGrid) return;

    booksGrid.innerHTML = '';
    
    if (books.length === 0) {
        booksGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-heart-broken"></i>
                <p>You haven't added any favorites yet!</p>
                <small>Browse books and click the heart icon to add favorites</small>
                <button onclick="goToHome()" style="margin-top: 20px; padding: 12px 30px; background: #c84c3d; color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600; font-family: 'Segoe UI', sans-serif;">
                    Browse Books
                </button>
            </div>
        `;
        return;
    }
    
    books.forEach(book => {
        const bookCard = createBookCard(book);
        booksGrid.appendChild(bookCard);
    });
}

// Create a book card element (EXACTLY MATCHING HOME PAGE HTML STRUCTURE)
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
            <h3 class="book-title">${book.title}</h3>
            <p class="book-author">by ${book.author}</p>
            <p class="book-location">${book.location}</p>
            <p class="book-date">${book.date}</p>
            <p class="book-price">${book.price}</p>
            
            <div class="book-actions">
                <button class="contact-btn">Contact Seller</button>
                <button class="favorite-btn active">
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
        viewListing(book.id);
    });
    
    // Favorite button click (Removal logic)
    favoriteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeFavorite(book.id);
    });
    
    // Make card clickable
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.contact-btn') && !e.target.closest('.favorite-btn')) {
             viewListing(book.id); 
        }
    });
    
    return card;
}

// View listing details
function viewListing(bookId) {
    const book = ALL_LISTINGS_DATA.find(b => b.id === bookId);
    if (book) {
        console.log(`Navigating to listing page for: ${book.title}`);
        window.location.href = `listing.html?id=${bookId}`; 
    }
}

// Remove from favorites
function removeFavorite(bookId) {
    if (!confirm('Remove this book from your favorites?')) {
        return;
    }
    
    const book = ALL_LISTINGS_DATA.find(b => b.id === bookId);
    if (book) {
        book.isFavorite = false;
        showToast('Removed from favorites');
        
        // Update filtered list and reload
        filteredFavorites = ALL_LISTINGS_DATA.filter(b => b.isFavorite);
        loadBooks(filteredFavorites);
        
        // Update SearchManager with new data
        SearchManager.updateData(filteredFavorites);
    }
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

function goToProfile() {
    window.location.href = 'profile.html';
}

function goToMessages() {
    window.location.href = 'messages.html';
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

// Add CSS for animations
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
