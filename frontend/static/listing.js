// Mock book data (same as home.js)
const bookData = [
    {
        id: 101,
        title: "Harry Potter and the Sorcerer's Stone",
        author: "J.K. Rowling",
        price: "$18.25",
        location: "Lisbon, Portugal",
        date: "Posted 1 day ago",
        year: "1997",
        condition: "Good",
        genres: "Fantasy, Adventure",
        description: "A magical journey begins at Hogwarts! Follow Harry Potter as he discovers his true identity and battles the forces of darkness.",
        seller: "John Doe",
        sellerId: 1,
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
        year: "2013",
        condition: "Almost new",
        genres: "Fantasy, adventure",
        description: "A classic masterpiece by J.R.R. Tolkien! This book will take you on an unforgettable journey through Middle-earth with Frodo, Gandalf, Aragorn, and the rest of the Fellowship. Reason for selling: I've finished reading it and want it to find a new home with another Tolkien fan.",
        seller: "John Doe",
        sellerId: 1,
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
        year: "2011",
        condition: "Good",
        genres: "Non-fiction, History",
        description: "Explore the history of humankind from the Stone Age to the modern era in this thought-provoking book.",
        seller: "Jane Smith",
        sellerId: 2,
        isFavorite: false,
        imagePath: "../static/resources/sapiens.png"
    }
];

// Get book ID from URL
const urlParams = new URLSearchParams(window.location.search);
const bookId = parseInt(urlParams.get('id'));

// Find the book
const book = bookData.find(b => b.id === bookId);

// Load book details on page load
document.addEventListener('DOMContentLoaded', function() {
    if (book) {
        loadBookDetails(book);
    } else {
        // If book not found, redirect to home
        window.location.href = 'home.html';
    }
    
});

// Load book details into the page
function loadBookDetails(book) {
    document.getElementById('bookImage').src = book.imagePath;
    document.getElementById('bookTitle').textContent = book.title;
    document.getElementById('bookAuthor').textContent = book.author;
    document.getElementById('bookPrice').textContent = book.price;
    document.getElementById('bookYear').textContent = book.year;
    document.getElementById('bookCondition').textContent = book.condition;
    document.getElementById('bookGenres').textContent = book.genres;
    document.getElementById('bookLocation').textContent = book.location;
    document.getElementById('bookDescription').textContent = book.description;
    document.getElementById('sellerName').textContent = book.seller;
    
    // Set favorite button state
    const favoriteBtn = document.getElementById('favoriteBtn');
    if (book.isFavorite) {
        favoriteBtn.classList.add('active');
    }
}

// Go back to previous page
function goBack() {
    window.history.back();
}

// Toggle favorite
function toggleFavorite() {
    if (!book) return;
    
    // If already favorited, ask for confirmation
    if (book.isFavorite) {
        if (!confirm('Remove this book from your favorites?')) {
            return;
        }
    }
    
    book.isFavorite = !book.isFavorite;
    
    // Update button state
    const favoriteBtn = document.getElementById('favoriteBtn');
    favoriteBtn.classList.toggle('active');
    
    // Show toast
    if (book.isFavorite) {
        showToast('Added to favorites');
    } else {
        showToast('Removed from favorites');
    }
}

// Go to seller profile
function goToSellerProfile() {
    if (!book) return;
    window.location.href = `foreignprofile.html?id=${book.sellerId}`;
}

// Send message
function sendMessage() {
    if (!book) return;
    window.location.href = 'chat.html';
}



// Toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
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