// Require login
if (!isLoggedIn()) {
  window.location.href = '../templates/Login.html';
}

// Navigation functions - MUST be in global scope for onclick to work
window.goBack = function () {
  window.history.back();
};

window.goToHome = function () {
  window.location.href = '../templates/home.html';
};

window.goToAnnouncements = function () {
  window.location.href = 'Announcements.html';
};

window.goToFavorites = function () {
  window.location.href = 'favourites.html';
};

// Inbox page
window.goToMessages = function () {
  window.location.href = 'messages.html';
};

window.goToProfile = function () {
  window.location.href = 'profile.html';
};

// Tab switching function
window.switchTab = function (tabName) {
  // Update tab buttons
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    if (tab.dataset.tab === tabName) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // Update sections
  const myListingsSection = document.getElementById('myListingsSection');
  const interestedSection = document.getElementById('interestedSection');

  if (tabName === 'myListings') {
    myListingsSection.classList.add('active');
    interestedSection.classList.remove('active');
  } else {
    myListingsSection.classList.remove('active');
    interestedSection.classList.add('active');
  }
};

// Helper: format date + time from ISO string
function formatDateTime(isoString) {
  if (!isoString) return { date: '', time: '' };
  const d = new Date(isoString);
  const date = d.toLocaleDateString([], {
    month: 'short',
    day: 'numeric'
  });
  const time = d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
  return { date, time };
}

