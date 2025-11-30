// Require login
if (!isLoggedIn()) {
    window.location.href = 'Login.html';
}

// State
let allTransactions = [];
let purchases = [];
let sales = [];
let currentUserId = null;

// DOM elements
const purchasesGrid = document.getElementById('purchasesGrid');
const salesGrid = document.getElementById('salesGrid');

// ============================================
// GLOBAL NAVIGATION FUNCTIONS
// ============================================

window.goBack = function () {
    window.history.back();
};

// ============================================
// PAGE INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async function () {
    try {
        await loadTransactionHistory();
    } catch (error) {
        console.error('Error loading transaction history:', error);
        showError('Failed to load transaction history. Please try again later.');
    }
});

// ============================================
// LOAD TRANSACTION HISTORY
// ============================================

async function loadTransactionHistory() {
    try {
        const accessToken = getAccessToken();

        // Get current user's profile to know their ID
        const currentUser = await getMyProfile(accessToken);
        currentUserId = currentUser.UserID;

        // Fetch transaction history
        allTransactions = await getTransactionHistory(accessToken);

        // Separate into purchases and sales
        purchases = allTransactions.filter(t => t.Buyer.UserID === currentUserId);
        sales = allTransactions.filter(t => t.Listing.User.UserID === currentUserId);

        // Render transactions
        renderTransactions(purchases, purchasesGrid, 'purchase');
        renderTransactions(sales, salesGrid, 'sale');

    } catch (error) {
        console.error('Error in loadTransactionHistory:', error);

        // If 404, it means no transactions found
        if (error.message.includes('404')) {
            renderTransactions([], purchasesGrid, 'purchase');
            renderTransactions([], salesGrid, 'sale');
        } else {
            throw error;
        }
    }
}

// ============================================
// RENDER TRANSACTIONS
// ============================================

function renderTransactions(transactions, gridElement, type) {
    if (!gridElement) return;

    gridElement.innerHTML = '';

    if (transactions.length === 0) {
        const emptyMessage = type === 'purchase'
            ? 'You haven\'t purchased any books yet.'
            : 'You haven\'t sold any books yet.';

        gridElement.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-${type === 'purchase' ? 'shopping-bag' : 'box-open'}" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
                <p style="color: #666; font-size: 18px;">${emptyMessage}</p>
            </div>
        `;
        return;
    }

    transactions.forEach(transaction => {
        const card = createTransactionCard(transaction, type);
        gridElement.appendChild(card);
    });
}

// ============================================
// CREATE TRANSACTION CARD
// ============================================

function createTransactionCard(transaction, type) {
    const card = document.createElement('div');
    card.className = 'transaction-card';

    // Format date
    const date = new Date(transaction.TransactionDate);
    const formattedDate = date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });

    // Get status info
    const statusInfo = getStatusInfo(transaction.TransactionStatus);

    // Get other party name
    const otherParty = type === 'purchase'
        ? transaction.Listing.User.Name
        : transaction.Buyer.Name;

    // Format price
    const price = transaction.Listing.Price
        ? `€${transaction.Listing.Price.toFixed(2)}`
        : 'Free';

    // Get book title and author
    const title = transaction.Listing.Book.Title || 'Untitled';
    const author = Array.isArray(transaction.Listing.Book.Author)
        ? transaction.Listing.Book.Author.join(', ')
        : transaction.Listing.Book.Author || 'Unknown Author';

    // Image path
    const accessToken = getAccessToken();
    const imagePath = `http://localhost:8000/api/get_listing_primary_image?listingid=${transaction.Listing.ListingID}&access_token=${accessToken}`;

    card.innerHTML = `
        <div class="transaction-status-badge ${statusInfo.class}">
            <i class="${statusInfo.icon}"></i>
            ${statusInfo.text}
        </div>
        <img src="${imagePath}" 
             alt="${title}" 
             class="transaction-image"
             onerror="this.src='../static/resources/placeholder.jpg'">
        <div class="transaction-info">
            <h3 class="transaction-title">${title}</h3>
            <p class="transaction-author">by ${author}</p>
            <div class="transaction-meta">
                <div class="meta-row">
                    <i class="fas fa-user"></i>
                    <span>${type === 'purchase' ? 'Seller' : 'Buyer'}: ${otherParty}</span>
                </div>
                <div class="meta-row">
                    <i class="fas fa-calendar"></i>
                    <span>${formattedDate}</span>
                </div>
                <div class="meta-row">
                    <i class="fas fa-tag"></i>
                    <span class="transaction-price">${price}</span>
                </div>
            </div>
        </div>
    `;

    // Make card clickable
    card.addEventListener('click', () => {
        window.location.href = `listing.html?id=${transaction.Listing.ListingID}`;
    });

    return card;
}

// ============================================
// GET STATUS INFO
// ============================================

function getStatusInfo(status) {
    switch (status) {
        case 0:
            return {
                text: 'Pending',
                class: 'status-pending',
                icon: 'fas fa-clock'
            };
        case 1:
            return {
                text: 'Completed',
                class: 'status-completed',
                icon: 'fas fa-check-circle'
            };
        default:
            return {
                text: 'Unknown',
                class: 'status-unknown',
                icon: 'fas fa-question-circle'
            };
    }
}

// ============================================
// ERROR HANDLING
// ============================================

function showError(message) {
    const container = document.querySelector('.transactions-container');
    if (container) {
        container.innerHTML = `
            <div class="error-container">
                <i class="fas fa-exclamation-circle" style="font-size: 48px; color: #c84c3d; margin-bottom: 20px;"></i>
                <p style="color: #666; font-size: 18px;">${message}</p>
                <button onclick="loadTransactionHistory()" style="margin-top: 20px; padding: 12px 30px; background: #c84c3d; color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600; font-family: 'Plus Jakarta Sans', sans-serif;">
                    Try Again
                </button>
            </div>
        `;
    }
}
