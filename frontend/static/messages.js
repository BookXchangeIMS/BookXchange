document.addEventListener("DOMContentLoaded", () => {
  // Chat Functionality
  const chatForm = document.getElementById("chatForm")
  const messageInput = document.getElementById("messageInput")
  const chatMessages = document.getElementById("chatMessages")

  // Auto-scroll to bottom on load
  chatMessages.scrollTop = chatMessages.scrollHeight

  chatForm.addEventListener("submit", (e) => {
    e.preventDefault()

    const text = messageInput.value.trim()
    if (!text) return

    // Add User Message
    addMessage(text, "sent")

    // Clear Input
    messageInput.value = ""

    // Simulate Reply
    setTimeout(() => {
      addMessage("That sounds perfect! See you then.", "received")
    }, 1000)
  })

  function addMessage(text, type) {
    const msgDiv = document.createElement("div")
    msgDiv.classList.add("message", type)

    const now = new Date()
    const timeString = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

    msgDiv.innerHTML = `
        <div class="message-content">
            <p>${text}</p>
            <span class="message-time">${timeString}</span>
        </div>
    `

    chatMessages.appendChild(msgDiv)

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight
  }
})
