// ============================================
// GLOBAL NAVIGATION FUNCTIONS
// ============================================

window.goBack = function() {
    window.history.back();
};

// ============================================
// BOOK DATA WITH MULTIPLE IMAGES
// ============================================

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
        images: [
            "../static/resources/harrypotter.png",
            "../static/resources/harrypotter.png",
            "../static/resources/harrypotter.png"
        ]
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
        genres: "Fantasy, Adventure",
        description: "A classic masterpiece by J.R.R. Tolkien! This book will take you on an unforgettable journey through Middle-earth with Frodo, Gandalf, Aragorn, and the rest of the Fellowship.",
        seller: "John Doe",
        sellerId: 1,
        isFavorite: true,
        images: [
            "../static/resources/lotr.png",
            "../static/resources/lotr.png",
            "../static/resources/lotr.png"
        ]
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
        images: [
            "../static/resources/sapiens.png",
            "../static/resources/sapiens.png"
        ]
    },
    {
        id: 1,
        title: "The Great Gatsby",
        author: "F. Scott Fitzgerald",
        price: "$12.99",
        location: "New York, NY",
        date: "Posted 2 days ago",
        year: "1925",
        condition: "Like new",
        genres: "Classic, Fiction",
        description: "An American classic set in the Roaring Twenties, following Jay Gatsby and his mysterious, lavish lifestyle.",
        seller: "Emily Johnson",
        sellerId: 3,
        isFavorite: false,
        images: [
            "../static/resources/gatsby.jpg"
        ]
    },
    {
        id: 2,
        title: "To Kill a Mockingbird",
        author: "Harper Lee",
        price: "$14.50",
        location: "Chicago, IL",
        date: "Posted 1 week ago",
        year: "1960",
        condition: "Acceptable",
        genres: "Classic, Drama",
        description: "A powerful novel about racial injustice in the American South, seen through the eyes of young Scout Finch.",
        seller: "Michael Smith",
        sellerId: 4,
        isFavorite: true,
        images: [
            "../static/resources/mockingbird.png"
        ]
    },
    {
        id: 3,
        title: "1984",
        author: "George Orwell",
        price: "$10.99",
        location: "Boston, MA",
        date: "Posted 3 days ago",
        year: "1949",
        condition: "Used",
        genres: "Dystopian, Fiction",
        description: "A chilling depiction of perpetual war, omnipresent government surveillance, and public manipulation.",
        seller: "Samantha Lee",
        sellerId: 5,
        isFavorite: false,
        images: [
            "../static/resources/1984.png"
        ]
    }
];


// Get book ID from URL
const urlParams = new URLSearchParams(window.location.search);
const bookId = parseInt(urlParams.get('id'));

// Find the book
const book = bookData.find(b => b.id === bookId);

// ============================================
// PAGE INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    if (book) {
        loadBookDetails(book);
        loadImageGallery(book.images);
        initializeZoomFunctionality();
    } else {
        // If book not found, redirect to home
        window.location.href = 'home.html';
    }
});

// ============================================
// LOAD BOOK DETAILS
// ============================================

function loadBookDetails(book) {
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

// ============================================
// IMAGE GALLERY WITH THUMBNAILS
// ============================================

function loadImageGallery(images) {
    const mainImage = document.getElementById('mainImage');
    const thumbnailGallery = document.getElementById('thumbnailGallery');

    // Set first image as main
    mainImage.src = images[0];

    // Create thumbnails
    thumbnailGallery.innerHTML = '';
    images.forEach((imgSrc, index) => {
        const thumbnail = document.createElement('img');
        thumbnail.src = imgSrc;
        thumbnail.alt = `Image ${index + 1}`;
        thumbnail.className = 'thumbnail';
        if (index === 0) thumbnail.classList.add('active');

        // Click handler to change main image
        thumbnail.addEventListener('click', function() {
            mainImage.src = imgSrc;
            
            // Update active state
            document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
            thumbnail.classList.add('active');
        });

        thumbnailGallery.appendChild(thumbnail);
    });
}

// ============================================
// ZOOM FUNCTIONALITY
// ============================================

function initializeZoomFunctionality() {
    const mainImage = document.getElementById('mainImage');
    const zoomOverlay = document.getElementById('zoomOverlay');
    const zoomedImage = document.getElementById('zoomedImage');
    const zoomBackBtn = document.getElementById('zoomBackBtn');

    if (!mainImage || !zoomOverlay || !zoomedImage || !zoomBackBtn) return;

    // Open zoom when clicking main image
    mainImage.addEventListener('click', function() {
        zoomedImage.src = mainImage.src;
        zoomOverlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scroll
    });

    // Close zoom with back button
    zoomBackBtn.addEventListener('click', closeZoom);

    // Close zoom when clicking outside image
    zoomOverlay.addEventListener('click', function(e) {
        if (e.target === zoomOverlay) {
            closeZoom();
        }
    });

    // Close zoom with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && zoomOverlay.classList.contains('active')) {
            closeZoom();
        }
    });

    function closeZoom() {
        zoomOverlay.classList.remove('active');
        document.body.style.overflow = ''; // Restore scroll
    }
}

// ============================================
// TOGGLE FAVORITE
// ============================================

function toggleFavorite() {
    if (!book) return;

    if (book.isFavorite) {
        if (!confirm('Remove this book from your favorites?')) {
            return;
        }
    }

    book.isFavorite = !book.isFavorite;

    const favoriteBtn = document.getElementById('favoriteBtn');
    favoriteBtn.classList.toggle('active');

    if (book.isFavorite) {
        showToast('Added to favorites');
    } else {
        showToast('Removed from favorites');
    }
}

// ============================================
// NAVIGATION FUNCTIONS
// ============================================

function goToSellerProfile() {
    if (!book) return;
    window.location.href = `foreignprofile.html?id=${book.sellerId}`;
}

function sendMessage() {
    if (!book) return;
    window.location.href = 'messages.html';
}

// ============================================
// TOAST NOTIFICATION
// ============================================

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
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideDown 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add CSS animations for toast
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
