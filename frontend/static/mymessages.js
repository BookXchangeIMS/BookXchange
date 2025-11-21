// Import Lucide icons library
import lucide from "lucide"

// Wait for DOM to load
document.addEventListener("DOMContentLoaded", () => {
  // Initialize Lucide icons
  lucide.createIcons()

  // Search Filter Functionality
  const searchInput = document.getElementById("searchInput")
  const messageList = document.getElementById("messageList")
  const cards = messageList.getElementsByClassName("message-card")
  const messageCountElement = document.getElementById("messageCount")

  searchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase()
    let visibleCount = 0

    Array.from(cards).forEach((card) => {
      const title = card.querySelector("h3").textContent.toLowerCase()
      const message = card.querySelector("p").textContent.toLowerCase()

      if (title.includes(searchTerm) || message.includes(searchTerm)) {
        card.style.display = "flex"
        visibleCount++
      } else {
        card.style.display = "none"
      }
    })

    // Update message count based on search results
    // If search is empty, reset to actual total (4) or dynamic count
    if (searchTerm === "") {
      messageCountElement.textContent = cards.length
    } else {
      messageCountElement.textContent = visibleCount
    }
  })

  // Add hover effects or click handlers for cards
  Array.from(cards).forEach((card) => {
    card.addEventListener("click", () => {
      // Simple visual feedback
      card.style.backgroundColor = "#F0EAD6" // Slightly darker
      setTimeout(() => {
        card.style.backgroundColor = ""
      }, 200)

      console.log("Card clicked:", card.querySelector("h3").textContent)
    })
  })

  // Navigation active state toggle (demo)
  const navButtons = document.querySelectorAll(".nav-btn, .nav-item")

  navButtons.forEach((btn) => {
    btn.addEventListener("click", function () {
      // Remove active class from siblings/all nav items in the same group
      const isMobile = this.classList.contains("nav-btn")
      const selector = isMobile ? ".nav-btn" : ".nav-item"

      document.querySelectorAll(selector).forEach((b) => b.classList.remove("active"))
      this.classList.add("active")
    })
  })
})