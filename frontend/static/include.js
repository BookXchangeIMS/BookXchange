function loadHTML() {
    let headerLoaded = false;
    let footerLoaded = false;

    const API_BASE_URL = (typeof ENV !== 'undefined' && ENV.API_BASE_URL) || 'http://localhost:8000';

    // Function to check if both components are loaded
    function checkAllLoaded() {
        if (headerLoaded && footerLoaded) {
            // Set active footer button after loading
            setActiveFooterButton();

            // Dispatch custom event when all components are loaded
            document.dispatchEvent(new Event('componentsLoaded'));
        }
    }

    // Load Header
    const headerPlaceholder = document.getElementById('header-placeholder');
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (API_BASE_URL !== 'http://localhost:8000') {
        if (headerPlaceholder) {
            fetch('/BookXchange/frontend/templates/header.html')
                .then(response => response.text())
                .then(data => {
                    headerPlaceholder.innerHTML = data;
                    headerLoaded = true;
                    checkAllLoaded();
                })
                .catch(error => {
                    console.error('Error loading header:', error);
                    headerLoaded = true;
                    checkAllLoaded();
                });
        } else {
            headerLoaded = true;
        }

        // Load Footer

        if (footerPlaceholder) {
            fetch('/BookXchange/frontend/templates/footer.html')
                .then(response => response.text())
                .then(data => {
                    footerPlaceholder.innerHTML = data;
                    footerLoaded = true;
                    checkAllLoaded();
                })
                .catch(error => {
                    console.error('Error loading footer:', error);
                    footerLoaded = true;
                    checkAllLoaded();
                });
        } else {
            footerLoaded = true;
        }
    }
    else {
        headerPlaceholder.innerHTML = `<header>
    <div class="logo">
        <div class="logo-icon" onclick="goToHome()" style="cursor: pointer;">
            <img src="../static/resources/svg/BookLogo.svg" class="book-svg" alt="BookXchange Logo">
        </div>
    </div>

    <div class="search-bar">
        <input type="text" placeholder="Find books..." id="searchInput">
        <button class="filter-btn" id="filterBtn" aria-label="Filter search">
            <i class="fas fa-sliders-h"></i>
        </button>
        <i class="fas fa-search search-icon"></i>
    </div>

    <div class="header-actions">
        <button class="chat-btn" onclick="goToMessages()">
            <i class="fas fa-comments"></i>
        </button>
        <button class="leaderboard-btn" onclick="window.location.href='../templates/leaderboard.html'">
            <i class="fas fa-trophy"></i>
        </button>
        <button class="profile-btn" onclick="goToProfile()">
            <i class="fas fa-user"></i>
        </button>
    </div>
</header>`;
        footerPlaceholder.innerHTML = `<nav class="bottom-nav">
    <button class="nav-btn" data-page="home" onclick="goToHome()">
        <img src="../static/resources/svg/book_botton.svg" alt="BookXchange Logo" class="btn-icon-active">
        <img src="../static/resources/svg/book_botton_inactive.svg" alt="BookXchange Logo" class="btn-icon-inactive">
    </button>
    <button class="nav-btn" data-page="announcements" onclick="goToAnnouncements()">
        <i class="fas fa-plus"></i>
    </button>
    <button class="nav-btn" data-page="favourites" onclick="goToFavorites()">
        <i class="fas fa-heart"></i>
    </button>
</nav>`;
        headerLoaded = true;
        footerLoaded = true;
    }

    // If neither component exists, mark as loaded
    if (!headerPlaceholder && !footerPlaceholder) {
        checkAllLoaded();
    }
}

// Set active footer button based on current page
function setActiveFooterButton() {
    // Get current page filename from URL
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '').toLowerCase();

    // Get all footer navigation buttons
    const navButtons = document.querySelectorAll('.bottom-nav .nav-btn');

    // Remove active class from all buttons
    navButtons.forEach(btn => btn.classList.remove('active'));

    // Add active class to current page button
    navButtons.forEach(btn => {
        const btnPage = btn.getAttribute('data-page');
        if (btnPage === currentPage) {
            btn.classList.add('active');
        }
    });
}

// Global Search Functionality
const SearchManager = {
    searchData: [],
    displayCallback: null,

    // Initialize search with data and display callback
    init: function (data, callback) {
        this.searchData = data;
        this.displayCallback = callback;
        this.setupSearchListener();
    },

    // Setup search input listener
    setupSearchListener: function () {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e));
        }
    },

    // Handle search logic
    handleSearch: function (e) {
        const searchTerm = e.target.value.toLowerCase().trim();

        if (!searchTerm) {
            // If search is empty, show all data
            if (this.displayCallback) {
                this.displayCallback(this.searchData);
            }
            return;
        }

        // Filter data based on search term
        const filtered = this.searchData.filter(item =>
            item.title.toLowerCase().includes(searchTerm) ||
            item.author.toLowerCase().includes(searchTerm)
        );

        // Display filtered results
        if (this.displayCallback) {
            this.displayCallback(filtered);
        }
    },

    // Update search data dynamically (for pages that modify data)
    updateData: function (newData) {
        this.searchData = newData;
    }
};

// Execute when page loads
document.addEventListener('DOMContentLoaded', loadHTML);

// Make SearchManager globally accessible
// Make SearchManager globally accessible
window.SearchManager = SearchManager;

// Global Navigation Functions
function goToHome() {
    window.location.href = '../templates/home.html';
}

function goToAnnouncements() {
    window.location.href = '../templates/Announcements.html';
}

function goToFavorites() {
    window.location.href = '../templates/favourites.html';
}

function goToMessages() {
    window.location.href = '../templates/mymessages.html';
}

function goToProfile() {
    window.location.href = '../templates/profile.html';
}

function goToLogin() {
    window.location.href = '../templates/Login.html';
}

// Expose functions to window object to ensure they are callable from HTML
window.goToHome = goToHome;
window.goToAnnouncements = goToAnnouncements;
window.goToFavorites = goToFavorites;
window.goToMessages = goToMessages;
window.goToProfile = goToProfile;
window.goToLogin = goToLogin;
