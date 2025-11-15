// Sample book data (in a real app, this would come from a database)
const bookData = [
    // Books matching the Announcements page (simulated cross-listing data)
    {
        id: 101, // Matching the ListingID from Announcements.JS
        title: "Harry Potter and the Sorcerer's Stone",
        author: "J.K. Rowling",
        price: "$18.25",
        location: "Lisbon, Portugal",
        date: "Posted 1 day ago",
        isFavorite: false,
        imagePath: "../static/resources/harrypotter.png" // ADDED IMAGE PATH
    },
    {
        id: 102, // Matching the ListingID from Announcements.JS
        title: "The Lord of the Rings: The Fellowship of the Ring (First Edition)",
        author: "J.R.R. Tolkien",
        price: "$45.00",
        location: "Lisbon, Portugal",
        date: "Posted 3 days ago",
        isFavorite: true,
        imagePath: "../static/resources/lotr.png" // ADDED IMAGE PATH
    },
    {
        id: 103, // Matching the ListingID from Announcements.JS
        title: "Sapiens: A Brief History of Humankind",
        author: "Yuval Noah Harari",
        price: "$15.00",
        location: "Lisbon, Portugal",
        date: "Posted 1 week ago",
        isFavorite: false,
        imagePath: "../static/resources/sapiens.png" // ADDED IMAGE PATH
    },
    // Other diverse listings
    {
        id: 1,
        title: "The Great Gatsby",
        author: "F. Scott Fitzgerald",
        price: "$12.99",
        location: "New York, NY",
        date: "Posted 2 days ago",
        isFavorite: false,
        imagePath: "../static/resources/gatsby.jpg" // ADDED IMAGE PATH
    },
    {
        id: 2,
        title: "To Kill a Mockingbird",
        author: "Harper Lee",
        price: "$14.50",
        location: "Chicago, IL",
        date: "Posted 1 week ago",
        isFavorite: true,
        imagePath: "../static/resources/mockingbird.png" // ADDED IMAGE PATH
    },
    {
        id: 3,
        title: "1984",
        author: "George Orwell",
        price: "$10.99",
        location: "Boston, MA",
        date: "Posted 3 days ago",
        isFavorite: false,
        imagePath: "../static/resources/1984.png" // ADDED IMAGE PATH
    }
];

// DOM elements
const booksGrid = document.getElementById('booksGrid');
const searchInput = document.getElementById('searchInput');

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadBooks(bookData);
    
    // Add event listener for search
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
});

// Load books into the grid
function loadBooks(books) {
    if (!booksGrid) return;

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
        <img src="${book.imagePath}" 
             alt="${book.title}" 
             class="book-image"
             onerror="this.src='../static/resources/placeholder.jpg'"> 
             
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