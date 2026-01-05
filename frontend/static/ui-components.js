/**
 * Shared UI Components for BookXchange Frontend
 * Reusable component creation functions
 */

/**
 * Create a book card element
 * @param {Object} book - Book data object
 * @param {Object} options - Configuration options
 * @param {boolean} options.showFavoriteButton - Show favorite button (default: true)
 * @param {boolean} options.showContactButton - Show contact button (default: true)
 * @param {boolean} options.showEditButton - Show edit button (default: false)
 * @param {Function} options.onCardClick - Callback when card is clicked
 * @param {Function} options.onFavoriteClick - Callback when favorite button is clicked
 * @param {Function} options.onContactClick - Callback when contact button is clicked
 * @param {Function} options.onEditClick - Callback when edit button is clicked
 * @returns {HTMLElement} - Book card element
 */
function createBookCard(book, options = {}) {
    const {
        showFavoriteButton = true,
        showContactButton = true,
        showEditButton = false,
        onCardClick = null,
        onFavoriteClick = null,
        onContactClick = null,
        onEditClick = null
    } = options;

    const card = document.createElement('div');
    card.className = 'book-card';

    // Build action buttons HTML
    let actionsHTML = '<div class="book-actions">';

    if (showContactButton) {
        actionsHTML += `
            <button class="contact-btn">
                Contact Seller
            </button>
        `;
    }

    if (showEditButton) {
        actionsHTML += `
            <button class="edit-btn">
                Edit Listing
            </button>
        `;
    }

    if (showFavoriteButton) {
        const favoriteClass = book.isFavorite ? 'active' : '';
        actionsHTML += `
            <button class="favorite-btn ${favoriteClass}">
                <i class="fas fa-heart"></i>
            </button>
        `;
    }

    actionsHTML += '</div>';

    // Build card HTML
    card.innerHTML = `
        <img src="${book.imagePath || book.Image_Path}" 
             alt="${escapeHtml(book.title || book.Name)}" 
             class="book-image" 
             onerror="this.src='../static/resources/placeholder.jpg'"
             loading="lazy">
        <div class="book-info">
            <div class="book-title">${escapeHtml(book.title || book.Name)}</div>
            ${book.author ? `<div class="book-author">by ${escapeHtml(book.author)}</div>` : ''}
            ${book.location || book.Location ? `<div class="book-location">${escapeHtml(book.location || book.Location)}</div>` : ''}
            ${book.date ? `<div class="book-date">${escapeHtml(book.date)}</div>` : ''}
            ${book.price ? `<div class="book-price">${escapeHtml(book.price)}</div>` : ''}
            ${actionsHTML}
        </div>
    `;

    // Setup event listeners
    const contactBtn = card.querySelector('.contact-btn');
    const editBtn = card.querySelector('.edit-btn');
    const favoriteBtn = card.querySelector('.favorite-btn');

    if (contactBtn && onContactClick) {
        contactBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onContactClick(book.id || book.ListingID);
        });
    }

    if (editBtn && onEditClick) {
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onEditClick(book.id || book.ListingID);
        });
    }

    if (favoriteBtn && onFavoriteClick) {
        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onFavoriteClick(book.id || book.ListingID);
        });
    }

    // Make card clickable
    if (onCardClick) {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.contact-btn') &&
                !e.target.closest('.edit-btn') &&
                !e.target.closest('.favorite-btn')) {
                onCardClick(book.id || book.ListingID);
            }
        });
    }

    return card;
}

/**
 * Create pagination controls
 * @param {number} currentPage - Current page number (1-indexed)
 * @param {number} totalPages - Total number of pages
 * @param {Function} onPageChange - Callback when page changes
 * @returns {HTMLElement} - Pagination controls container
 */
function createPaginationControls(currentPage, totalPages, onPageChange) {
    const container = document.createElement('div');
    container.className = 'pagination-controls';
    container.style.cssText = `
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 10px;
        margin-top: 30px;
        flex-wrap: wrap;
    `;

    if (totalPages < 2) return container;

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Previous';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => onPageChange(currentPage - 1);
    styleButton(prevBtn);
    container.appendChild(prevBtn);

    // Page numbers (up to 5, with ... for gaps)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    if (currentPage === 1) endPage = Math.min(totalPages, 5);
    if (currentPage === totalPages) startPage = Math.max(1, totalPages - 4);

    if (startPage > 1) {
        container.appendChild(makePageButton(1, currentPage, onPageChange));
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.style.padding = '0 5px';
            container.appendChild(ellipsis);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        container.appendChild(makePageButton(i, currentPage, onPageChange));
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.style.padding = '0 5px';
            container.appendChild(ellipsis);
        }
        container.appendChild(makePageButton(totalPages, currentPage, onPageChange));
    }

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => onPageChange(currentPage + 1);
    styleButton(nextBtn);
    container.appendChild(nextBtn);

    return container;
}