// Create message card for "My Listings" - emphasize person name
function createMyListingCard(dialogue, listingInfo, userName) {
  const card = document.createElement('div');
  card.className = 'message-card';

  const last = dialogue.LastMessage || {};
  const { date, time } = formatDateTime(last.SentDate);

  const imagePath = listingInfo?.imagePath || '../static/resources/placeholder.jpg';
  const bookTitle = listingInfo?.title || `Listing #${dialogue.ListingID}`;
  const preview = last.Content || 'No messages yet.';

  card.dataset.userId = dialogue.UserID;
  card.dataset.listingId = dialogue.ListingID;

  card.innerHTML = `
    <img src="${imagePath}" alt="${bookTitle}" class="book-cover"
         onerror="this.src='../static/resources/placeholder.jpg'">
    <div class="message-content">
      <h3>${userName || `User #${dialogue.UserID}`}</h3>
      <p style="font-size: 0.75rem; color: #999;">${bookTitle}</p>
      <p style="margin-top: 0.25rem;">${preview}</p>
    </div>
    <div class="message-meta">
      <span class="date">${date}</span>
      <span class="time">${time}</span>
    </div>
  `;

  card.addEventListener('click', () => {
    window.location.href = `messages.html?listing_id=${card.dataset.listingId}&user_id=${card.dataset.userId}`;
  });

  return card;
}

// Create message card for "Interested In" - emphasize book name
function createInterestedCard(dialogue, listingInfo, userName) {
  const card = document.createElement('div');
  card.className = 'message-card';

  const last = dialogue.LastMessage || {};
  const { date, time } = formatDateTime(last.SentDate);

  const imagePath = listingInfo?.imagePath || '../static/resources/placeholder.jpg';
  const bookTitle = listingInfo?.title || `Listing #${dialogue.ListingID}`;
  const preview = last.Content || 'No messages yet.';

  card.dataset.userId = dialogue.UserID;
  card.dataset.listingId = dialogue.ListingID;

  card.innerHTML = `
    <img src="${imagePath}" alt="${bookTitle}" class="book-cover"
         onerror="this.src='../static/resources/placeholder.jpg'">
    <div class="message-content">
      <h3>${bookTitle}</h3>
      <p style="font-size: 0.75rem; color: #999;">${userName || `User #${dialogue.UserID}`}</p>
      <p style="margin-top: 0.25rem;">${preview}</p>
    </div>
    <div class="message-meta">
      <span class="date">${date}</span>
      <span class="time">${time}</span>
    </div>
  `;

  card.addEventListener('click', () => {
    const listingId = card.dataset.listingId;
    const userId = card.dataset.userId;
    window.location.href = `messages.html?listing_id=${listingId}&user_id=${userId}`;
  });

  return card;
}

// Load all dialogues from backend and render cards
async function loadDialogues() {
  const myListingsList = document.getElementById('myListingsList');
  const interestedList = document.getElementById('interestedList');

  if (!myListingsList || !interestedList) return;

  myListingsList.innerHTML = '';
  interestedList.innerHTML = '';

  try {
    const accessToken = getAccessToken();

    // Get current user's ID
    const myProfile = await getMyProfile(accessToken);
    const myUserId = myProfile.UserID;

    // Get all dialogues
    const dialogues = await getDialogues(accessToken);

    if (!dialogues || dialogues.length === 0) {
      const emptyMessage = `
        <div class="empty-state" style="text-align: center; padding: 40px 20px;">
          <i class="fas fa-comments" style="font-size: 40px; color: #c84c3d; margin-bottom: 15px;"></i>
          <p style="color: #666; font-size: 18px;">You have no messages yet.</p>
          <small style="color: #999;">Start contacting sellers from listings to see conversations here.</small>
        </div>
      `;
      myListingsList.innerHTML = emptyMessage;
      interestedList.innerHTML = emptyMessage;
      return;
    }

    // Separate into two categories
    const myListingsCards = [];
    const interestedCards = [];

    for (const dialogue of dialogues) {
      let listingInfo = null;
      let listing = null;

      try {
        listing = await getListingById(dialogue.ListingID, accessToken);
        listingInfo = transformListingData(listing);
      } catch (e) {
        console.warn('Failed to load listing for dialogue', dialogue, e);
        continue;
      }

      // Determine if this is MY listing or someone else's
      const isMyListing = listing.User?.UserID === myUserId;

      // Get the other user's name
      let otherUserName = 'Unknown User';

      if (isMyListing) {
        // This is MY listing - get the name of who is interested (dialogue.UserID)
        try {
          const interestedUserProfile = await getUserProfile(dialogue.UserID, accessToken);
          otherUserName = interestedUserProfile?.Name || 'Unknown User';
        } catch (e) {
          console.warn('Failed to load interested user profile', e);
        }

        // This is my listing - show in "My Listings" tab
        const card = createMyListingCard(dialogue, listingInfo, otherUserName);
        myListingsCards.push(card);
        myListingsList.appendChild(card);
      } else {
        // This is someone else's listing - show listing owner's name
        otherUserName = listing.User?.Name || 'Unknown User';

        // Show in "Interested In" tab
        const card = createInterestedCard(dialogue, listingInfo, otherUserName);
        interestedCards.push(card);
        interestedList.appendChild(card);
      }
    }

    // Handle empty states for each tab
    if (myListingsCards.length === 0) {
      myListingsList.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: 40px 20px;">
          <i class="fas fa-box-open" style="font-size: 40px; color: #c84c3d; margin-bottom: 15px;"></i>
          <p style="color: #666; font-size: 18px;">No messages about your listings yet.</p>
        </div>
      `;
    }

    if (interestedCards.length === 0) {
      interestedList.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: 40px 20px;">
          <i class="fas fa-heart-broken" style="font-size: 40px; color: #c84c3d; margin-bottom: 15px;"></i>
          <p style="color: #666; font-size: 18px;">No messages about listings you're interested in.</p>
        </div>
      `;
    }

    // Add stagger animation
    const animateCards = (cards) => {
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
    };

    animateCards(myListingsCards);
    animateCards(interestedCards);

  } catch (error) {
    console.error('Error loading dialogues:', error);
    const errorMessage = `
      <div class="error-state" style="text-align: center; padding: 40px 20px;">
        <i class="fas fa-exclamation-circle" style="font-size: 40px; color: #c84c3d; margin-bottom: 15px;"></i>
        <p style="color: #666; font-size: 18px;">Failed to load your messages.</p>
        <button onclick="loadDialogues()" style="margin-top: 15px; padding: 10px 24px; background: #c84c3d; color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600; font-family: 'Plus Jakarta Sans', sans-serif;">
          Try Again
        </button>
      </div>
    `;
    if (myListingsList) myListingsList.innerHTML = errorMessage;
    if (interestedList) interestedList.innerHTML = errorMessage;
  }
}

// Wait for DOM to load
document.addEventListener("DOMContentLoaded", () => {
  // Initial load from backend
  loadDialogues();
});

// Initialize search after components are loaded
document.addEventListener('componentsLoaded', function () {
  const searchInput = document.getElementById('searchInput');

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const searchTerm = e.target.value.toLowerCase();

      // Search in both lists
      const myListingsList = document.getElementById('myListingsList');
      const interestedList = document.getElementById('interestedList');

      const searchInList = (list) => {
        if (!list) return;
        const cards = list.getElementsByClassName("message-card");

        Array.from(cards).forEach((card) => {
          const title = card.querySelector("h3")?.textContent.toLowerCase() || '';
          const message = card.querySelector("p")?.textContent.toLowerCase() || '';

          if (title.includes(searchTerm) || message.includes(searchTerm)) {
            card.style.display = "flex";
          } else {
            card.style.display = "none";
          }
        });
      };

      searchInList(myListingsList);
      searchInList(interestedList);
    });
  }
});
