document.addEventListener("DOMContentLoaded", () => {
    // GLOBAL NAVIGATION FUNCTIONS
    window.goBack = function () {
        window.history.back();
    };

    window.goToHome = function () {
        window.location.href = 'home.html';
    };

    window.goToAnnouncements = function () {
        window.location.href = 'announcements.html';
    };

    // Require login
    if (!isLoggedIn()) {
        window.location.href = 'Login.html';
        return;
    }

    const accessToken = getAccessToken();

    // Read query parameters (conversation key = other user + listing)
    const url = new URL(window.location.href);
    const params = url.searchParams; // URLSearchParams API
    const conversationId = params.get("conversation_id"); // reserved for future if you add explicit IDs
    const listingId = params.get("listing_id");
    const sellerIdParam = params.get("seller_id");
    const otherUserIdParam = params.get("user_id");
    // Prefer explicit user_id if present, otherwise fall back to sellerId
    const otherUserId = otherUserIdParam || sellerIdParam;

    console.log("Conversation ID (unused for now):", conversationId);
    console.log("Listing ID:", listingId);
    console.log("Other user ID (seller):", otherUserId);

    // Navigation functions - MUST be in global scope for onclick to work
    window.goToFavorites = function () {
        window.location.href = 'favourites.html';
    };

    // Go to inbox (list of conversations)
    window.goToMessages = function () {
        window.location.href = 'mymessages.html';
    };

    window.goToProfile = function () {
        window.location.href = 'profile.html';
    };

    // CHAT FUNCTIONALITY
    const chatForm = document.getElementById("chatForm");
    const messageInput = document.getElementById("messageInput");
    const chatMessages = document.getElementById("chatMessages");
    const profileNameEl = document.querySelector(".profile-name");

    let currentUserId = null;

    // Helper to format times from ISO strings or Date objects
    function formatTime(dateOrString) {
        const d = dateOrString instanceof Date ? dateOrString : new Date(dateOrString);
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    // Append a single message element to the chat
    function appendMessage(text, type, sentAt = null) {
        if (!chatMessages) return;

        const msgDiv = document.createElement("div");
        msgDiv.classList.add("message", type);

        const timeString = sentAt ? formatTime(sentAt) : formatTime(new Date());

        msgDiv.innerHTML = `
            <div class="message-content">
                <p>${text}</p>
                <span class="message-time">${timeString}</span>
            </div>
        `;

        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Render an array of messages from backend (GetMessage list)
    function renderMessages(messages) {
        if (!chatMessages || !Array.isArray(messages)) return;

        chatMessages.innerHTML = "";

        // Sort by SentDate ascending just in case
        messages.sort((a, b) => new Date(a.SentDate) - new Date(b.SentDate));

        messages.forEach(msg => {
            const type = msg.SenderID === currentUserId ? "sent" : "received";
            appendMessage(msg.Content, type, msg.SentDate);
        });
    }

    // Load current user and dialogue from backend
    async function initChat() {
        try {
            if (!listingId || !otherUserId) {
                console.warn("Missing listing_id or other user id in URL, skipping API calls.");
                return;
            }

            // 1) Get current user profile to know own UserID
            const myProfile = await getMyProfile(accessToken);
            currentUserId = myProfile.UserID;

            // 2) Set sidebar name to the other user's name
            try {
                const otherProfile = await getUserProfile(otherUserId, accessToken);
                if (profileNameEl && otherProfile && otherProfile.Name) {
                    profileNameEl.textContent = otherProfile.Name;
                }
            } catch (e) {
                console.warn("Could not load other user's profile:", e);
            }

            // 3) Get dialogue for (otherUserId, listingId)
            const dialogue = await getDialogue(otherUserId, listingId, accessToken);
            // dialogue.Messages is expected to be a list[GetMessage]
            if (dialogue && Array.isArray(dialogue.Messages)) {
                renderMessages(dialogue.Messages);
            } else if (Array.isArray(dialogue)) {
                // fallback if backend returns array directly
                renderMessages(dialogue);
            } else {
                console.log("No previous messages in this dialogue.");
            }
        } catch (error) {
            console.error("Error initializing chat:", error);
            // Optional: show a simple error message in the chat area
            if (chatMessages) {
                chatMessages.innerHTML = `
                    <div class="message system-error">
                        <div class="message-content">
                            <p>Failed to load conversation. Please try reloading the page.</p>
                        </div>
                    </div>
                `;
            }
        }
    }

    // Initialize chat (load from backend)
    initChat();

    // Auto-scroll to bottom on load (after existing messages, if any)
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Handle sending a new message
    if (chatForm && messageInput) {
        chatForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const text = messageInput.value.trim();
            if (!text) return;

            if (!listingId || !otherUserId) {
                alert("Cannot send message: missing listing or user information.");
                return;
            }

            // Optimistically render the sent message
            appendMessage(text, "sent");
            messageInput.value = "";

            try {
                await sendMessageApi(otherUserId, listingId, text, accessToken);
                // Optionally re-fetch dialogue to ensure perfect sync:
                // const dialogue = await getDialogue(otherUserId, listingId, accessToken);
                // renderMessages(dialogue.Messages || dialogue);
            } catch (error) {
                console.error("Error sending message:", error);
                // Show a simple error message; you could also mark last message as failed
                appendMessage("Failed to send message. Please try again.", "received");
            }
        });
    }

    // TOGGLE DEAL BUTTON FUNCTIONALITY
    const dealButton = document.getElementById('dealButton');
    let isDealConfirmed = false;

    if (dealButton && chatMessages) {
        dealButton.addEventListener('click', function () {
            const now = new Date();
            const timeString = formatTime(now);

            if (!isDealConfirmed) {
                // CONFIRM DEAL
                const confirmed = confirm("Are you sure you want to close the deal? This will mark the transaction as complete.");

                if (confirmed) {
                    dealButton.classList.add('deal-confirmed');
                    dealButton.innerHTML = '<i class="fas fa-check-circle" style="font-size: 24px; color: white;"></i>';

                    const confirmationMsg = document.createElement('div');
                    confirmationMsg.className = 'message sent';
                    confirmationMsg.innerHTML = `
                        <div class="message-content">
                            <p><strong>✅ Deal Closed!</strong><br>Transaction marked as complete.</p>
                            <span class="message-time">${timeString}</span>
                        </div>
                    `;
                    chatMessages.appendChild(confirmationMsg);
                    chatMessages.scrollTop = chatMessages.scrollHeight;

                    isDealConfirmed = true;

                    // Later you can call a handshake/transaction API here
                }
            } else {
                // UNCONFIRM DEAL
                const unconfirmed = confirm("Are you sure you want to undo the deal confirmation?");

                if (unconfirmed) {
                    dealButton.classList.remove('deal-confirmed');
                    dealButton.innerHTML = '<img src="../static/resources/handshake.png" width="40" height="40" alt="Handshake" class="handshake-img">';

                    const unconfirmationMsg = document.createElement('div');
                    unconfirmationMsg.className = 'message sent';
                    unconfirmationMsg.innerHTML = `
                        <div class="message-content">
                            <p><strong>❌ Deal Confirmation Removed</strong><br>Transaction status updated.</p>
                            <span class="message-time">${timeString}</span>
                        </div>
                    `;
                    chatMessages.appendChild(unconfirmationMsg);
                    chatMessages.scrollTop = chatMessages.scrollHeight;

                    isDealConfirmed = false;
                }
            }
        });
    }
});
