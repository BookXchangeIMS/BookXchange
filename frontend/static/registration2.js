function handleRegistration2(event) {
    event.preventDefault();
    
    // Navigate to registration3.html
    window.location.href = 'registration3.html';
}

function goBack() {
    window.location.href = 'registration.html';
}

// Set max date to today (users must be born before today)
document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.querySelector('.date-input');
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('max', today);
    
    // Add fade-in animation
    const container = document.querySelector('.container');
    container.style.opacity = '0';
    container.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        container.style.transition = 'all 0.6s ease';
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
    }, 100);
});