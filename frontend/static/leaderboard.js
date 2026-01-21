document.addEventListener('DOMContentLoaded', () => {
    loadLeaderboard();
});

async function loadLeaderboard() {
    const leaderboardList = document.getElementById('leaderboard-list');

    // Show loading state
    leaderboardList.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading leaderboard...</div>';

    try {
        const apiBaseUrl = (window.ENV && window.ENV.API_BASE_URL) || 'http://localhost:8000';
        console.log('Fetching leaderboard from:', apiBaseUrl);
        const response = await fetch(`${apiBaseUrl}/api/leaderboard`);

        if (!response.ok) {
            throw new Error(`Failed to fetch leaderboard: ${response.status}`);
        }

        const users = await response.json();

        // Clear loading
        leaderboardList.innerHTML = '';

        if (users.length === 0) {
            leaderboardList.innerHTML = '<div class="no-data">No data available yet. Start earning points!</div>';
            return;
        }

        users.forEach((user, index) => {
            const rank = index + 1;
            const item = document.createElement('div');
            item.className = 'leaderboard-item fade-in';
            item.style.cursor = 'pointer';

            // Click navigates to user's profile
            item.addEventListener('click', () => {
                if (typeof goToUserProfile === 'function') {
                    goToUserProfile(user.UserID);
                } else {
                    window.location.href = `profile_view.html?uid=${user.UserID}`;
                }
            });

            // Determine rank display and CSS class
            let rankDisplay = rank;
            let rankClass = '';
            if (rank === 1) {
                rankDisplay = '<i class="fas fa-crown"></i>';
                rankClass = 'rank-1';
            } else if (rank === 2) {
                rankDisplay = '<i class="fas fa-medal"></i>';
                rankClass = 'rank-2';
            } else if (rank === 3) {
                rankDisplay = '<i class="fas fa-medal"></i>';
                rankClass = 'rank-3';
            }

            // Safely get API_BASE_URL
            const apiBaseUrl = (window.ENV && window.ENV.API_BASE_URL) || 'http://localhost:8000';

            // Avatar Logic
            let avatarHtml;
            const token = localStorage.getItem('access-token');

            // Function to generate placeholder HTML
            const getPlaceholderHtml = () => `<div class="user-avatar placeholder"><i class="fas fa-user"></i></div>`;

            if (user.ProfileImagePath) {
                if (user.ProfileImagePath.startsWith('http')) {
                    // Blob storage or external URL
                    avatarHtml = `<img src="${user.ProfileImagePath}" alt="${user.Name}" class="user-avatar" onerror="this.outerHTML='${getPlaceholderHtml().replace(/'/g, "\\'")}'">`;
                } else if (token) {
                    // Local/Backend served image (requires auth)
                    const imageUrl = `${apiBaseUrl}/api/get_users_profile_picture?userid=${user.UserID}&access_token=${token}`;
                    avatarHtml = `<img src="${imageUrl}" alt="${user.Name}" class="user-avatar" onerror="this.outerHTML='${getPlaceholderHtml().replace(/'/g, "\\'")}'">`;
                } else {
                    // No token to fetch protected image -> fallback
                    avatarHtml = getPlaceholderHtml();
                }
            } else {
                avatarHtml = getPlaceholderHtml();
            }

            // Badges logic (future implementation)
            const badgesHtml = '';

            item.innerHTML = `
                <div class="rank-col ${rankClass}">${rankDisplay}</div>
                <div class="user-col">
                    ${avatarHtml}
                    <span class="user-name">${user.Name || 'Anonymous'}</span>
                </div>
                <div class="points-col">${(user.TotalPoints || 0).toLocaleString()} pts</div>
                <!-- <div class="badges-col">${badgesHtml}</div> -->
            `;
            leaderboardList.appendChild(item);
        });

    } catch (error) {
        console.error('Error loading leaderboard:', error);
        leaderboardList.innerHTML = `<div class="error-message">Failed to load leaderboard. Please try again later.</div>`;
    }
}
