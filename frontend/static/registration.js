function handleRegistration(event) {
    event.preventDefault();

    // Navigate to registration2.html
    window.location.href = 'registration2.html';
}

function goToLogin() {
    window.location.href = 'Login.html';
}

// Add subtle animation on page load
document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.container');
    container.style.opacity = '0';
    container.style.transform = 'translateY(20px)';

    setTimeout(() => {
        container.style.transition = 'all 0.6s ease';
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
    }, 100);
});