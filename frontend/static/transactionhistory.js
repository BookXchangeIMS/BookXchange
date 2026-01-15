// ============================================
// TRANSACTION HISTORY - REWRITTEN FROM SCRATCH
// Robust implementation with proper error handling
// ============================================

// ============================================
// CONSTANTS & STATE
// ============================================

const EMPTY_STATES = {
    purchases: {
        icon: 'fa-shopping-bag',
        message: 'You haven\'t purchased any books yet.',
        subtext: 'When you buy books, they\'ll appear here.'
    },
    sales: {
        icon: 'fa-box-open',
        message: 'You haven\'t sold any books yet.',
        subtext: 'When you sell books, they\'ll appear here.'
    }
};

let currentUserId = null;
let isLoading = false;

// ============================================
// AUTHENTICATION CHECK
// ============================================

if (!isLoggedIn()) {
    window.location.href = '../templates/Login.html';
}

// ============================================
// GLOBAL NAVIGATION
// ============================================

window.goBack = function () {
    window.location.href = 'profile.html';
};

// ============================================
// MAIN INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async function () {
    console.log('[TransactionHistory] Page loaded');
    await initializeTransactionHistory();
});

// ============================================
// INITIALIZE TRANSACTION HISTORY
// ============================================

async function initializeTransactionHistory() {
    if (isLoading) {
        console.log('[TransactionHistory] Already loading, skipping...');
        return;
    }

    isLoading = true;
    showLoadingState();

    try {
        const accessToken = getAccessToken();
        if (!accessToken) {
            throw new Error('No access token found');
        }

        // Step 1: Get current user profile
        console.log('[TransactionHistory] Fetching user profile...');
        const userProfile = await getMyProfile(accessToken);
        currentUserId = userProfile.UserID;
        console.log('[TransactionHistory] Current user ID:', currentUserId);

        // Step 2: Fetch all transactions
        console.log('[TransactionHistory] Fetching transactions...');
        const allTransactions = await fetchTransactions(accessToken);
        console.log('[TransactionHistory] Fetched transactions:', allTransactions.length);

        // Step 3: Separate purchases and sales
        const { purchases, sales } = categorizeTransactions(allTransactions);
        console.log('[TransactionHistory] Purchases:', purchases.length, 'Sales:', sales.length);

        // Step 4: Render both tabs
        await renderPurchases(purchases, accessToken);
        await renderSales(sales, accessToken);

        hideLoadingState();

    } catch (error) {
        console.error('[TransactionHistory] Initialization error:', error);
        showErrorState(error.message);
    } finally {
        isLoading = false;
    }
}

// ============================================
// FETCH TRANSACTIONS
// ============================================

