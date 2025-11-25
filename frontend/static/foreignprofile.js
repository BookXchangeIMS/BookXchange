// Mock profile data
const profileData = {
  username: "Jane Doe",
  email: "johndoe@gmail.com"
}

// Matching home and listing.js mock books
const listings = [
    {
        id: 101,
        title: "Harry Potter and the Sorcerer's Stone",
        author: "J.K. Rowling",
        location: "Lisbon, Portugal",
        date: "Posted 1 day ago",
        price: "$18.25",
        image: "../static/resources/harrypotter.png",
        isFavorite: false,
    },
    {
        id: 102,
        title: "The Lord of the Rings: The Fellowship of the Ring (First Edition)",
        author: "J.R.R. Tolkien",
        location: "Lisbon, Portugal",
        date: "Posted 3 days ago",
        price: "$45.00",
        image: "../static/resources/lotr.png",
        isFavorite: true,
    },
    {
        id: 103,
        title: "Sapiens: A Brief History of Humankind",
        author: "Yuval Noah Harari",
        location: "Lisbon, Portugal",
        date: "Posted 1 week ago",
        price: "$15.00",
        image: "../static/resources/sapiens.png",
        isFavorite: false,
    },
    {
        id: 1,
        title: "The Great Gatsby",
        author: "F. Scott Fitzgerald",
        location: "New York, NY",
        date: "Posted 2 days ago",
        price: "$12.99",
        image: "../static/resources/gatsby.jpg",
        isFavorite: false,
    },
    {
        id: 2,
        title: "To Kill a Mockingbird",
        author: "Harper Lee",
        location: "Chicago, IL",
        date: "Posted 1 week ago",
        price: "$14.50",
        image: "../static/resources/mockingbird.png",
        isFavorite: true,
    },
    {
        id: 3,
        title: "1984",
        author: "George Orwell",
        location: "Boston, MA",
        date: "Posted 3 days ago",
        price: "$10.99",
        image: "../static/resources/1984.png",
        isFavorite: false,
    }
]

function renderListings() {
  const grid = document.getElementById("listings-grid")
  grid.innerHTML = ""

  listings.forEach((book) => {
    const card = document.createElement("div")
    card.className = "listing-card"

    card.innerHTML = `
      <img src="${book.image}" alt="${book.title}" class="card-image">
      <div class="card-content">
          <h4>${book.title}</h4>
          <p class="book-author">by ${book.author}</p>
          <div class="card-meta">
              <span>${book.location}</span>
              <span>${book.date}</span>
          </div>
          <p class="book-price">${book.price}</p>
          <div class="card-actions">
              <button class="contact-btn" onclick="goToMessages(event)">Contact Seller</button>
              <button class="heart-btn ${book.isFavorite ? 'active' : ''}" aria-label="Add to favorites">
                  <i class="fas fa-heart"></i>
              </button>
          </div>
      </div>
    `
    
    // Make card clickable to view listing (except when clicking buttons)
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.contact-btn') && !e.target.closest('.heart-btn')) {
        goToListing(book.id)
      }
    })

    grid.appendChild(card)
  })
}

function updateListingsTitle() {
  const titleElement = document.querySelector(".listings-section h2")
  if (titleElement) {
    titleElement.textContent = `${profileData.username}'s Listings`
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderListings()
  updateListingsTitle()

  // Add interaction for heart buttons
  document.addEventListener("click", (e) => {
    if (e.target.closest(".heart-btn")) {
      const btn = e.target.closest(".heart-btn")
      btn.classList.toggle("active")
    }
  })
})

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
function goToMyMessages() {
    window.location.href = "mymessages.html";
}
function goToListing(listingId) {
    window.location.href = `listing.html?id=${listingId}`;
}
function goToMessages(event) {
    event.stopPropagation(); // Prevent card click
    window.location.href = "messages.html";
}
