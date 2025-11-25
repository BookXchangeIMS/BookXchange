// Navigation functions - MUST be in global scope for onclick to work
window.goBack = function () {
  window.history.back();
};

window.goToHome = function () {
  window.location.href = 'home.html';
};

window.goToAnnouncements = function () {
  window.location.href = 'announcements.html';
};

window.goToFavorites = function () {
  window.location.href = 'favourites.html';
};

window.goToMessages = function () {
  window.location.href = 'mymessages.html';
};

window.goToProfile = function () {
  window.location.href = 'profile.html';
};

// Wait for DOM to load
document.addEventListener("DOMContentLoaded", () => {

  const messageList = document.getElementById("messageList");
  const cards = messageList ? messageList.getElementsByClassName("message-card") : [];

  // Add click handlers for message cards
  Array.from(cards).forEach((card) => {
    card.addEventListener("click", () => {
      console.log("Card clicked:", card.querySelector("h3").textContent);
      // TODO: Navigate to specific message/conversation
      // window.location.href = `messages.html?user=...`;
    });
  });

  // Add stagger animation to message cards
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
    const cards = messageList.getElementsByClassName("message-card");

    searchInput.addEventListener("input", (e) => {
      const searchTerm = e.target.value.toLowerCase();
      let visibleCount = 0;

      Array.from(cards).forEach((card) => {
        const title = card.querySelector("h3").textContent.toLowerCase();
        const message = card.querySelector("p").textContent.toLowerCase();

        if (title.includes(searchTerm) || message.includes(searchTerm)) {
          card.style.display = "flex";
          visibleCount++;
        } else {
          card.style.display = "none";
        }
      });
    });
  }
});