/**
 * Helper function to create a page number button
 * @private
 */
function makePageButton(pageNum, currentPage, onPageChange) {
    const btn = document.createElement('button');
    btn.textContent = pageNum;
    btn.disabled = currentPage === pageNum;
    btn.onclick = () => onPageChange(pageNum);
    styleButton(btn, currentPage === pageNum);
    return btn;
}

/**
 * Helper function to style pagination buttons
 * @private
 */
function styleButton(btn, isActive = false) {
    btn.style.margin = '0 5px';
    btn.style.padding = '6px 12px';
    btn.style.borderRadius = '7px';
    btn.style.border = 'none';
    btn.style.background = isActive || btn.disabled ? '#d6d6d6' : '#c84c3d';
    btn.style.color = '#fff';
    btn.style.fontWeight = '600';
    btn.style.cursor = btn.disabled ? 'not-allowed' : 'pointer';
    btn.style.fontFamily = "'Segoe UI', sans-serif";
}

/**
 * Create an empty state component
 * @param {string} icon - FontAwesome icon class (e.g., 'fa-book-open')
 * @param {string} message - Main message to display
 * @param {string} subMessage - Subtitle message
 * @param {Object} actionButton - Optional action button config {text, onClick}
 * @returns {HTMLElement} - Empty state element
 */
function createEmptyState(icon, message, subMessage, actionButton = null) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.style.cssText = `
        grid-column: 1/-1;
        text-align: center;
        padding: 60px 20px;
    `;

    let buttonHTML = '';
    if (actionButton) {
        buttonHTML = `
            <button class="empty-state-btn" style="
                margin-top: 20px;
                padding: 12px 30px;
                background: #c84c3d;
                color: white;
                border: none;
                border-radius: 25px;
                cursor: pointer;
                font-weight: 600;
                font-family: 'Segoe UI', sans-serif;
            ">
                ${actionButton.text}
            </button>
        `;
    }

    emptyState.innerHTML = `
        <i class="fas ${icon}" style="font-size: 48px; color: #c84c3d; margin-bottom: 20px;"></i>
        <p style="color: #666; font-size: 18px;">${message}</p>
        <small style="color: #999;">${subMessage}</small>
        ${buttonHTML}
    `;

    if (actionButton) {
        const btn = emptyState.querySelector('.empty-state-btn');
        btn.addEventListener('click', actionButton.onClick);
    }

    return emptyState;
}

/**
 * Create skeleton loader cards
 * @param {number} count - Number of skeleton cards to create
 * @returns {DocumentFragment} - Fragment containing skeleton cards
 */
function createSkeletonLoader(count = 4) {
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < count; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-card';
        fragment.appendChild(skeleton);
    }

    return fragment;
}

/**
 * Display books in a grid with optional pagination
 * @param {Array} books - Array of book objects
 * @param {HTMLElement} container - Container element to render books in
 * @param {Object} options - Configuration options
 * @param {number} options.currentPage - Current page number (for pagination)
 * @param {number} options.pageSize - Number of items per page
 * @param {Function} options.onPageChange - Callback for page changes
 * @param {Object} options.cardOptions - Options to pass to createBookCard
 * @param {Object} options.emptyState - Empty state config {icon, message, subMessage, actionButton}
 */
function displayBooks(books, container, options = {}) {
    const {
        currentPage = 1,
        pageSize = null,
        onPageChange = null,
        cardOptions = {},
        emptyState = null
    } = options;

    if (!container) return;
    container.innerHTML = '';

    // Handle pagination if enabled
    let displayBooks = books;
    let totalPages = 1;

    if (pageSize && pageSize > 0) {
        totalPages = Math.ceil(books.length / pageSize) || 1;
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        displayBooks = books.slice(start, end);
    }

    // Show empty state if no books
    if (displayBooks.length === 0) {
        if (emptyState) {
            container.appendChild(createEmptyState(
                emptyState.icon,
                emptyState.message,
                emptyState.subMessage,
                emptyState.actionButton
            ));
        } else {
            container.appendChild(createEmptyState(
                'fa-book-open',
                'No books available',
                'Check back later for new listings!'
            ));
        }
        return;
    }

    // Create and append book cards
    displayBooks.forEach(book => {
        const bookCard = createBookCard(book, cardOptions);
        container.appendChild(bookCard);
    });

    // Add staggered animation
    const cards = container.querySelectorAll('.book-card');
    staggeredFadeIn(cards, 100);

    // Add pagination if enabled
    if (pageSize && onPageChange && totalPages > 1) {
        const paginationContainer = document.getElementById('paginationControls');
        if (paginationContainer) {
            paginationContainer.innerHTML = '';
            const pagination = createPaginationControls(currentPage, totalPages, onPageChange);
            paginationContainer.appendChild(pagination);
        }
    }
}
