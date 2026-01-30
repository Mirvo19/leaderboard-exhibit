document.addEventListener('DOMContentLoaded', () => {
    fetchLeaderboard();

    document.getElementById('add-player-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('player-name');
        const scoreInput = document.getElementById('player-score');
        
        const name = nameInput.value;
        const score = scoreInput.value;

        if (name && score) {
            await addPlayer(name, parseInt(score));
            nameInput.value = '';
            scoreInput.value = '';
        }
    });
});

async function fetchLeaderboard() {
    try {
        const response = await fetch('/api/leaderboard');
        const data = await response.json();
        renderTable(data);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
    }
}

function renderTable(data) {
    const tbody = document.querySelector('#leaderboard-table tbody');
    tbody.innerHTML = '';

    data.forEach((player, index) => {
        const tr = document.createElement('tr');

        // Rank (Index + 1)
        const rankTd = document.createElement('td');
        rankTd.textContent = index + 1;
        
        // Dynamic styling for top 3
        if (index === 0) rankTd.innerHTML += ' 🥇';
        else if (index === 1) rankTd.innerHTML += ' 🥈';
        else if (index === 2) rankTd.innerHTML += ' 🥉';

        tr.appendChild(rankTd);

        // Name
        const nameTd = document.createElement('td');
        nameTd.textContent = player.name;
        tr.appendChild(nameTd);

        // Score (Editable)
        const scoreTd = document.createElement('td');
        scoreTd.textContent = player.score;
        scoreTd.classList.add('score-cell');
        scoreTd.title = "Click to edit";
        scoreTd.onclick = () => enableEdit(scoreTd, player.id, player.score);
        tr.appendChild(scoreTd);

        // Actions (Delete)
        const actionTd = document.createElement('td');
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.classList.add('delete-btn');
        deleteBtn.onclick = () => deletePlayer(player.id);
        actionTd.appendChild(deleteBtn);
        tr.appendChild(actionTd);

        tbody.appendChild(tr);
    });
}

async function addPlayer(name, score) {
    try {
        const response = await fetch('/api/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, score })
        });
        
        if (response.ok) {
            fetchLeaderboard();
        } else {
            console.error('Failed to add player');
        }
    } catch (error) {
        console.error('Error adding player:', error);
    }
}

async function deletePlayer(id) {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
        const response = await fetch(`/api/delete/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            fetchLeaderboard();
        } else {
            console.error('Failed to delete player');
        }
    } catch (error) {
        console.error('Error deleting player:', error);
    }
}

function enableEdit(cell, id, currentScore) {
    const input = document.createElement('input');
    input.type = 'number';
    input.value = currentScore;
    input.style.width = '60px';
    
    // Replace text with input
    cell.innerHTML = '';
    cell.appendChild(input);
    input.focus();

    // Handle save on Blur or Enter key
    const save = async () => {
        const newScore = parseInt(input.value);
        if (!isNaN(newScore)) {
            await updateScore(id, newScore);
        } else {
            // Revert if invalid
            cell.textContent = currentScore; 
        }
    };

    input.addEventListener('blur', save);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            input.blur(); // Triggers save via blur event
        }
    });

    // Determine if we need to stop click propagation to prevent re-triggering logic
    input.onclick = (e) => e.stopPropagation();
}

async function updateScore(id, score) {
    try {
        const response = await fetch(`/api/update/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ score })
        });

        if (response.ok) {
            fetchLeaderboard();
        } else {
            console.error('Failed to update score');
        }
    } catch (error) {
        console.error('Error updating score:', error);
    }
}
