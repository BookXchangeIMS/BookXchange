function loadLeaderboard() {
    const leaderboardList = document.getElementById('leaderboard-list');
    // Clear any existing content
    leaderboardList.innerHTML = '';

    // Fetch real leaderboard data from backend API
    fetch('/api/leaderboard')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Data is an array of leaderboard entries
            data.forEach((user, index) => {
                const rank = index + 1;
                const item = document.createElement('div');
                item.className = 'leaderboard-item fade-in';
                item.style.cursor = 'pointer';
                // Click navigates to user's profile
                item.addEventListener('click', () => {
                    if (typeof goToUserProfile === 'function') {
                        goToUserProfile(user.UserID);
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

                // Use profile image if provided, otherwise fallback to placeholder avatar
                const avatarUrl = user.ProfileImagePath || `https://i.pravatar.cc/150?u=${user.UserID}`;

                // Badges are not part of the current model; you could map level to badge icons if desired.
                const badgesHtml = '';

                item.innerHTML = `
                    <div class="rank-col ${rankClass}">${rankDisplay}</div>
                    <div class="user-col">
                        <img src="${avatarUrl}" alt="${user.Name}" class="user-avatar">
                        <span class="user-name">${user.Name}</span>
                    </div>
                    <div class="points-col">${user.TotalPoints.toLocaleString()} pts</div>
                    <div class="badges-col">${badgesHtml}</div>
                `;
                leaderboardList.appendChild(item);
            });
        })
        .catch(error => {
            console.error('Error loading leaderboard:', error);
            // Optionally display a user-friendly message
            leaderboardList.innerHTML = '<p class="text-center">Failed to load leaderboard data.</p>';
        });
}