async function fetchTransactions(accessToken) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/get_transaction_history/`, {
            method: 'GET',
            headers: {
                'access-token': accessToken,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                // No transactions found is OK, return empty array
                console.log('[TransactionHistory] No transactions found (404)');
                return [];
            }
            throw new Error(`Failed to fetch transactions: ${response.status}`);
        }

        const data = await response.json();
        return Array.isArray(data) ? data : [];

    } catch (error) {
        console.error('[TransactionHistory] Fetch error:', error);
        // Return empty array on error to allow graceful degradation
        return [];
    }
}

// ============================================
// CATEGORIZE TRANSACTIONS
// ============================================

function categorizeTransactions(transactions) {
    if (!Array.isArray(transactions) || transactions.length === 0) {
        return { purchases: [], sales: [] };
    }

    const purchases = [];
    const sales = [];
    const seenPurchases = new Set();
    const seenSales = new Set();

    for (const transaction of transactions) {
        try {
            // Validate transaction structure
            if (!transaction || !transaction.Listing || !transaction.Buyer) {
                console.warn('[TransactionHistory] Invalid transaction structure:', transaction);
                continue;
            }

            const transactionId = transaction.TransactionID;
            const buyerId = transaction.Buyer.UserID;
            const sellerId = transaction.Listing?.User?.UserID;

            // User is the buyer
            if (buyerId === currentUserId) {
                // Prevent duplicates
                if (!seenPurchases.has(transactionId)) {
                    purchases.push(transaction);
                    seenPurchases.add(transactionId);
                }
            }

            // User is the seller
            if (sellerId === currentUserId && sellerId !== buyerId) {
                // Prevent duplicates and self-transactions
                if (!seenSales.has(transactionId)) {
                    sales.push(transaction);
                    seenSales.add(transactionId);
                }
            }

        } catch (error) {
            console.error('[TransactionHistory] Error categorizing transaction:', error, transaction);
        }
    }

    return { purchases, sales };
}

// ============================================
// RENDER PURCHASES
// ============================================

async function renderPurchases(purchases, accessToken) {
    const grid = document.getElementById('purchasesGrid');
    if (!grid) {
        console.error('[TransactionHistory] Purchases grid not found');
        return;
    }

    grid.innerHTML = '';

    if (purchases.length === 0) {
        grid.innerHTML = createEmptyState('purchases');
        return;
    }

    for (const transaction of purchases) {
        try {
            const card = await createTransactionCard(transaction, 'purchase', accessToken);
            grid.appendChild(card);
        } catch (error) {
            console.error('[TransactionHistory] Error creating purchase card:', error);
        }
    }
}

// ============================================
// RENDER SALES
// ============================================

async function renderSales(sales, accessToken) {
    const grid = document.getElementById('salesGrid');
    if (!grid) {
        console.error('[TransactionHistory] Sales grid not found');
        return;
    }

    grid.innerHTML = '';

    if (sales.length === 0) {
        grid.innerHTML = createEmptyState('sales');
        return;
    }

    for (const transaction of sales) {
        try {
            const card = await createTransactionCard(transaction, 'sale', accessToken);
            grid.appendChild(card);
        } catch (error) {
            console.error('[TransactionHistory] Error creating sale card:', error);
        }
    }
}

// ============================================
// CREATE TRANSACTION CARD
// ============================================

async function createTransactionCard(transaction, type, accessToken) {
    const card = document.createElement('div');
    card.className = 'transaction-card';

    // Extract data with safe fallbacks
    const listing = transaction.Listing || {};
    const book = listing.Book || {};
    const buyer = transaction.Buyer || {};
    const seller = listing.User || {};

    const title = book.Title || 'Untitled Book';
    const author = formatAuthors(book.Author);
    const price = formatPrice(listing.Price);
    const date = formatDate(transaction.TransactionDate);
    const status = getStatusInfo(transaction.TransactionStatus);

    // Get other party name
    const otherParty = type === 'purchase' ? seller.Name || 'Unknown Seller' : buyer.Name || 'Unknown Buyer';

    // Get image - use API_BASE_URL
    const listingId = listing.ListingID;
    const imagePath = listingId
        ? `${API_BASE_URL}/api/get_listing_primary_image?listingid=${listingId}&access_token=${accessToken}`
        : '../static/resources/placeholder.jpg';

    // Build card HTML
    card.innerHTML = `
        <div class="transaction-status-badge ${status.class}">
            <i class="${status.icon}"></i>
            ${status.text}
        </div>
        <img src="${imagePath}" 
             alt="${title}" 
             class="transaction-image"
             onerror="this.src='../static/resources/placeholder.jpg'">
        <div class="transaction-info">
            <h3 class="transaction-title">${escapeHtml(title)}</h3>
            <p class="transaction-author">by ${escapeHtml(author)}</p>
            <div class="transaction-meta">
                <div class="meta-row">
                    <i class="fas fa-user"></i>
                    <span>${type === 'purchase' ? 'Seller' : 'Buyer'}: ${escapeHtml(otherParty)}</span>
                </div>
                <div class="meta-row">
                    <i class="fas fa-calendar"></i>
                    <span>${date}</span>
                </div>
                <div class="meta-row">
                    <i class="fas fa-tag"></i>
                    <span class="transaction-price">${price}</span>
                </div>
            </div>
        </div>
    `;

    // Make clickable
    if (listingId) {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            window.location.href = `listing.html?id=${listingId}`;
        });
    }

    return card;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatAuthors(author) {
    if (!author) return 'Unknown Author';
    if (Array.isArray(author)) {
        return author.length > 0 ? author.join(', ') : 'Unknown Author';
    }
    return String(author);
}

function formatPrice(price) {
    if (!price || price === 0) return 'Free';
    const numPrice = Number(price);
    return isNaN(numPrice) ? 'Free' : `€${numPrice.toFixed(2)}`;
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown date';

    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Unknown date';

        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch (error) {
        console.error('[TransactionHistory] Date formatting error:', error);
        return 'Unknown date';
    }
}

function getStatusInfo(status) {
    switch (Number(status)) {
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

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// UI STATE FUNCTIONS
// ============================================

function createEmptyState(type) {
    const state = EMPTY_STATES[type] || EMPTY_STATES.purchases;

    return `
        <div class="empty-state">
            <i class="fas ${state.icon}" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
            <p style="color: #666; font-size: 18px; margin-bottom: 10px;">${state.message}</p>
            <p style="color: #999; font-size: 14px;">${state.subtext}</p>
        </div>
    `;
}

function showLoadingState() {
    const purchasesGrid = document.getElementById('purchasesGrid');
    const salesGrid = document.getElementById('salesGrid');

    const loadingHTML = `
        <div class="loading-state" style="text-align: center; padding: 60px 20px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 48px; color: #c84c3d; margin-bottom: 20px;"></i>
            <p style="color: #666; font-size: 18px;">Loading your transaction history...</p>
        </div>
    `;

    if (purchasesGrid) purchasesGrid.innerHTML = loadingHTML;
    if (salesGrid) salesGrid.innerHTML = loadingHTML;
}

function hideLoadingState() {
    // Loading states are replaced by actual content or empty states
    console.log('[TransactionHistory] Loading complete');
}

function showErrorState(message) {
    const purchasesGrid = document.getElementById('purchasesGrid');
    const salesGrid = document.getElementById('salesGrid');

    const errorHTML = `
        <div class="error-state" style="text-align: center; padding: 60px 20px;">
            <i class="fas fa-exclamation-circle" style="font-size: 48px; color: #c84c3d; margin-bottom: 20px;"></i>
            <p style="color: #666; font-size: 18px; margin-bottom: 15px;">Failed to load transaction history</p>
            <p style="color: #999; font-size: 14px; margin-bottom: 25px;">${escapeHtml(message)}</p>
            <button onclick="location.reload()" style="padding: 12px 30px; background: #c84c3d; color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600; font-family: 'Plus Jakarta Sans', sans-serif;">
                Try Again
            </button>
        </div>
    `;

    if (purchasesGrid) purchasesGrid.innerHTML = errorHTML;
    if (salesGrid) salesGrid.innerHTML = errorHTML;
}
