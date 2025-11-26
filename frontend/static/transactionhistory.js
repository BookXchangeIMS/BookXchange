const transactionsData = [
    {id:1,type:'sold',bookTitle:'Harry Potter and the Sorcerer\'s Stone',author:'J.K. Rowling',buyer:'Maria Silva',price:'$18.25',date:'2025-11-20',location:'Lisbon, Portugal',status:'Completed',image:'../static/resources/harrypotter.png'},
    {id:2,type:'bought',bookTitle:'The Lord of the Rings',author:'J.R.R. Tolkien',seller:'Carlos Mendes',price:'$45.00',date:'2025-11-18',location:'Porto, Portugal',status:'Completed',image:'../static/resources/lotr.png'},
    {id:3,type:'sold',bookTitle:'1984',author:'George Orwell',buyer:'Ana Costa',price:'$10.99',date:'2025-11-15',location:'Lisbon, Portugal',status:'Completed',image:'../static/resources/1984.png'},
    {id:4,type:'bought',bookTitle:'Sapiens',author:'Yuval Noah Harari',seller:'Pedro Oliveira',price:'$15.00',date:'2025-11-12',location:'Coimbra, Portugal',status:'Completed',image:'../static/resources/sapiens.png'},
    {id:5,type:'sold',bookTitle:'To Kill a Mockingbird',author:'Harper Lee',buyer:'Sofia Rodrigues',price:'$14.50',date:'2025-11-08',location:'Lisbon, Portugal',status:'Completed',image:'../static/resources/mockingbird.png'},
    {id:6,type:'bought',bookTitle:'The Great Gatsby',author:'F. Scott Fitzgerald',seller:'João Santos',price:'$12.99',date:'2025-11-05',location:'Lisbon, Portugal',status:'Completed',image:'../static/resources/gatsby.jpg'}
];

let currentFilter = 'all';

// Wait for header/footer to load (SAME as home page)
document.addEventListener('componentsLoaded', function() {
    initializeTransactions();
});

function initializeTransactions() {
    setTimeout(() => {
        document.getElementById('skeletonGrid').style.display = 'none';
        document.getElementById('transactionsGrid').style.display = 'grid';
        loadTransactions(transactionsData);
    }, 800);
}

function loadTransactions(transactions) {
    const grid = document.getElementById('transactionsGrid');
    grid.innerHTML = '';
    transactions.forEach(transaction => {
        const card = createTransactionCard(transaction);
        grid.appendChild(card);
    });
}

function createTransactionCard(transaction) {
    const card = document.createElement('div');
    card.className = `transaction-card ${transaction.type}`;
    card.onclick = () => viewTransactionDetails(transaction.id);

    const otherParty = transaction.type === 'sold' ? transaction.buyer : transaction.seller;
    const otherPartyLabel = transaction.type === 'sold' ? 'Buyer' : 'Seller';

    card.innerHTML = `
        <img src="${transaction.image}" class="transaction-image" 
             onerror="this.src='../static/resources/placeholder.png'">
        <div class="transaction-info">
            <div class="transaction-type">${transaction.type === 'sold' ? '📤 Sold' : '📥 Bought'}</div>
            <div class="book-title">${transaction.bookTitle}</div>
            <div class="book-author">by ${transaction.author}</div>
            <div class="transaction-meta">
                <span><i class="fas fa-user"></i> ${otherPartyLabel}: ${otherParty}</span>
                <span><i class="fas fa-map-marker-alt"></i> ${transaction.location}</span>
            </div>
            <div class="transaction-price">${transaction.price}</div>
            <div class="transaction-status">${transaction.status}</div>
        </div>
    `;
    return card;
}

function filterTransactions(filterType) {
    document.querySelectorAll('.filter-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');

    let filteredTransactions = transactionsData;
    if (filterType === 'sold') {
        filteredTransactions = transactionsData.filter(t => t.type === 'sold');
    } else if (filterType === 'bought') {
        filteredTransactions = transactionsData.filter(t => t.type === 'bought');
    }

    loadTransactions(filteredTransactions);
}

function viewTransactionDetails(transactionId) {
    console.log('Viewing transaction details:', transactionId);
    alert(`Transaction ${transactionId} details`);
}

// Navigation functions (from include.js)
function goBack() { window.location.href = 'profile.html'; }
function goToHome() { window.location.href = 'home.html'; }
function goToAnnouncements() { window.location.href = 'announcements.html'; }
function goToFavorites() { window.location.href = 'favourites.html'; }
function goToProfile() { window.location.href = 'profile.html'; }
function goToMessages() { window.location.href = 'messages.html'; }
