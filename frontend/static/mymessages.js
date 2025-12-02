// Require login
if (!isLoggedIn()) {
  window.location.href = '/login';
}

// Navigation functions - MUST be in global scope for onclick to work
window.goBack = function () {
  window.history.back();
};

window.goToHome = function () {
  window.location.href = '/';
};

window.goToAnnouncements = function () {
  window.location.href = '/announcements';
};

window.goToFavorites = function () {
  window.location.href = '/favourites';
};

// Inbox page
window.goToMessages = function () {
  window.location.href = '/messages';
};

window.goToProfile = function () {
  window.location.href = '/profile';
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

// Create one message card from dialogue + listing info
function createMessageCard(dialogue, listingInfo) {
  const card = document.createElement('div');
  card.className = 'message-card';

  const last = dialogue.LastMessage || {};
  const { date, time } = formatDateTime(last.SentDate);

  const imagePath = listingInfo?.imagePath || '../static/resources/placeholder.jpg';
  const title = listingInfo?.title || `Listing #${dialogue.ListingID}`;
  const preview = last.Content || 'No messages yet.';

  card.dataset.userId = dialogue.UserID;
  card.dataset.listingId = dialogue.ListingID;

  card.innerHTML = `
    <img src="${imagePath}" alt="${title}" class="book-cover"
         onerror="this.src='../static/resources/placeholder.jpg'">
    <div class="message-content">
      <h3>${title}</h3>
      <p>${preview}</p>
    </div>
    <div class="message-meta">
      <span class="date">${date}</span>
      <span class="time">${time}</span>
    </div>
  `;

  // Click → open the specific conversation
  card.addEventListener('click', () => {
    const listingId = card.dataset.listingId;
    const userId = card.dataset.userId;
    window.location.href = `/mymessages?listing_id=${listingId}&user_id=${userId}`;
  });

  return card;
}

// Load all dialogues from backend and render cards
async function loadDialogues() {
  const messageList = document.getElementById('messageList');
  if (!messageList) return;

  messageList.innerHTML = '';

  try {
    const accessToken = getAccessToken();
    // 1) Get all dialogues: [{ UserID, ListingID, LastMessage{...} }, ...]
    const dialogues = await getDialogues(accessToken);

    if (!dialogues || dialogues.length === 0) {
      messageList.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: 40px 20px;">
          <i class="fas fa-comments" style="font-size: 40px; color: #c84c3d; margin-bottom: 15px;"></i>
          <p style="color: #666; font-size: 18px;">You have no messages yet.</p>
          <small style="color: #999;">Start contacting sellers from listings to see conversations here.</small>
        </div>
      `;
      return;
    }

    // 2) For each dialogue, fetch its listing so we can show title/cover
    const cards = [];
    for (const dialogue of dialogues) {
      let listingInfo = null;
      try {
        const listing = await getListingById(dialogue.ListingID, accessToken);
        // Reuse your existing transformer to keep card style consistent
        listingInfo = transformListingData(listing);
      } catch (e) {
        console.warn('Failed to load listing for dialogue', dialogue, e);
      }

      const card = createMessageCard(dialogue, listingInfo);
      cards.push(card);
      messageList.appendChild(card);
    }

    // 3) Add stagger animation to message cards
    cards.forEach((card, index) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      setTimeout(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
        // Remove inline styles after animation
        setTimeout(() => {
          card.style.opacity = '';
          card.style.transform = '';
        }, 500);
      }, index * 100);
    });
  } catch (error) {
    console.error('Error loading dialogues:', error);
    const messageList = document.getElementById('messageList');
    if (messageList) {
      messageList.innerHTML = `
        <div class="error-state" style="text-align: center; padding: 40px 20px;">
          <i class="fas fa-exclamation-circle" style="font-size: 40px; color: #c84c3d; margin-bottom: 15px;"></i>
          <p style="color: #666; font-size: 18px;">Failed to load your messages.</p>
          <button onclick="loadDialogues()" style="margin-top: 15px; padding: 10px 24px; background: #c84c3d; color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600; font-family: 'Segoe UI', sans-serif;">
            Try Again
          </button>
        </div>
      `;
    }
  }
}

// Wait for DOM to load
document.addEventListener("DOMContentLoaded", () => {
  const messageList = document.getElementById("messageList");

  // Initial load from backend
  loadDialogues();

  // Existing search + animation logic
  const cards = messageList ? messageList.getElementsByClassName("message-card") : [];

  // Add stagger animation to existing cards (in case any are there initially)
  Array.from(cards).forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    setTimeout(() => {
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
      // Remove inline styles after animation
      setTimeout(() => {
        card.style.opacity = '';
        card.style.transform = '';
      }, 500);
    }, index * 100);
  });
});

// Initialize search after components are loaded
document.addEventListener('componentsLoaded', function () {
  const searchInput = document.getElementById('searchInput');
  const messageList = document.getElementById('messageList');

  if (searchInput && messageList) {
    const getCards = () => messageList.getElementsByClassName("message-card");

    searchInput.addEventListener("input", (e) => {
      const searchTerm = e.target.value.toLowerCase();
      const cards = getCards();

      Array.from(cards).forEach((card) => {
        const title = card.querySelector("h3")?.textContent.toLowerCase() || '';
        const message = card.querySelector("p")?.textContent.toLowerCase() || '';

        if (title.includes(searchTerm) || message.includes(searchTerm)) {
          card.style.display = "flex";
        } else {
          card.style.display = "none";
        }
      });
    });
  }
});
