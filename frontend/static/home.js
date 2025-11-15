// Sample book data (in a real app, this would come from a database)
const bookData = [
    {
        id: 1,
        title: "The Great Gatsby",
        author: "F. Scott Fitzgerald",
        price: "$12.99",
        location: "New York, NY",
        date: "Posted 2 days ago",
        isFavorite: false
    },
    {
        id: 2,
        title: "To Kill a Mockingbird",
        author: "Harper Lee",
        price: "$14.50",
        location: "Chicago, IL",
        date: "Posted 1 week ago",
        isFavorite: true
    },
    {
        id: 3,
        title: "1984",
        author: "George Orwell",
        price: "$10.99",
        location: "Boston, MA",
        date: "Posted 3 days ago",
        isFavorite: false
    },
    {
        id: 4,
        title: "Pride and Prejudice",
        author: "Jane Austen",
        price: "$9.99",
        location: "San Francisco, CA",
        date: "Posted 5 days ago",
        isFavorite: false
    },
    {
        id: 5,
        title: "The Hobbit",
        author: "J.R.R. Tolkien",
        price: "$15.75",
        location: "Seattle, WA",
        date: "Posted 1 day ago",
        isFavorite: true
    },
    {
        id: 6,
        title: "Harry Potter and the Sorcerer's Stone",
        author: "J.K. Rowling",
        price: "$18.25",
        location: "Los Angeles, CA",
        date: "Posted 4 days ago",
        isFavorite: false
    }
];

// DOM elements
const booksGrid = document.getElementById('booksGrid');
const searchInput = document.getElementById('searchInput');

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadBooks(bookData);
    
    // Add event listener for search
    searchInput.addEventListener('input', handleSearch);
});

// Load books into the grid
function loadBooks(books) {
    booksGrid.innerHTML = '';
    
    books.forEach(book => {
        const bookCard = createBookCard(book);
        booksGrid.appendChild(bookCard);
    });
}

// Create a book card element
function createBookCard(book) {
    const card = document.createElement('div');
    card.className = 'book-card';
    
    card.innerHTML = `
        <div class="book-image">
            <i class="fas fa-book" style="font-size: 48px; color: #aaa;"></i>
        </div>
        <div class="book-info">
            <h3 class="book-title">${book.title}</h3>
            <p class="book-author">by ${book.author}</p>
            <p class="book-location">${book.location}</p>
            <p class="book-date">${book.date}</p>
            <p class="book-price">${book.price}</p>
            <div class="book-actions">
                <button class="contact-btn">Contact Seller</button>
                <button class="favorite-btn ${book.isFavorite ? 'active' : ''}" onclick="toggleFavorite(event, ${book.id})">
                    <i class="fas fa-heart"></i>
                </button>
            </div>
        </div>
    `;
    
    // Make the entire card clickable to view listing details
    card.addEventListener('click', function(e) {
        // Don't trigger if clicking on buttons
        if (!e.target.closest('.contact-btn') && !e.target.closest('.favorite-btn')) {
            viewListing(book.id);
        }
    });
    
    return card;
}

// View listing details
function viewListing(bookId) {
    const book = bookData.find(b => b.id === bookId);
    if (book) {
        // In a real app, this would navigate to a listing details page
        // For now, we'll simulate navigation
        console.log(`Navigating to listing page for: ${book.title}`);
        window.location.href = `listing.html?id=${bookId}`;
    }
}

// Toggle favorite status
function toggleFavorite(event, bookId) {
    event.stopPropagation(); // Prevent triggering the card click
    const book = bookData.find(b => b.id === bookId);
    if (book) {
        book.isFavorite = !book.isFavorite;
        loadBooks(bookData); // Refresh the display
        
        // In a real app, you would save this to the database
        console.log(`Book ${bookId} favorite status: ${book.isFavorite}`);
    }
}

// Handle search functionality
function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase();
    
    if (searchTerm === '') {
        loadBooks(bookData);
        return;
    }
    
    const filteredBooks = bookData.filter(book => 
        book.title.toLowerCase().includes(searchTerm) || 
        book.author.toLowerCase().includes(searchTerm)
    );
    
    loadBooks(filteredBooks);
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
    window.location.href = "messages.html"
}