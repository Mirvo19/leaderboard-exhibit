document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.querySelector('#leaderboard-table tbody');
    const addForm = document.getElementById('add-player-form');
    
    // Theme Switcher Logic
    const themeToggleBtn = document.getElementById('theme-toggle');
    const body = document.body;

    // Check local storage for theme
    if (localStorage.getItem('theme') === 'light') {
        body.classList.add('light-theme');
        themeToggleBtn.textContent = ' Dark Mode';
    }

    themeToggleBtn.addEventListener('click', () => {
        body.classList.toggle('light-theme');
        if (body.classList.contains('light-theme')) {
            localStorage.setItem('theme', 'light');
            themeToggleBtn.textContent = ' Dark Mode';
        } else {
            localStorage.setItem('theme', 'dark');
            themeToggleBtn.textContent = ' Light Mode';
        }
    });

    // State to track previous scores for flash effects
    let previousScores = {}; 
    let isEditing = false; // Prevent polling updates while editing

    // Initial load
    fetchLeaderboard();

    // Poll every 5 seconds
    setInterval(() => {
        if (!isEditing) {
            fetchLeaderboard();
        }
    }, 5000);

    // Add Player Handler
    addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('player-name');
        const scoreInput = document.getElementById('player-score');
        const btn = addForm.querySelector('button');

        const name = nameInput.value.trim();
        const score = parseInt(scoreInput.value);

        if (!name || isNaN(score)) return;

        // Button loading state
        const originalBtnText = btn.textContent;
        btn.textContent = 'Adding...';
        btn.disabled = true;

        try {
            const response = await fetch('/api/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, score })
            });

            if (response.ok) {
                nameInput.value = '';
                scoreInput.value = '';
                fetchLeaderboard(); // Immediate update
            } else {
                console.error('Failed to add player');
                showError('Failed to add player');
            }
        } catch (error) {
            console.error('Error:', error);
            showError('Network error');
        } finally {
            btn.textContent = originalBtnText;
            btn.disabled = false;
        }
    });

    // Fetch and Render Logic
    async function fetchLeaderboard() {
        try {
            const response = await fetch('/api/leaderboard');
            if (!response.ok) throw new Error('Failed to fetch data');
            const data = await response.json();
            
            // Client-side Sort (High to low) and Rank
            // Assuming API returns object with id, name, score
            data.sort((a, b) => b.score - a.score);
            
            renderTable(data);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            // Optional: showError('Failed to sync leaderboard');
        }
    }

    function renderTable(data) {
        // If we clear HTML, we lose the focus if someone was editing (handled by isEditing flag check)
        tableBody.innerHTML = '';

        if (data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: #888;">No players yet. Be the first!</td></tr>';
            return;
        }

        data.forEach((player, index) => {
            const rank = index + 1;
            const tr = document.createElement('tr');
            
            // Determine if score changed
            const prevScore = previousScores[player.id];
            if (prevScore !== undefined && prevScore !== player.score) {
                tr.classList.add('flash-update');
            }
            previousScores[player.id] = player.score; // Update state

            // Rank Styling
            let rankClass = '';
            if (rank === 1) rankClass = 'rank-1';
            else if (rank === 2) rankClass = 'rank-2';
            else if (rank === 3) rankClass = 'rank-3';

            tr.innerHTML = `
                <td class="rank ${rankClass}">#${rank}</td>
                <td>${escapeHtml(player.name)}</td>
                <td>
                    <span 
                        class="editable-score" 
                        contenteditable="true" 
                        data-id="${player.id}"
                        data-original-score="${player.score}"
                        onfocus="enterEditMode(this)"
                        onblur="saveScore(this)"
                        onkeydown="handleEnterKey(event, this)"
                    >${player.score}</span>
                </td>
               
            `;
            tableBody.appendChild(tr);
        });
    }

    // Global helpers for inline handlers
    window.enterEditMode = (el) => {
        isEditing = true;
        // Select all text for easier editing
        setTimeout(() => {
            document.execCommand('selectAll', false, null);
        }, 0);
    };

    window.saveScore = async (el) => {
        isEditing = false;
        const newScore = parseInt(el.innerText);
        const id = el.dataset.id;
        const originalScore = parseInt(el.dataset.originalScore);

        if (isNaN(newScore) || newScore < 0) {
            el.innerText = originalScore; // Revert
            alert("Please enter a valid positive number");
            return;
        }

        if (newScore === originalScore) return; // No change

        // Optimistic update handled by next fetch, but visual feedback is good
        // We'll update dataset for now to prevent revert on double blur
        el.dataset.originalScore = newScore;
        
        try {
            const response = await fetch(`/api/update/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ score: newScore })
            });

            if (response.ok) {
                fetchLeaderboard(); // Refresh to re-sort
            } else {
                el.innerText = originalScore; // Revert on failure
                showError('Failed to update score');
            }
        } catch (error) {
            console.error(error);
            el.innerText = originalScore;
            showError('Network error');
        }
    };

    window.handleEnterKey = (e, el) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            el.blur(); // Triggers saveScore
        }
    };

    window.deletePlayer = async (id) => {
        if (!confirm('Are you sure you want to delete this player?')) return;

        try {
            const response = await fetch(`/api/delete/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // Remove from state so it doesn't flash if re-added
                delete previousScores[id];
                fetchLeaderboard();
            } else {
                showError('Failed to delete');
            }
        } catch (error) {
            console.error(error);
            showError('Network error');
        }
    };

    function escapeHtml(text) {
        if (!text) return text;
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function showError(msg) {
        // Simple alert or custom toast could go here
        alert(msg);
    }
});
