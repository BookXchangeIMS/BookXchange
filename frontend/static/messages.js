document.addEventListener("DOMContentLoaded", () => {
    // GLOBAL NAVIGATION FUNCTIONS
    window.goBack = function() {
        window.history.back();
    };

    window.goToHome = function() {
        window.location.href = 'home.html';
    };

    window.goToAnnouncements = function() {
        window.location.href = 'announcements.html';
    };

    window.goToFavorites = function() {
        window.location.href = 'favourites.html';
    };

    window.goToMessages = function() {
        window.location.href = 'messages.html';
    };

    window.goToProfile = function() {
        window.location.href = 'profile.html';
    };

    // CHAT FUNCTIONALITY
    const chatForm = document.getElementById("chatForm");
    const messageInput = document.getElementById("messageInput");
    const chatMessages = document.getElementById("chatMessages");

    // Auto-scroll to bottom on load
    chatMessages.scrollTop = chatMessages.scrollHeight;

    chatForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const text = messageInput.value.trim();
        if (!text) return;

        addMessage(text, "sent");
        messageInput.value = "";

        // Simulate Reply
        setTimeout(() => {
            addMessage("That sounds perfect! See you then.", "received");
        }, 1000);
    });

    function addMessage(text, type) {
        const msgDiv = document.createElement("div");
        msgDiv.classList.add("message", type);

        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        msgDiv.innerHTML = `
            <div class="message-content">
                <p>${text}</p>
                <span class="message-time">${timeString}</span>
            </div>
        `;

        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // TOGGLE DEAL BUTTON FUNCTIONALITY
    const dealButton = document.getElementById('dealButton');
    let isDealConfirmed = false;

    dealButton.addEventListener('click', function() {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

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
});
