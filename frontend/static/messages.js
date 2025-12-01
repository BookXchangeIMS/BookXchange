document.addEventListener("DOMContentLoaded", () => {
    // GLOBAL NAVIGATION FUNCTIONS
    window.goBack = function () { window.history.back(); };
    window.goToHome = function () { window.location.href = 'home.html'; };
    window.goToAnnouncements = function () { window.location.href = 'announcements.html'; };

    // Require login
    if (!isLoggedIn()) {
        window.location.href = 'Login.html';
        return;
    }

    const accessToken = getAccessToken();

    // Query params
    const url = new URL(window.location.href);
    const params = url.searchParams;
    const listingId = params.get("listing_id");
    const sellerIdParam = params.get("seller_id");
    const otherUserIdParam = params.get("user_id");
    const otherUserId = otherUserIdParam || sellerIdParam;

    // Navigation shortcuts
    window.goToFavorites = function () { window.location.href = 'favourites.html'; };
    window.goToMessages = function () { window.location.href = 'mymessages.html'; };
    window.goToProfile = function () { window.location.href = 'profile.html'; };

    // CHAT DOM
    const chatForm = document.getElementById("chatForm");
    const messageInput = document.getElementById("messageInput");
    const chatMessages = document.getElementById("chatMessages");
    const profileNameEl = document.getElementById("profileName");
    const userRoleTextEl = document.getElementById("userRoleText");

    // Listing card DOM
    const listingImageEl = document.getElementById("listingImage");
    const listingTitleEl = document.getElementById("listingTitle");
    const listingAuthorEl = document.getElementById("listingAuthor");
    const listingLocationEl = document.getElementById("listingLocation");
    const listingDateEl = document.getElementById("listingDate");
    const listingPriceEl = document.getElementById("listingPrice");

    let currentUserId = null;

    // ==== Helpers ====

    function formatTime(dateOrString) {
        const d = dateOrString instanceof Date ? dateOrString : new Date(dateOrString);
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

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

    function renderMessages(messages) {
        if (!chatMessages || !Array.isArray(messages)) return;
        chatMessages.innerHTML = "";
        messages.sort((a, b) => new Date(a.SentDate) - new Date(b.SentDate));
        messages.forEach(msg => {
            const type = msg.SenderID === currentUserId ? "sent" : "received";
            appendMessage(msg.Content, type, msg.SentDate);
        });
    }

    function populateListingCard(mapped) {
        if (!mapped) return;
        if (listingImageEl) {
            listingImageEl.src = mapped.imagePath;
            listingImageEl.alt = mapped.title;
            listingImageEl.onerror = function () {
                this.onerror = null;
                this.src = '../static/resources/placeholder.jpg';
            };
        }
        if (listingTitleEl) listingTitleEl.textContent = mapped.title;
        if (listingAuthorEl) listingAuthorEl.textContent = `by ${mapped.author}`;
        if (listingLocationEl) listingLocationEl.textContent = mapped.location;
        if (listingDateEl) listingDateEl.textContent = mapped.date;
        if (listingPriceEl) listingPriceEl.textContent = mapped.price;
    }

    function addSystemMessage(htmlText) {
        if (!chatMessages) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'message system';
        wrapper.innerHTML = `
            <div class="message-content">
                <p>${htmlText}</p>
                <span class="message-time">${formatTime(new Date())}</span>
            </div>
        `;
        chatMessages.appendChild(wrapper);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // ==== Chat init ====

    async function initChat() {
        try {
            if (!listingId || !otherUserId) {
                console.warn("Missing listing_id or other user id in URL, skipping API calls.");
                return;
            }

            const myProfile = await getMyProfile(accessToken);
            currentUserId = myProfile.UserID;

            try {
                const otherProfile = await getUserProfile(otherUserId, accessToken);
                if (profileNameEl && otherProfile && otherProfile.Name) {
                    profileNameEl.textContent = otherProfile.Name;
                }
            } catch (e) {
                console.warn("Could not load other user's profile:", e);
            }

            const dialogue = await getDialogue(otherUserId, listingId, accessToken);
            if (dialogue && Array.isArray(dialogue.Messages)) {
                renderMessages(dialogue.Messages);
            } else if (Array.isArray(dialogue)) {
                renderMessages(dialogue);
            }
        } catch (error) {
            console.error("Error initializing chat:", error);
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

    // Send message
    if (chatForm && messageInput) {
        chatForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const text = messageInput.value.trim();
            if (!text) return;
            if (!listingId || !otherUserId) {
                alert("Cannot send message: missing listing or user information.");
                return;
            }
            appendMessage(text, "sent");
            messageInput.value = "";
            try {
                await sendMessageApi(otherUserId, listingId, text, accessToken);
            } catch (error) {
                console.error("Error sending message:", error);
                appendMessage("Failed to send message. Please try again.", "received");
            }
        });
    }

    // ==== Handshakes / transactions ====

    const dealButton = document.getElementById('dealButton');
    let transactionStatus = -1;   // -1 none, 0 one party, 1 both
    let listingOwnerId = null;
    let buyerId = null;

    function updateDealButtonUI() {
        if (!dealButton) return;
        if (transactionStatus === 1) {
            dealButton.classList.add('deal-confirmed');
            dealButton.innerHTML = '<i class="fas fa-check-circle" style="font-size: 24px; color: white;"></i>';
        } else {
            dealButton.classList.remove('deal-confirmed');
            dealButton.innerHTML = '<img src="../static/resources/handshake.png" width="40" height="40" alt="Handshake" class="handshake-img">';
        }
    }

    function normalizeTransactionStatus(rawStatus) {
        const n = Number(rawStatus);
        if (n === -1 || n === 0 || n === 1) return n;
        // Fallback: treat anything else (null/undefined) as "no transaction yet"
        return -1;
    }

    async function refreshTransactionStatusAndUI(showMessage = true) {
        if (!listingId || !buyerId) return;
        try {
            const raw = await getTransactionStatus(listingId, buyerId, accessToken);
            transactionStatus = normalizeTransactionStatus(raw);
            updateDealButtonUI();

            if (!showMessage) return;

            if (transactionStatus === 0) {
                addSystemMessage(
                    "<strong>🤝 Deal proposal pending.</strong><br>One of you has proposed closing the deal. Press the handshake button if you agree."
                );
            } else if (transactionStatus === 1) {
                addSystemMessage(
                    "<strong>✅ Deal Closed!</strong><br>Both parties confirmed the transaction."
                );
            } else if (transactionStatus === -1) {
                addSystemMessage(
                    "<strong>❌ No active deal.</strong><br>The handshake has been cancelled."
                );
            }
        } catch (e) {
            console.error("Failed to refresh transaction status:", e);
        }
    }

    async function initHandshake() {
        if (!dealButton || !listingId || !otherUserId || !accessToken) return;

        try {
            const listing = await getListingById(listingId, accessToken);
            const mapped = transformListingData(listing);
            populateListingCard(mapped);

            // Figure out who is seller vs buyer
            listingOwnerId = listing.User.UserID;
            if (currentUserId === listingOwnerId) {
                buyerId = parseInt(otherUserId, 10);
            } else {
                buyerId = currentUserId;
            }

            // Set "You are selling / buying"
            if (userRoleTextEl) {
                userRoleTextEl.textContent = (currentUserId === listingOwnerId)
                    ? "You are selling"
                    : "You are buying";
            }

            // Initial status
            await refreshTransactionStatusAndUI(true);
        } catch (e) {
            console.warn('Handshake init failed:', e);
        }
    }

    // Attach handshake button click listener
    if (dealButton && chatMessages) {
        console.log('Attaching handshake click listener');
        dealButton.addEventListener('click', async function () {
            console.log('Handshake button clicked with status', transactionStatus, {
                listingId,
                buyerId
            });

            if (!listingId || !buyerId) {
                alert('Cannot process deal: missing listing or user information.');
                return;
            }

            try {
                if (transactionStatus === -1 || transactionStatus === 0) {
                    // Confirm (first or second party)
                    const confirmed = confirm(
                        "Do you want to confirm this deal? Once both parties confirm, the transaction will be closed."
                    );
                    if (!confirmed) return;

                    try {
                        await confirmTransaction(listingId, buyerId, accessToken);
                    } catch (e) {
                        const msg = String(e.message || "");
                        // If server says already confirmed, just fall through and refresh
                        if (!msg.includes("Transaction already confirmed")) {
                            throw e;
                        }
                    }

                    await refreshTransactionStatusAndUI(true);

                    // Optional: notify other user that you confirmed
                    if (transactionStatus === 0) {
                        try {
                            await sendMessageApi(
                                otherUserId,
                                listingId,
                                "I would like to close the deal for this book. Do you also agree?",
                                accessToken
                            );
                        } catch (err) {
                            console.warn("Failed to send deal proposal message:", err);
                        }
                    }

                } else if (transactionStatus === 1) {
                    // Unconfirm / undo
                    const unconfirmed = confirm(
                        "Do you want to undo your confirmation of this deal?"
                    );
                    if (!unconfirmed) return;

                    await unconfirmTransaction(listingId, buyerId, accessToken);
                    await refreshTransactionStatusAndUI(true);
                }
            } catch (error) {
                console.error('Error handling deal button:', error);
                addSystemMessage(
                    "<strong>⚠️ Deal update failed.</strong><br>Please try again later."
                );
            }
        });
    }

    // ==== Init all ====
    async function initAll() {
        await initChat();
        await initHandshake();
        if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    initAll();
});
