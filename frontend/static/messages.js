document.addEventListener("DOMContentLoaded", () => {
    // GLOBAL NAVIGATION FUNCTIONS
    window.goBack = function () {
        window.history.back();
    };

    window.goToHome = function () {
        window.location.href = '../templates/home.html';
    };

    window.goToAnnouncements = function () {
        window.location.href = '/announcements';
    };

    // Require login
    if (!isLoggedIn()) {
        window.location.href = '../templates/Login.html';
    }

    // Navigation functions - MUST be in global scope for onclick to work
    window.goToFavorites = function () {
        window.location.href = '/favourites';
    };

    window.goToMessages = function () {
        window.location.href = '/messages';
    };

    window.goToProfile = function () {
        window.location.href = '/profile';
    };

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
    let otherUserName = "the other party";
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

    function addDealProposalMessage(fromMe) {
        if (!chatMessages) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'message deal-proposal';

        if (fromMe) {
            wrapper.innerHTML = `
                <div class="deal-proposal-content sent-proposal">
                    <div class="deal-icon">🤝</div>
                    <div class="deal-text">
                        <strong>You proposed a deal</strong>
                        <p>Waiting for ${otherUserName} to confirm</p>
                    </div>
                    <span class="message-time">${formatTime(new Date())}</span>
                </div>
            `;
        } else {
            wrapper.innerHTML = `
                <div class="deal-proposal-content received-proposal">
                    <div class="deal-icon">🤝</div>
                    <div class="deal-text">
                        <strong>${otherUserName} proposed a deal!</strong>
                        <p>Click the handshake button to confirm</p>
                    </div>
                    <span class="message-time">${formatTime(new Date())}</span>
                </div>
            `;
        }

        chatMessages.appendChild(wrapper);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function addTransactionStatusMessage(status, confirmedByBuyer, confirmedBySeller) {
        if (!chatMessages) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'message transaction-status';

        const iAmBuyer = !iAmSeller;
        const iConfirmed = iAmSeller ? confirmedBySeller : confirmedByBuyer;
        const otherConfirmed = iAmSeller ? confirmedByBuyer : confirmedBySeller;

        let content = '';

        if (status === 1) {
            // Both confirmed - Deal closed!
            content = `
                <div class="status-content deal-closed">
                    <div class="status-icon">✅</div>
                    <div class="status-text">
                        <strong>Deal Closed!</strong>
                        <p>Both parties have confirmed the transaction</p>
                    </div>
                    <span class="message-time">${formatTime(new Date())}</span>
                </div>
            `;
        } else if (status === 0) {
            // One party confirmed
            if (iConfirmed && !otherConfirmed) {
                content = `
                    <div class="status-content partial-confirm">
                        <div class="status-icon">⏳</div>
                        <div class="status-text">
                            <strong>Deal Status</strong>
                            <div class="confirmation-status">
                                <span class="confirmed">✓ You: Confirmed</span>
                                <span class="unconfirmed">○ ${otherUserName}: Pending</span>
                            </div>
                        </div>
                        <span class="message-time">${formatTime(new Date())}</span>
                    </div>
                `;
            } else if (!iConfirmed && otherConfirmed) {
                content = `
                    <div class="status-content partial-confirm">
                        <div class="status-icon">🤝</div>
                        <div class="status-text">
                            <strong>Deal Status</strong>
                            <div class="confirmation-status">
                                <span class="confirmed">✓ ${otherUserName}: Confirmed</span>
                                <span class="unconfirmed">○ You: Pending</span>
                            </div>
                            <p class="action-hint">Click the handshake to confirm!</p>
                        </div>
                        <span class="message-time">${formatTime(new Date())}</span>
                    </div>
                `;
            }
        }

        wrapper.innerHTML = content;
        chatMessages.appendChild(wrapper);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // ==== WebSocket Connection ====

    function connectWebSocket() {
        if (!accessToken) return;

        let wsBaseUrl = API_BASE_URL.replace(/^http/, 'ws').replace('localhost', '127.0.0.1');
        const cleanToken = accessToken.replace(/['"]+/g, '');
        const wsUrl = `${wsBaseUrl}/ws?token=${encodeURIComponent(cleanToken)}`;

        console.log(`[WebSocket] Connecting to: ${wsUrl}`);
        socket = new WebSocket(wsUrl);

        socket.onopen = function (e) {
            console.log("[WebSocket] Connected");
            reconnectInterval = 3000;
        };

        socket.onmessage = function (event) {
            try {
                const data = JSON.parse(event.data);
                console.log("[WebSocket] Received:", data);

                if (data.type === 'message' && data.message) {
                    const msg = data.message;
                    const msgListingId = String(msg.ListingID);
                    const msgSenderId = String(msg.SenderID);
                    const currentListingId = String(listingId);
                    const otherUserStr = String(otherUserId);

                    if (msgListingId === currentListingId) {
                        if (msgSenderId === otherUserStr) {
                            appendMessage(msg.Content, 'received', msg.SentDate);
                        }
                    }
                }
            } catch (e) {
                console.error("[WebSocket] Parse error:", e);
            }
        };

        socket.onclose = function (event) {
            console.log(`[WebSocket] Closed. Code: ${event.code}`);
            if (event.code !== 1000 && event.code !== 1008) {
                setTimeout(() => connectWebSocket(), reconnectInterval);
            }
        };

        socket.onerror = function (e) {
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
                if (otherProfile) {
                    otherUserName = otherProfile.Name;
                    if (profileNameEl) profileNameEl.textContent = otherProfile.Name;
                }
            } catch (e) {
                console.error("Error fetching other user profile:", e);
            }

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
    let transactionStatus = -1;
    let confirmedByBuyer = false;
    let confirmedBySeller = false;
    let listingOwnerId = null;
    let buyerId = null;
    let iAmSeller = false;

    function updateDealButtonUI() {
        if (!dealButton) return;

        const myConfirmationStatus = iAmSeller ? confirmedBySeller : confirmedByBuyer;
        const otherConfirmationStatus = iAmSeller ? confirmedByBuyer : confirmedBySeller;

        if (transactionStatus === 1) {
            // Both confirmed - show green checkmark
            dealButton.classList.add('deal-confirmed');
            dealButton.innerHTML = '<i class="fas fa-check-circle" style="font-size: 24px; color: white;"></i>';
            dealButton.title = "Deal closed - both parties confirmed";
        } else if (myConfirmationStatus && !otherConfirmationStatus) {
            // I confirmed, waiting for other party
            dealButton.classList.add('deal-confirmed');
            dealButton.innerHTML = '<i class="fas fa-clock" style="font-size: 24px; color: white;"></i>';
            dealButton.title = "Waiting for other party to confirm";
        } else if (!myConfirmationStatus && otherConfirmationStatus) {
            // Other party confirmed, waiting for me
            dealButton.classList.remove('deal-confirmed');
            dealButton.innerHTML = '<img src="../static/resources/handshake.png" width="40" height="40" alt="Handshake" class="handshake-img">';
            dealButton.title = "Other party confirmed - click to confirm deal";
            dealButton.style.animation = 'pulse 1.5s ease-in-out infinite';
        } else {
            // No confirmations yet
            dealButton.classList.remove('deal-confirmed');
            dealButton.innerHTML = '<img src="../static/resources/handshake.png" width="40" height="40" alt="Handshake" class="handshake-img">';
            dealButton.title = "Click to propose deal";
            dealButton.style.animation = '';
        }
    }

    async function refreshTransactionStatusAndUI(showMessage = true) {
        if (!listingId || !buyerId) return;
        try {
            const result = await getTransactionStatus(listingId, buyerId, accessToken);

            const oldStatus = transactionStatus;
            const oldBuyer = confirmedByBuyer;
            const oldSeller = confirmedBySeller;

            transactionStatus = Number(result.status);
            confirmedByBuyer = Boolean(result.confirmedByBuyer);
            confirmedBySeller = Boolean(result.confirmedBySeller);

            if (isNaN(transactionStatus)) transactionStatus = -1;

            console.log('[Transaction Status]', {
                status: transactionStatus,
                buyer: confirmedByBuyer,
                seller: confirmedBySeller,
                iAmSeller: iAmSeller
            });

            updateDealButtonUI();

            if (!showMessage) return;

            // Show message based on status change
            if (transactionStatus === 1 && oldStatus !== 1) {
                // Just reached full confirmation
                addTransactionStatusMessage(1, confirmedByBuyer, confirmedBySeller);
            } else if (transactionStatus === 0) {
                // One party confirmed
                const myConfirmation = iAmSeller ? confirmedBySeller : confirmedByBuyer;
                const otherConfirmation = iAmSeller ? confirmedByBuyer : confirmedBySeller;

                // Check if this is a new proposal or status change
                if (oldStatus === -1 || oldStatus !== transactionStatus || oldBuyer !== confirmedByBuyer || oldSeller !== confirmedBySeller) {
                    addTransactionStatusMessage(0, confirmedByBuyer, confirmedBySeller);
                }
            }
        } catch (e) {
            console.error('Error refreshing transaction status:', e);
        }
    }

    async function initHandshake() {
        if (!dealButton || !listingId || !otherUserId) return;
        try {
            const listing = await getListingById(listingId, accessToken);
            const mapped = transformListingData(listing);
            populateListingCard(mapped);

            listingOwnerId = listing.User.UserID;
            buyerId = (currentUserId === listingOwnerId) ? parseInt(otherUserId) : currentUserId;
            iAmSeller = (currentUserId === listingOwnerId);

            if (userRoleTextEl) {
                userRoleTextEl.textContent = iAmSeller ? "You are selling" : "You are buying";
            }

            await refreshTransactionStatusAndUI(true);
        } catch (e) {
            console.error('Error initializing handshake:', e);
        }
    }

    if (dealButton) {
        dealButton.addEventListener('click', async function () {
            if (!listingId || !buyerId) return;

            const myConfirmation = iAmSeller ? confirmedBySeller : confirmedByBuyer;

            try {
                if (!myConfirmation) {
                    // User wants to confirm
                    if (!confirm("Do you want to confirm this deal?")) return;

                    const wasNoTransaction = (transactionStatus === -1);

                    try {
                        await confirmTransaction(listingId, buyerId, accessToken);
                        console.log('[Transaction] Confirmed successfully');
                    } catch (e) {
                        console.error('[Transaction] Confirm failed:', e);
                        alert('Failed to confirm transaction. Please try again.');
                        return;
                    }

                    // Refresh status
                    await refreshTransactionStatusAndUI(false);

                    // Show appropriate message
                    if (wasNoTransaction) {
                        // First person to propose
                        addDealProposalMessage(true);
                    } else {
                        // Second person confirming
                        addTransactionStatusMessage(transactionStatus, confirmedByBuyer, confirmedBySeller);
                    }
                } else {
                    // User wants to undo confirmation
                    if (!confirm("Do you want to undo your deal confirmation?")) return;

                    try {
                        await unconfirmTransaction(listingId, buyerId, accessToken);
                        console.log('[Transaction] Unconfirmed successfully');
                    } catch (e) {
                        console.error('[Transaction] Unconfirm failed:', e);
                        alert('Failed to undo confirmation. Please try again.');
                        return;
                    }

                    await refreshTransactionStatusAndUI(false);

                    // Show updated status
                    if (transactionStatus === 0) {
                        addTransactionStatusMessage(0, confirmedByBuyer, confirmedBySeller);
                    }
                }
            } catch (error) {
                console.error('Transaction error:', error);
                alert('An error occurred. Please try again.');
            }
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
