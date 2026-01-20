document.addEventListener('DOMContentLoaded', () => {
    loadLeaderboard();
});

async function loadLeaderboard() {
    const leaderboardList = document.getElementById('leaderboard-list');

    // Show loading state
    leaderboardList.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading leaderboard...</div>';

    try {
        const response = await fetch(`${window.ENV.API_BASE_URL}/api/leaderboard`);

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

            // Use profile image if provided and construct full URL if it's a relative path, otherwise fallback
            let avatarUrl = `https://i.pravatar.cc/150?u=${user.UserID}`;
            if (user.ProfileImagePath) {
                // Check if it's a full URL or relative path
                if (user.ProfileImagePath.startsWith('http')) {
                    avatarUrl = user.ProfileImagePath;
                } else {
                    // Ensure we have the correct base for images if served from backend
                    avatarUrl = `${window.ENV.API_BASE_URL}/${user.ProfileImagePath}`;
                }
            }

            // Badges logic (future implementation)
            const badgesHtml = '';

            item.innerHTML = `
                <div class="rank-col ${rankClass}">${rankDisplay}</div>
                <div class="user-col">
                    <img src="${avatarUrl}" alt="${user.Name}" class="user-avatar" onerror="this.src='https://i.pravatar.cc/150?u=${user.UserID}'">
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
