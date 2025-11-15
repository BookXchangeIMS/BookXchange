// Mock Data for the Favourites Page
const MOCK_FAVORITES_DATA = [
    {
        ListingID: 3,
        title: "Harry Potter and the Sorcerers Stone",
        Author: "J.K Rowling",
        Price: null, // Displayed as 'Offer' in the screenshot
        Location: "Benfica - Lisboa",
        PublicationDate: "20/10/25",
        Image_Path: "../static/resources/harrypotter.png" // Placeholder for 1984 image
    },
    {
        ListingID: 102,
        title: "The Lord of the Rings",
        Author: "J.R.R. Tolien",
        Price: 5.00,
        Location: "Benfica - Lisboa",
        PublicationDate: "20/10/25",
        Image_Path: "../static/resources/lotr.png" // Placeholder for LOTR image
    },
    {
        ListingID: 201,
        title: "To kill a mockingbird",
        Author: "Lee Harper",
        Price: 5.00,
        Location: "Benfica - Lisboa",
        PublicationDate: "20/10/25",
        Image_Path: "../static/resources/mockingbird.png" // Placeholder for Os Maias image
    },
    {
        ListingID: 202,
        title: "1984",
        Author: "George Orwell",
        Price: 5.00,
        Location: "Benfica - Lisboa",
        PublicationDate: "20/10/25",
        Image_Path: "../static/resources/1984.png" // Placeholder for War and Peace image
    }
];

// DOM elements
const booksGrid = document.getElementById('userBooksGrid'); // Using userBooksGrid from HTML
const searchInput = document.getElementById('searchInput');

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadFavorites();
    
    // Add event listener for search
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
});

// Load favourites from mock data
function loadFavorites() {
    // Simulate loading data locally
    const books = MOCK_FAVORITES_DATA;
    displayBooks(books);
}

// Display books in the grid
function displayBooks(books) {
    if (!booksGrid) return;
    
    booksGrid.innerHTML = '';
    
    if (books.length === 0) {
        booksGrid.innerHTML = '<p style="text-align: center; color: #666;">You have no books saved as favourites.</p>';
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
    
    // Determine button text (Price or Offer)
    // Price will be displayed on the card itself, matching the screenshot layout
    const priceText = book.Price ? `${book.Price.toFixed(2)} $` : 'Offer';
    
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
    
    // Note: The screenshot doesn't show a dedicated price/contact button 
    // but rather the price text and the heart icon directly in the card's footer.

    return card;
}

/**
 * ❤️ Removes a listing from favorites (Local simulation)
 * In a real app, this would make an API call.
 */
function removeFavorite(event, listingId) {
    event.stopPropagation();
    
    // 1. Remove the item from the mock data (simulating DB removal)
    const index = MOCK_FAVORITES_DATA.findIndex(book => book.ListingID === listingId);
    if (index > -1) {
        MOCK_FAVORITES_DATA.splice(index, 1);
        
        // 2. Refresh the display
        loadFavorites();
        console.log(`Listing ${listingId} removed from favorites.`);
    }
}

/**
 * 🔍 Handle search functionality using mock data
 */
function handleSearch() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    // Filter mock data locally
    const filteredBooks = MOCK_FAVORITES_DATA.filter(book => 
        book.Name.toLowerCase().includes(searchTerm) || 
        book.Location.toLowerCase().includes(searchTerm)
    );

    displayBooks(filteredBooks);
    console.log(`Search for "${searchTerm}" completed.`);
}


// --- Navigation functions (Unchanged) ---
function goToHome() {
    window.location.href = 'home.html';
}

function goToAnnouncements() {
    // Note: Your HTML mistakenly sets this button as 'active', 
    // but the icon suggests it's the search/announcements page.
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