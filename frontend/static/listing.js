// ============================================
// IMPORTS & DEPENDENCIES
// ============================================
// Assumes api.js is loaded before this script

// ===========================================
// STATE
// ============================================
let currentListing = null;
let currentImages = [];

// ============================================
// PAGE INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async function () {
    // Get listing ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const listingId = parseInt(urlParams.get('id'));

    if (!listingId) {
        console.error('No listing ID provided');
        window.location.href = 'home.html';
        return;
    }

    try {
        // Load listing details from API
        await loadListingDetails(listingId);

        // Initialize zoom functionality after images are loaded
        initializeZoomFunctionality();
    } catch (error) {
        console.error('Error loading listing:', error);
        showError('Failed to load listing details. Please try again.');
        setTimeout(() => window.location.href = 'home.html', 3000);
    }
});

// ============================================
// LOAD LISTING DETAILS FROM API
// ============================================

async function loadListingDetails(listingId) {
    try {
        const accessToken = getAccessToken();
        const listing = await getListingById(listingId, accessToken);

        currentListing = listing;

        // Populate page with listing data
        populateBookDetails(listing);

        // Load images
        await loadImages(listingId, accessToken);

        // Initialize Map
        if (listing.Location && listing.Location.Latitude && listing.Location.Longitude) {
            initializeMap(listing.Location.Latitude, listing.Location.Longitude);
        }

    } catch (error) {
        console.error('Error in loadListingDetails:', error);
        throw error;
    }
}

// ============================================
// INITIALIZE MAP
// ============================================

function initializeMap(lat, lng) {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    // Create map instance - slightly zoomed out for area view
    const map = L.map('map').setView([lat, lng], 14);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Add approximate location circle (500m radius)
    L.circle([lat, lng], {
        color: '#c84c3d',
        fillColor: '#c84c3d',
        fillOpacity: 0.2,
        radius: 500
    }).addTo(map)

        .openPopup();

    // Fix for map rendering issues when inside hidden/dynamic containers
    setTimeout(() => {
        map.invalidateSize();
    }, 100);
}

// ============================================
// POPULATE BOOK DETAILS
// ============================================

function populateBookDetails(listing) {
    // Title and Author
    document.getElementById('bookTitle').textContent = listing.Book.Title || 'Untitled';

    const authors = Array.isArray(listing.Book.Author)
        ? listing.Book.Author.join(', ')
        : listing.Book.Author || 'Unknown Author';
    document.getElementById('bookAuthor').textContent = authors;

    // Price
    const price = listing.Price ? `€${listing.Price.toFixed(2)}` : 'Free';
    document.getElementById('bookPrice').textContent = price;

    // Year (from ReleaseDate)
    const year = listing.Book.ReleaseDate
        ? new Date(listing.Book.ReleaseDate).getFullYear()
        : 'N/A';
    document.getElementById('bookYear').textContent = year;

    // Condition
    document.getElementById('bookCondition').textContent = listing.BookCondition || 'N/A';

    // Genres
    const genres = Array.isArray(listing.Book.Genre)
        ? listing.Book.Genre.join(', ')
        : listing.Book.Genre || 'N/A';
    document.getElementById('bookGenres').textContent = genres;

    // Location

    // Description
    document.getElementById('bookDescription').textContent = listing.Description || 'No description provided.';

    // Seller
    document.getElementById('sellerName').textContent = listing.User.Name || 'Unknown Seller';

    // Favorite button state
    const favoriteBtn = document.getElementById('favoriteBtn');
    if (listing.IsFavorite) {
        favoriteBtn.classList.add('active');
    } else {
        favoriteBtn.classList.remove('active');
    }
}

// ============================================
// LOAD IMAGES
// ============================================

