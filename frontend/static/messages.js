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
    let socket = null;
    let reconnectInterval = 3000;

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
            const isMe = String(msg.SenderID) === String(currentUserId);
            const type = isMe ? "sent" : "received";
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

    // ==== WebSocket Connection ====

        function connectWebSocket() {
        if (!accessToken) return;

        // Determine URL: Force 127.0.0.1
        let wsBaseUrl = API_BASE_URL.replace(/^http/, 'ws').replace('localhost', '127.0.0.1');
        
        // Clean token
        const cleanToken = accessToken.replace(/['"]+/g, '');
        const wsUrl = `${wsBaseUrl}/ws?token=${encodeURIComponent(cleanToken)}`;
        
        console.log(`[WebSocket] Connecting to: ${wsUrl}`);
        socket = new WebSocket(wsUrl);

        socket.onopen = function(e) {
            console.log("[WebSocket] Connected");
            reconnectInterval = 3000;
        };

        socket.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                console.log("[WebSocket] Received:", data); // Debug Log

                if (data.type === 'message' && data.message) {
                    const msg = data.message;
                    
                    // Convert all IDs to strings for safe comparison
                    const msgListingId = String(msg.ListingID);
                    const msgSenderId = String(msg.SenderID);
                    const currentListingId = String(listingId);
                    const otherUserStr = String(otherUserId);

                    // Only display if it belongs to THIS conversation
                    if (msgListingId === currentListingId) {
                        // If the sender is the person we are talking to, show it
                        if (msgSenderId === otherUserStr) {
                            appendMessage(msg.Content, 'received', msg.SentDate);
                        }
                    }
                }
            } catch (e) {
                console.error("[WebSocket] Parse error:", e);
            }
        };

        socket.onclose = function(event) {
            console.log(`[WebSocket] Closed. Code: ${event.code}`);
            if (event.code !== 1000 && event.code !== 1008) {
                setTimeout(() => connectWebSocket(), reconnectInterval);
            }
        };
        
        socket.onerror = function(e) {
            console.error("[WebSocket] Error:", e);
        };
    }


    // ==== Chat init ====

    async function initChat() {
        try {
            if (!listingId || !otherUserId) {
                console.warn("Missing listing/user info");
                return;
            }

            const myProfile = await getMyProfile(accessToken);
            currentUserId = myProfile.UserID;

            try {
                const otherProfile = await getUserProfile(otherUserId, accessToken);
                if (profileNameEl && otherProfile) profileNameEl.textContent = otherProfile.Name;
            } catch (e) {}

            const dialogue = await getDialogue(otherUserId, listingId, accessToken);
            if (dialogue && Array.isArray(dialogue.Messages)) {
                renderMessages(dialogue.Messages);
            } else if (Array.isArray(dialogue)) {
                renderMessages(dialogue);
            }
        } catch (error) {
            console.error("Chat init error:", error);
        }
    }

    // Send message
    if (chatForm && messageInput) {
        chatForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const text = messageInput.value.trim();
            if (!text) return;

            appendMessage(text, "sent");
            messageInput.value = "";

            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    receiverid: parseInt(otherUserId),
                    listingid: parseInt(listingId),
                    content: text
                }));
            } else {
                await sendMessageApi(otherUserId, listingId, text, accessToken);
            }
        });
    }

    // ==== Handshakes ====
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

    async function refreshTransactionStatusAndUI(showMessage = true) {
        if (!listingId || !buyerId) return;
        try {
            const raw = await getTransactionStatus(listingId, buyerId, accessToken);
            transactionStatus = Number(raw);
            if (isNaN(transactionStatus)) transactionStatus = -1;
            updateDealButtonUI();

            if (!showMessage) return;
            if (transactionStatus === 0) {
                addSystemMessage("<strong>🤝 Deal proposal pending.</strong><br>One of you has proposed closing the deal.");
            } else if (transactionStatus === 1) {
                addSystemMessage("<strong>✅ Deal Closed!</strong><br>Both parties confirmed.");
            }
        } catch (e) { console.error(e); }
    }

    async function initHandshake() {
        if (!dealButton || !listingId || !otherUserId) return;
        try {
            const listing = await getListingById(listingId, accessToken);
            const mapped = transformListingData(listing);
            populateListingCard(mapped);

            listingOwnerId = listing.User.UserID;
            buyerId = (currentUserId === listingOwnerId) ? parseInt(otherUserId) : currentUserId;

            if (userRoleTextEl) userRoleTextEl.textContent = (currentUserId === listingOwnerId) ? "You are selling" : "You are buying";
            await refreshTransactionStatusAndUI(true);
        } catch (e) {}
    }

    if (dealButton) {
        dealButton.addEventListener('click', async function () {
            if (!listingId || !buyerId) return;
            try {
                if (transactionStatus <= 0) {
                    if (!confirm("Confirm deal?")) return;
                    try { await confirmTransaction(listingId, buyerId, accessToken); } catch(e) {}
                    await refreshTransactionStatusAndUI(true);
                    
                    if (transactionStatus === 0) {
                         const dealMsg = "I would like to close the deal. Do you agree?";
                         if (socket && socket.readyState === WebSocket.OPEN) {
                             socket.send(JSON.stringify({receiverid: parseInt(otherUserId), listingid: parseInt(listingId), content: dealMsg}));
                             appendMessage(dealMsg, "sent");
                         } else {
                             await sendMessageApi(otherUserId, listingId, dealMsg, accessToken);
                             appendMessage(dealMsg, "sent");
                         }
                    }
                } else {
                    if (!confirm("Undo deal?")) return;
                    await unconfirmTransaction(listingId, buyerId, accessToken);
                    await refreshTransactionStatusAndUI(true);
                }
            } catch (error) { console.error(error); }
        });
    }

    async function initAll() {
        await initChat();
        connectWebSocket();
        await initHandshake();
        if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    initAll();
});
