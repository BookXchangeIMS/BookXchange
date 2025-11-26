// Profile data - in a real app this would come from the server
const profileData = {
  username: "Jane Doe",
  email: "johndoe@gmail.com"
}

// Require login
if (!isLoggedIn()) {
  window.location.href = 'Login.html';
}

// Data for the listings
const listings = [
  {
    id: 1,
    title: "Queirós - Os Maias",
    author: "Eça de Queirós",
    location: "Benfica - Lisboa",
    date: "20/10/25",
    price: "Donation",
    image: "/resources/Maias.png",
    isFavorite: false,
  },
  {
    id: 2,
    title: "Tolstoy - War and Peace",
    author: "Leo Tolstoy",
    location: "Benfica - Lisboa",
    date: "20/10/25",
    price: "Xchange",
    image: "/resources/WarAndPeace.png",
    isFavorite: false,
  },
  {
    id: 3,
    title: "Orwell - 1984",
    author: "George Orwell",
    location: "Porto - Centro",
    date: "21/10/25",
    price: "7,50 $",
    image: "/resources/1984.png",
    isFavorite: false,
  },
  {
    id: 4,
    title: "Austen - Pride & Prejudice",
    author: "Jane Austen",
    location: "Coimbra",
    date: "22/10/25",
    price: "6,00 $",
    image: "/images/image.png",
    isFavorite: false,
  },
  {
    id: 5,
    title: "Dostoyevsky - Crime & Punishment",
    author: "Fyodor Dostoyevsky",
    location: "Lisboa",
    date: "23/10/25",
    price: "8,00 $",
    image: "/images/image.png",
    isFavorite: false,
  },
]

// Function to render listings
function renderListings() {
  const grid = document.getElementById("listings-grid")

  // Clear existing content
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
                    <button class="contact-btn" onclick="goToChat(event)">Contact Seller</button>
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

// Function to update the listings section title with username
function updateListingsTitle() {
  const titleElement = document.querySelector(".listings-section h2")
  if (titleElement) {
    titleElement.textContent = `${profileData.username}'s Listings`
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  renderListings()
  updateListingsTitle()

  // Add simple interaction for the dock items
  const dockItems = document.querySelectorAll(".dock-item")
  dockItems.forEach((item) => {
    item.addEventListener("click", () => {
      // Remove active class from all
      dockItems.forEach((i) => i.classList.remove("active"))
      // Add to clicked
      item.classList.add("active")
    })
  })

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

function goToMessages() {
  window.location.href = "messages.html"
}

// Navigate to listing details page
function goToListing(listingId) {
  window.location.href = `listing.html?id=${listingId}`
}

// Navigate to chat page (contact seller)
function goToChat(event) {
  event.stopPropagation() // Prevent card click
  window.location.href = "chat.html"
}