async function loadImages(listingId, accessToken) {
    try {
        // Fetch image URLs from backend
        const response = await fetch(`http://localhost:8000/api/get_listing_images_urls?listingid=${listingId}&access_token=${accessToken}`);

        if (response.ok) {
            const images = await response.json();

            if (images && images.length > 0) {
                // Build image URLs
                currentImages = images.map(img =>
                    `http://localhost:8000/api/get_listing_image/${img.photoId}?access_token=${accessToken}`
                );
                loadImageGallery(currentImages);
            } else {
                // Use placeholder if no images
                currentImages = ['../static/resources/placeholder.jpg'];
                loadImageGallery(currentImages);
            }
        } else {
            // Use placeholder on error
            currentImages = ['../static/resources/placeholder.jpg'];
            loadImageGallery(currentImages);
        }
    } catch (error) {
        console.error('Error loading images:', error);
        // Use placeholder on error
        currentImages = ['../static/resources/placeholder.jpg'];
        loadImageGallery(currentImages);
    }
}

// ============================================
// IMAGE GALLERY WITH THUMBNAILS
// ============================================

function loadImageGallery(images) {
    const mainImage = document.getElementById('mainImage');
    const thumbnailGallery = document.getElementById('thumbnailGallery');

    if (!mainImage || !thumbnailGallery) return;

    // Set first image as main
    mainImage.src = images[0];
    mainImage.onerror = function () {
        this.src = '../static/resources/placeholder.jpg';
    };

    // Clear and create thumbnails
    thumbnailGallery.innerHTML = '';

    images.forEach((imgSrc, index) => {
        const thumbnail = document.createElement('img');
        thumbnail.src = imgSrc;
        thumbnail.alt = `Image ${index + 1}`;
        thumbnail.className = 'thumbnail';
        if (index === 0) thumbnail.classList.add('active');

        // Error handling for thumbnails
        thumbnail.onerror = function () {
            this.src = '../static/resources/placeholder.jpg';
        };

        // Click handler to change main image
        thumbnail.addEventListener('click', function () {
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
    mainImage.addEventListener('click', function () {
        zoomedImage.src = mainImage.src;
        zoomOverlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scroll
    });

    // Close zoom with back button
    zoomBackBtn.addEventListener('click', closeZoom);

    // Close zoom when clicking outside image
    zoomOverlay.addEventListener('click', function (e) {
        if (e.target === zoomOverlay) {
            closeZoom();
        }
    });

    // Close zoom with Escape key
    document.addEventListener('keydown', function (e) {
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

async function toggleFavorite() {
    if (!currentListing) return;

    try {
        const accessToken = getAccessToken();
        const listingId = currentListing.ListingID;

        if (currentListing.IsFavorite) {
            // Remove from favorites
            if (!confirm('Remove this book from your favorites?')) {
                return;
            }
            await removeFavorite(listingId, accessToken);
            currentListing.IsFavorite = false;
            document.getElementById('favoriteBtn').classList.remove('active');
            showToast('Removed from favorites');
        } else {
            // Add to favorites
            await addFavorite(listingId, accessToken);
            currentListing.IsFavorite = true;
            document.getElementById('favoriteBtn').classList.add('active');
            showToast('Added to favorites');
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
        showToast('Failed to update favorites. Please try again.', 'error');
    }
}

// Make it available globally for onclick handler
window.toggleFavorite = toggleFavorite;

// ============================================
// NAVIGATION FUNCTIONS
// ============================================

function goToSellerProfile() {
    if (!currentListing) return;
    const sellerId = currentListing.User.UserID;
    window.location.href = `foreignprofile.html?id=${sellerId}`;
}

function sendMessage() {
    if (!currentListing) return;
    // Navigate to messages page (could pass seller ID as parameter)
    window.location.href = `messages.html?sellerId=${currentListing.User.UserID}`;
}

function goBack() {
    window.history.back();
}

// Make functions available globally for onclick handlers
window.goToSellerProfile = goToSellerProfile;
window.sendMessage = sendMessage;
window.goBack = goBack;

// ============================================
// ERROR DISPLAY
// ============================================

function showError(message) {
    const container = document.querySelector('.container');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <i class="fas fa-exclamation-circle" style="font-size: 48px; color: #c84c3d; margin-bottom: 20px;"></i>
                <p style="color: #666; font-size: 18px;">${message}</p>
                <button onclick="window.location.href='home.html'" style="margin-top: 20px; padding: 12px 30px; background: #c84c3d; color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600; font-family: 'Segoe UI', sans-serif;">
                    Go to Home
                </button>
            </div>
        `;
    }
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
