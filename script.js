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
    const storedStartTime = localStorage.getItem('startTime');

    // Ensure there is a valid clock-in time
    if (!storedStartTime) {
        alert('You are not clocked in.');
        return;
    }

    // Parse stored start time and get the current time
    const startTime = new Date(parseInt(storedStartTime));
    const endTime = new Date();

    // Format times into HH:MM:SS AM/PM for calculateTotalTime
    const startTimeFormatted = formatToAMPM(startTime);
    const endTimeFormatted = formatToAMPM(endTime);

    // Calculate total time using the formatted strings
    const totalTime = calculateTotalTime(startTimeFormatted, endTimeFormatted);

    // Save session data
    sessions.push({
        topic: localStorage.getItem('currentTopic') || 'No Topic',
        startTime: startTimeFormatted,
        endTime: endTimeFormatted,
        totalTime: totalTime,
        date: startTime.toLocaleDateString(),
    });

    // Update localStorage and UI
    localStorage.setItem('sessions', JSON.stringify(sessions));
    updateSessionsList();
    resetTimer();
}

function formatToAMPM(date) {
    let hours = date.getHours();
    const minutes = padZero(date.getMinutes());
    const seconds = padZero(date.getSeconds());
    const period = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12 || 12; // Convert to 12-hour format
    return `${padZero(hours)}:${minutes}:${seconds} ${period}`;
}


function calculateTotalTime(clockedIn, clockedOut) {
    const [inHours, inMinutes, inSeconds, inPeriod] = clockedIn.match(/(\d+):(\d+):(\d+) (AM|PM)/).slice(1);
    const [outHours, outMinutes, outSeconds, outPeriod] = clockedOut.match(/(\d+):(\d+):(\d+) (AM|PM)/).slice(1);

    let inTime = new Date(2023, 0, 1, inHours % 12 + (inPeriod === 'PM' ? 12 : 0), inMinutes, inSeconds);
    let outTime = new Date(2023, 0, 1, outHours % 12 + (outPeriod === 'PM' ? 12 : 0), outMinutes, outSeconds);

    if (outTime < inTime) {
        outTime.setDate(outTime.getDate() + 1);
    }

    const diffMs = outTime - inTime;
    return formatTime(diffMs);
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
    const session = sessions[index];
    const row = sessionsList.children[index];

    row.innerHTML = `
        <td><input type="text" class="edit-topic" value="${session.topic || ''}"></td>
        <td><input type="text" class="edit-clockedIn" value="${session.startTime || ''}"></td>
        <td><input type="text" class="edit-clockedOut" value="${session.endTime || ''}"></td>
        <td id="updatedTotalTime">${session.totalTime || '00:00:00'}</td>
        <td><input type="text" class="edit-date" value="${session.date || ''}"></td>
        <td>
            <button class="save-btn" data-index="${index}">Save</button>
            <button class="cancel-btn" data-index="${index}">Cancel</button>
        </td>
    `;

    const saveButton = row.querySelector('.save-btn');
    const cancelButton = row.querySelector('.cancel-btn');

    saveButton.addEventListener('click', () => saveSession(index));
    cancelButton.addEventListener('click', () => cancelEdit(index));
}



function saveSession(index) {
    const row = sessionsList.children[index];
    const topic = row.querySelector('.edit-topic').value;
    const startTimeInput = row.querySelector('.edit-clockedIn').value;
    const endTimeInput = row.querySelector('.edit-clockedOut').value;
    const date = row.querySelector('.edit-date').value;

    // Validate inputs
    if (!startTimeInput.match(/\d+:\d+:\d+ (AM|PM)/) || !endTimeInput.match(/\d+:\d+:\d+ (AM|PM)/)) {
        alert("Invalid time format. Please use HH:MM:SS AM/PM.");
        return;
    }

    // Recalculate total time
    const totalTime = calculateTotalTime(startTimeInput, endTimeInput);

    // Update the session
    sessions[index] = {
        topic,
        startTime: startTimeInput,
        endTime: endTimeInput,
        totalTime,
        date,
    };

    // Re-render the updated session row
    row.innerHTML = `
        <td>${topic}</td>
        <td>${startTimeInput}</td>
        <td>${endTimeInput}</td>
        <td>${totalTime}</td>
        <td>${date}</td>
        <td>
            <button class="edit-btn" data-index="${index}">Edit</button>
            <button class="delete-btn" data-index="${index}">Delete</button>
        </td>
    `;

    // Re-attach event listeners for the new buttons
    row.querySelector('.edit-btn').addEventListener('click', () => editSession(index));
    row.querySelector('.delete-btn').addEventListener('click', () => deleteSession(index));

    // Update sessions in localStorage
    localStorage.setItem('sessions', JSON.stringify(sessions));
}


function parseTime(timeString) {
    // Ensure time string is valid, format: HH:mm:ss
    if (!/^\d{2}:\d{2}:\d{2}$/.test(timeString)) {
        return new Date(NaN); // Invalid Date
    }
    return new Date(`2023-01-01T${timeString}`);
}



function cancelEdit(index) {
    const session = sessions[index];
    const row = sessionsList.children[index];

    // Re-render the original session row
    row.innerHTML = `
        <td>${session.topic}</td>
        <td>${session.startTime}</td>
        <td>${session.endTime}</td>
        <td>${session.totalTime}</td>
        <td>${session.date}</td>
        <td>
            <button class="edit-btn" data-index="${index}">Edit</button>
            <button class="delete-btn" data-index="${index}">Delete</button>
        </td>
    `;

    // Re-attach event listeners for the new buttons
    row.querySelector('.edit-btn').addEventListener('click', () => editSession(index));
    row.querySelector('.delete-btn').addEventListener('click', () => deleteSession(index));
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
