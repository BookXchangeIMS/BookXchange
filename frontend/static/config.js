const ENV = {
    // Automatically detect environment
    API_BASE_URL: window.location.hostname.includes('azurewebsites.net')
        ? 'https://bookxchange-bfgkhcf6dvamhyga.swedencentral-01.azurewebsites.net'
        : 'http://localhost:8000',

    // WebSocket URL for messages
    get WS_BASE_URL() {
        return this.API_BASE_URL.replace(/^http/, 'ws');
    }
};

// Make it available globally
window.ENV = ENV;

console.log('Environment configured:', ENV.API_BASE_URL);