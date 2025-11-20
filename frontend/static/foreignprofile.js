// Data for the listings
const listings = [
  {
    id: 1,
    title: "Queirós - Os Maias",
    location: "Benfica - Lisboa",
    date: "20/10/25",
    price: "Donation",
    image: "/resources/Maias.png",
  },
  {
    id: 2,
    title: "Tolstoy - War and Peace",
    location: "Benfica - Lisboa",
    date: "20/10/25",
    price: "Xchange",
    image: "/resources/WarAndPeace.png",
  },
  {
    id: 3,
    title: "Orwell - 1984",
    location: "Porto - Centro",
    date: "21/10/25",
    price: "7,50 $",
    image: "/resources/1984.png",
  },
  {
    id: 4,
    title: "Austen - Pride & Prejudice",
    location: "Coimbra",
    date: "22/10/25",
    price: "6,00 $",
    image: "/images/image.png",
  },
  {
    id: 5,
    title: "Dostoyevsky - Crime & Punishment",
    location: "Lisboa",
    date: "23/10/25",
    price: "8,00 $",
    image: "/images/image.png",
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

    // In a real app, we would crop the image properly.
    // Here we use object-fit: cover in CSS to handle it gracefully.

    card.innerHTML = `
            <img src="${book.image}" alt="${book.title}" class="card-image">
            <div class="card-content">
                <h4>${book.title}</h4>
                <div class="card-meta">
                    <span>${book.location}</span>
                    <span>${book.date}</span>
                </div>
                <div class="card-actions">
                    <button class="price-btn">${book.price}</button>
                    <button class="heart-btn" aria-label="Add to favorites">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                    </button>
                </div>
            </div>
        `

    grid.appendChild(card)
  })
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  renderListings()

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
      const svg = btn.querySelector("svg")

      // Toggle fill
      if (svg.getAttribute("fill") === "none") {
        svg.setAttribute("fill", "currentColor")
        svg.setAttribute("stroke", "none")
      } else {
        svg.setAttribute("fill", "none")
        svg.setAttribute("stroke", "currentColor")
      }
    }
  })
})
