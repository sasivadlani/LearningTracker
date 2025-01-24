let startTime;
let timerInterval;
let sessions = JSON.parse(localStorage.getItem('sessions')) || [];

const passwordPrompt = document.getElementById('passwordPrompt');
const mainContent = document.getElementById('mainContent');
const passwordInput = document.getElementById('passwordInput');
const submitPassword = document.getElementById('submitPassword');
const topicInput = document.getElementById('topic');
const clockInBtn = document.getElementById('clockInBtn');
const clockOutBtn = document.getElementById('clockOutBtn');
const currentTopic = document.getElementById('currentTopic');
const timer = document.getElementById('timer');
const sessionsList = document.getElementById('sessions');

submitPassword.addEventListener('click', checkPassword);

function checkPassword() {
    if (passwordInput.value === "9") {
        localStorage.setItem('authenticated', 'true');
        showMainContent();
    } else {
        alert("Incorrect password. Please try again.");
        passwordInput.value = '';
    }
}

function showMainContent() {
    passwordPrompt.style.display = 'none';
    mainContent.style.display = 'block';
    updateSessionsList();
}

// Check authentication state on page load
window.addEventListener('load', function() {
    if (localStorage.getItem('authenticated') === 'true') {
        showMainContent();
    }
});

passwordInput.addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        checkPassword();
    }
});


function updateSessionsList() {
    sessionsList.innerHTML = '';
    sessions.forEach((session, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${session.topic}</td>
            <td>${session.startTime}</td>
            <td>${session.endTime}</td>
            <td>${session.totalTime}</td>
            <td>${session.date}</td>
            <td>
                <button class="edit-btn" onclick="editSession(${index})">Edit</button>
                <button class="delete-btn" onclick="deleteSession(${index})">Delete</button>
            </td>
        `;
        sessionsList.appendChild(row);
    });
}

function clockIn() {
    if (topicInput.value.trim() === '') {
        alert('Please enter a topic before clocking in.');
        return;
    }
    startTime = new Date().getTime();
    localStorage.setItem('startTime', startTime);
    localStorage.setItem('currentTopic', topicInput.value);
    currentTopic.textContent = topicInput.value;
    updateTimerDisplay();
    clockInBtn.disabled = true;
    clockOutBtn.disabled = false;
    timerInterval = setInterval(updateTimer, 1000);
}


function updateTimerDisplay() {
    currentTopic.textContent = localStorage.getItem('currentTopic');
    const storedStartTime = localStorage.getItem('startTime');
    if (storedStartTime) {
        const elapsedTime = new Date().getTime() - parseInt(storedStartTime);
        const formattedTime = formatTime(elapsedTime);
        timer.textContent = formattedTime;
    }
}

function formatTime(ms) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
}

// Check and resume timer on page load
window.addEventListener('load', function() {
    const storedStartTime = localStorage.getItem('startTime');
    if (storedStartTime) {
        startTime = parseInt(storedStartTime);
        updateTimerDisplay();
        timerInterval = setInterval(updateTimer, 1000);
        clockInBtn.disabled = true;
        clockOutBtn.disabled = false;
    }
});

function clockOut() {
    if (!startTime) {
        alert('You are not clocked in.');
        return;
    }
    
    clearInterval(timerInterval);
    const endTime = new Date();
    const totalTime = calculateTotalTime(startTime, endTime);
    
    sessions.push({
        topic: currentTopic.textContent,
        startTime: new Date(startTime).toLocaleTimeString(),
        endTime: endTime.toLocaleTimeString(),
        totalTime: totalTime,
        date: new Date(startTime).toLocaleDateString()
    });
    
    localStorage.setItem('sessions', JSON.stringify(sessions));
    updateSessionsList();
    resetTimer();
}

function calculateTotalTime(start, end) {
    const diff = end - start;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
}

function updateTimer() {
    const currentTime = new Date();
    const diff = currentTime - startTime;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    timer.textContent = `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
}

function resetTimer() {
    clearInterval(timerInterval);
    timer.textContent = '00:00:00';
    currentTopic.textContent = '';
    topicInput.value = '';
    clockInBtn.disabled = false;
    clockOutBtn.disabled = true;
    startTime = null;
    localStorage.removeItem('startTime');
    localStorage.removeItem('currentTopic');
}

function padZero(num) {
    return num.toString().padStart(2, '0');
}

function deleteSession(index) {
    sessions.splice(index, 1);
    localStorage.setItem('sessions', JSON.stringify(sessions));
    updateSessionsList();
}

function editSession(index) {
    const row = sessionsList.children[index];
    const cells = row.children;
    
    for (let i = 0; i < cells.length - 1; i++) {
        const cellContent = cells[i].textContent;
        cells[i].innerHTML = `<input type="text" class="edit-input" value="${cellContent}">`;
    }
    
    const actionCell = cells[cells.length - 1];
    actionCell.innerHTML = `
        <button class="save-btn" onclick="saveSession(${index})">Save</button>
        <button class="cancel-btn" onclick="cancelEdit(${index})">Cancel</button>
    `;
}

function saveSession(index) {
    const row = sessionsList.children[index];
    const inputs = row.querySelectorAll('.edit-input');
    
    sessions[index] = {
        topic: inputs[0].value,
        startTime: inputs[1].value,
        endTime: inputs[2].value,
        totalTime: inputs[3].value,
        date: inputs[4].value
    };
    
    localStorage.setItem('sessions', JSON.stringify(sessions));
    updateSessionsList();
}

function cancelEdit(index) {
    updateSessionsList();
}

clockInBtn.addEventListener('click', clockIn);
clockOutBtn.addEventListener('click', clockOut);

const logoutBtn = document.getElementById('logoutBtn');

logoutBtn.addEventListener('click', function() {
    localStorage.removeItem('authenticated');
    localStorage.removeItem('startTime');
    localStorage.removeItem('currentTopic');
    resetTimer();
    passwordPrompt.style.display = 'block';
    mainContent.style.display = 'none';
});
