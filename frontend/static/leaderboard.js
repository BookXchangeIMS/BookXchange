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
                    window.location.href = `foreignprofile.html?id=${user.UserID}`;
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
            const token = localStorage.getItem('access-token');

            // Construct Rank Column
            const rankDiv = document.createElement('div');
            rankDiv.className = `rank-col ${rankClass}`;
            rankDiv.innerHTML = rankDisplay;

            // Construct User Column
            const userColDiv = document.createElement('div');
            userColDiv.className = 'user-col';

            // 1. Create Image Element
            const img = document.createElement('img');
            img.className = 'user-avatar';
            img.alt = user.Name;

            // 2. Create Placeholder Element (Hidden by default)
            const placeholder = document.createElement('div');
            placeholder.className = 'user-avatar placeholder';
            placeholder.innerHTML = '<i class="fas fa-user"></i>';
            placeholder.style.display = 'none';

            // 3. Determine source and visibility
            if (user.ProfileImagePath) {
                if (user.ProfileImagePath.startsWith('http')) {
                    img.src = user.ProfileImagePath;
                } else if (token) {
                    img.src = `${apiBaseUrl}/api/get_users_profile_picture?userid=${user.UserID}&access_token=${token}`;
                } else {
                    // No token for protected image
                    img.style.display = 'none';
                    placeholder.style.display = 'flex';
                }
            } else {
                img.style.display = 'none';
                placeholder.style.display = 'flex';
            }

            // 4. Handle Load Errors
            img.onerror = () => {
                img.style.display = 'none';
                placeholder.style.display = 'flex';
            };

            // 5. Append to User Column
            userColDiv.appendChild(img);
            userColDiv.appendChild(placeholder);

            const nameSpan = document.createElement('span');
            nameSpan.className = 'user-name';
            nameSpan.textContent = user.Name || 'Anonymous';
            userColDiv.appendChild(nameSpan);

            // Construct Points Column
            const pointsDiv = document.createElement('div');
            pointsDiv.className = 'points-col';
            pointsDiv.textContent = `${(user.TotalPoints || 0).toLocaleString()} pts`;

            // Append all to item
            item.innerHTML = ''; // Clear
            item.appendChild(rankDiv);
            item.appendChild(userColDiv);
            item.appendChild(pointsDiv);
            leaderboardList.appendChild(item);
        });

    } catch (error) {
        console.error('Error loading leaderboard:', error);
        leaderboardList.innerHTML = `<div class="error-message">Failed to load leaderboard. Please try again later.</div>`;
    }
}
