// mockdata.js - Test data for development
// This file simulates API responses for testing the edit listing page

const MOCK_BOOKS = [
    {
        id: 101,
        title: "Harry Potter and the Sorcerer's Stone",
        author: "J.K. Rowling",
        price: "$18.25",
        location: "Lisbon, Portugal",
        date: "Posted 1 day ago",
        year: 1997,
        publication_year: 1997,
        condition: "Good",
        genres: "Fantasy, Adventure",
        description: "A magical journey begins at Hogwarts! Follow Harry Potter as he discovers his true identity and battles the forces of darkness.",
        seller: "John Doe",
        sellerId: 1,
        seller_id: 1,
        isFavorite: false,
        imagePath: "../static/resources/harrypotter.png",
        image_path: "../static/resources/harrypotter.png",
        image_url: "../static/resources/harrypotter.png"
    },
    {
        id: 102,
        title: "The Lord of the Rings: The Fellowship of the Ring (First Edition)",
        author: "J.R.R. Tolkien",
        price: "$45.00",
        location: "Lisbon, Portugal",
        date: "Posted 3 days ago",
        year: 2013,
        publication_year: 2013,
        condition: "Almost new",
        genres: "Fantasy, Adventure",
        description: "A classic masterpiece by J.R.R. Tolkien! This book will take you on an unforgettable journey through Middle-earth with Frodo, Gandalf, Aragorn, and the rest of the Fellowship. Reason for selling: I've finished reading it and want it to find a new home with another Tolkien fan.",
        seller: "John Doe",
        sellerId: 1,
        seller_id: 1,
        isFavorite: true,
        imagePath: "../static/resources/lotr.png",
        image_path: "../static/resources/lotr.png",
        image_url: "../static/resources/lotr.png"
    },
    {
        id: 103,
        title: "Sapiens: A Brief History of Humankind",
        author: "Yuval Noah Harari",
        price: "$15.00",
        location: "Lisbon, Portugal",
        date: "Posted 1 week ago",
        year: 2011,
        publication_year: 2011,
        condition: "Good",
        genres: "Non-fiction, History",
        description: "Explore the history of humankind from the Stone Age to the modern era in this thought-provoking book.",
        seller: "Jane Smith",
        sellerId: 2,
        seller_id: 2,
        isFavorite: false,
        imagePath: "../static/resources/sapiens.png",
        image_path: "../static/resources/sapiens.png",
        image_url: "../static/resources/sapiens.png"
    },
    {
        id: 104,
        title: "1984",
        author: "George Orwell",
        price: "$12.50",
        location: "Porto, Portugal",
        date: "Posted 2 days ago",
        year: 1949,
        publication_year: 1949,
        condition: "Fair",
        genres: "Dystopian, Fiction, Classic",
        description: "A dystopian social science fiction novel and cautionary tale. The story takes place in an imagined future where totalitarian government has total control.",
        seller: "John Doe",
        sellerId: 1,
        seller_id: 1,
        isFavorite: false,
        imagePath: "../static/resources/1984.png",
        image_path: "../static/resources/1984.png",
        image_url: "../static/resources/1984.png"
    },
    {
        id: 105,
        title: "The Hobbit",
        author: "J.R.R. Tolkien",
        price: "$22.00",
        location: "Coimbra, Portugal",
        date: "Posted 5 days ago",
        year: 1937,
        publication_year: 1937,
        condition: "Almost new",
        genres: "Fantasy, Adventure, Children's",
        description: "The prelude to The Lord of the Rings trilogy. Follow Bilbo Baggins on his unexpected journey with dwarves to reclaim their mountain home from Smaug the dragon.",
        seller: "Maria Silva",
        sellerId: 3,
        seller_id: 3,
        isFavorite: true,
        imagePath: "../static/resources/hobbit.png",
        image_path: "../static/resources/hobbit.png",
        image_url: "../static/resources/hobbit.png"
    }
];

// Mock API simulator
class MockAPI {
    constructor() {
        this.books = [...MOCK_BOOKS];
        this.delay = 500; // Simulate network delay (ms)
    }

    // Simulate network delay
    async simulateDelay() {
        return new Promise(resolve => setTimeout(resolve, this.delay));
    }

    // GET book by ID
    async getBook(id) {
        await this.simulateDelay();
        
        const book = this.books.find(b => b.id === parseInt(id));
        
        if (!book) {
            throw new Error('Book not found');
        }
        
        return {
            success: true,
            data: book
        };
    }

    // UPDATE book
    async updateBook(id, updatedData) {
        await this.simulateDelay();
        
        const index = this.books.findIndex(b => b.id === parseInt(id));
        
        if (index === -1) {
            throw new Error('Book not found');
        }
        
        // Update the book
        this.books[index] = {
            ...this.books[index],
            ...updatedData,
            // Ensure all fields are synced
            imagePath: updatedData.image_url,
            image_path: updatedData.image_url,
            image_url: updatedData.image_url,
            publication_year: updatedData.year
        };
        
        return {
            success: true,
            message: 'Book updated successfully',
            data: this.books[index]
        };
    }

    // DELETE book
    async deleteBook(id) {
        await this.simulateDelay();
        
        const index = this.books.findIndex(b => b.id === parseInt(id));
        
        if (index === -1) {
            throw new Error('Book not found');
        }
        
        this.books.splice(index, 1);
        
        return {
            success: true,
            message: 'Book deleted successfully'
        };
    }

    // UPLOAD image
    async uploadImage(file) {
        await this.simulateDelay();
        
        // Simulate image upload by creating a local object URL
        const imageUrl = URL.createObjectURL(file);
        
        return {
            success: true,
            imageUrl: imageUrl,
            url: imageUrl,
            data: {
                url: imageUrl
            }
        };
    }

    // Get all books (for testing)
    getAllBooks() {
        return [...this.books];
    }
}

// Create global mock API instance
window.mockAPI = new MockAPI();

// Mock console for debugging
console.log('Mock API loaded with', MOCK_BOOKS.length, 'books');
