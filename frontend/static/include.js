function loadHTML() {
    let headerLoaded = false;
    let footerLoaded = false;

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
    if (headerPlaceholder) {
        fetch('../templates/header.html')
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
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (footerPlaceholder) {
        fetch('../templates/footer.html')
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

    // If neither component exists, mark as loaded
    if (!headerPlaceholder && !footerPlaceholder) {
        checkAllLoaded();
    }
}

// Set active footer button based on current page
function setActiveFooterButton() {
    // Get current page filename from URL
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
    
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
    init: function(data, callback) {
        this.searchData = data;
        this.displayCallback = callback;
        this.setupSearchListener();
    },
    
    // Setup search input listener
    setupSearchListener: function() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e));
        }
    },
    
    // Handle search logic
    handleSearch: function(e) {
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
    updateData: function(newData) {
        this.searchData = newData;
    }
};

// Execute when page loads
document.addEventListener('DOMContentLoaded', loadHTML);

// Make SearchManager globally accessible
window.SearchManager = SearchManager;
