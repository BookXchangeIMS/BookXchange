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

            // Use profile image if provided and is a valid URL
            let avatarUrl = `https://i.pravatar.cc/150?u=${user.UserID}`;
            if (user.ProfileImagePath) {
                if (user.ProfileImagePath.startsWith('http')) {
                    avatarUrl = user.ProfileImagePath;
                } else {
                    // If it's a relative path, we only try to use it if we think it might be served.
                    // But since backend doesn't serve authentic files by default, we'll be cautious.
                    // Usage of placeholders for relative paths avoids 404s on unserved local files.
                    // If you have local serving enabled, uncomment the line below:
                    // avatarUrl = `${apiBaseUrl}/${user.ProfileImagePath}`;
                    console.warn(`Skipping relative profile image path: ${user.ProfileImagePath}`);
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
