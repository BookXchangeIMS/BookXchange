function handleLogin(event) {
    event.preventDefault();
    const email = event.target[0].value;
    // In a real app, we would validate credentials here
    window.location.href = 'home.html';
}

function handleRegister() {
    window.location.href = 'registration.html';

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
