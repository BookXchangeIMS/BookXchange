function handleLogin(event) {
    event.preventDefault();
    const email = event.target[0].value;
    alert(`Welcome back to BookXchange, ${email}!`);
    event.target.reset();
}

function handleRegister() {
    alert('Redirecting to registration page...');
    // In a real app, this would navigate to /register
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
