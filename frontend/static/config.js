// Configuration for different environments

/*
const ENV = {
    // Automatically detect environment
    API_BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:8000'
        : 'https://bookxchange-bfgkhcf6dvamhyga.swedencentral-01.azurewebsites.net',

    // WebSocket URL for messages
    get WS_BASE_URL() {
        return this.API_BASE_URL.replace(/^http/, 'ws');
    }
};

*/

// Make it available globally
window.ENV = ENV;

console.log('Environment configured:', ENV.API_BASE_URL);
