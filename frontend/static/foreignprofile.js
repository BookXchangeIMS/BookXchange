// Require login
if (!isLoggedIn()) {
  window.location.href = '../templates/Login.html';
}

// State
let currentUser = null;
let userListings = [];

// ============================================
// PAGE INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async function () {
  // Get user ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const userId = parseInt(urlParams.get('id'));

  if (!userId) {
    console.error('No user ID provided');
    window.location.href = '../templates/home.html';
    return;
  }

  try {
    const accessToken = getAccessToken();

    // Load user profile
    await loadUserProfile(userId, accessToken);

    // Load user's listings
    await loadUserListings(userId, accessToken);

  } catch (error) {
    console.error('Error loading profile:', error);
    showError('Failed to load user profile. Please try again.');
  }
});

// ============================================
// LOAD USER PROFILE
// ============================================

async function loadUserProfile(userId, accessToken) {
  try {
    const user = await getUserProfile(userId, accessToken);
    currentUser = user;

    // Update profile header
    const profileInfo = document.querySelector('.profile-info');
    if (profileInfo) {
      // Backend doesn't return Email in get_profile, so we'll hide the email link
      profileInfo.innerHTML = `
                <h1>${user.Name || 'Unknown User'}</h1>
            `;
    }

    // Update about section - backend returns 'AboutMe' not 'Bio'
    const aboutMe = document.querySelector('.about-me p');
    if (aboutMe) {
      if (user.AboutMe && user.AboutMe.trim()) {
        aboutMe.textContent = user.AboutMe;
      } else {
        aboutMe.textContent = 'This user hasn\'t written a bio yet.';
      }
    }

    // Update profile picture
    const avatar = document.querySelector('.avatar');
    if (avatar) {
      if (user.ProfileImagePath) {
        const imageUrl = `http://localhost:8000/api/get_users_profile_picture?userid=${userId}&access_token=${accessToken}`;
        avatar.innerHTML = `<img src="${imageUrl}" alt="${user.Name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" onerror="this.parentElement.innerHTML='<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'64\\' height=\\'64\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'1.5\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'><path d=\\'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2\\' /><circle cx=\\'12\\' cy=\\'7\\' r=\\'4\\' /></svg>'">`;
      } else {
        // Keep default SVG icon if no profile picture
        avatar.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                </svg>
            `;
      }
    }

    // Try to get user preferences/genres
    try {
      // Note: This endpoint might not exist for other users, only for current user
      // We'll try it but catch errors gracefully
      const preferences = await getPreferences(accessToken);
      const interests = document.querySelector('.interests .tags');
      if (interests && preferences && preferences.length > 0) {
        interests.textContent = preferences.join(', ');
      } else {
        interests.textContent = 'No interests specified';
      }
    } catch (error) {
      // If we can't get preferences (likely because endpoint is only for current user)
      // Just show a default message
      const interests = document.querySelector('.interests .tags');
      if (interests) {
        interests.textContent = 'Not available';
      }
    }

  } catch (error) {
    console.error('Error loading user profile:', error);
    throw error;
  }
}

// ============================================
// LOAD USER LISTINGS
// ============================================

async function loadUserListings(userId, accessToken) {
  try {
    const listings = await getUserListings(userId, accessToken);
    userListings = listings;

    // Update section title
    const titleElement = document.querySelector('.listings-section h2');
    if (titleElement && currentUser) {
      titleElement.textContent = `${currentUser.Name}'s Listings`;
    }

    // Render listings
    renderListings(listings);

  } catch (error) {
    console.error('Error loading user listings:', error);
    // Show empty state instead of error for listings
    renderListings([]);
  }
}

// ============================================
// RENDER LISTINGS
// ============================================

function renderListings(listings) {
  const grid = document.getElementById('listings-grid');

  if (!grid) return;

  // Clear existing content
  grid.innerHTML = '';

  if (listings.length === 0) {
    grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <i class="fas fa-book-open" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
                <p style="color: #666; font-size: 18px;">This user hasn't posted any listings yet.</p>
            </div>
        `;
    return;
  }

  listings.forEach((listing) => {
    const card = createListingCard(listing);
    grid.appendChild(card);
  });
}

// ============================================
// CREATE LISTING CARD
// ============================================

function createListingCard(listing) {
  const card = document.createElement('div');
  card.className = 'listing-card';

  // Format data
  const price = listing.Price ? `€${listing.Price.toFixed(2)}` : 'Free';
  const author = Array.isArray(listing.Book.Author)
    ? listing.Book.Author.join(', ')
    : listing.Book.Author || 'Unknown Author';
  const location = listing.Location.Address || 'Location not specified';

  // Format date
  const creationDate = new Date(listing.CreationDate);
  const formattedDate = creationDate.toLocaleDateString('en-GB');

  // Image path with access token
  const accessToken = getAccessToken();
  const imagePath = `http://localhost:8000/api/get_listing_primary_image?listingid=${listing.ListingID}&access_token=${accessToken}`;

  card.innerHTML = `
        <img src="${imagePath}" 
             alt="${listing.Book.Title}" 
             class="card-image"
             onerror="this.src='../static/resources/placeholder.jpg'">
        <div class="card-content">
            <h4>${listing.Book.Title || 'Untitled'}</h4>
            <p class="book-author">by ${author}</p>
            <div class="card-meta">
                <span>${location}</span>
                <span>${formattedDate}</span>
            </div>
            <p class="book-price">${price}</p>
            <div class="card-actions">
                <button class="contact-btn">View Details</button>
                <button class="heart-btn ${listing.IsFavorite ? 'active' : ''}" aria-label="Add to favorites">
                    <i class="fas fa-heart"></i>
                </button>
            </div>
        </div>
    `;

  // Contact button to view listing
  const contactBtn = card.querySelector('.contact-btn');
  contactBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    goToListing(listing.ListingID);
  });

  // Favorite button
  const heartBtn = card.querySelector('.heart-btn');
  heartBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    await toggleFavorite(listing.ListingID, heartBtn);
  });

  // Make card clickable
  card.addEventListener('click', () => {
    goToListing(listing.ListingID);
  });

  return card;
}

// ============================================
// TOGGLE FAVORITE
// ============================================

async function toggleFavorite(listingId, button) {
  try {
    const accessToken = getAccessToken();
    const isActive = button.classList.contains('active');

    if (isActive) {
      await removeFavorite(listingId, accessToken);
      button.classList.remove('active');
      showToast('Removed from favorites');
    } else {
      await addFavorite(listingId, accessToken);
      button.classList.add('active');
      showToast('Added to favorites');
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    showToast('Failed to update favorites', 'error');
  }
}

// ============================================
// NAVIGATION FUNCTIONS
// ============================================

function goToListing(listingId) {
  window.location.href = `/listing?id=${listingId}`;
}

function goToHome() {
  window.location.href = '../templates/home.html';
}

function goToAnnouncements() {
  window.location.href = 'Announcements.html';
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

// ============================================
// ERROR HANDLING
// ============================================

function showError(message) {
  const mainContent = document.querySelector('.main-content');
  if (mainContent) {
    mainContent.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <i class="fas fa-exclamation-circle" style="font-size: 48px; color: #c84c3d; margin-bottom: 20px;"></i>
                <p style="color: #666; font-size: 18px;">${message}</p>
                <button onclick="window.location.href='/'" style="margin-top: 20px; padding: 12px 30px; background: #c84c3d; color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600; font-family: 'Segoe UI', sans-serif;">
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