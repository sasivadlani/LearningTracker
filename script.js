let isClockIn = false;
let startTime;
let sessionList = [];

const clockBtn = document.getElementById('clockBtn');
const statusEl = document.getElementById('status');
const currentSessionEl = document.getElementById('currentSession');
const sessionListEl = document.getElementById('sessionList');

function updateButtonAndStatus() {
    clockBtn.textContent = isClockIn ? 'Clock Out' : 'Clock In';
    statusEl.textContent = isClockIn ? 'Clocked In' : 'Not clocked in';
}

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
}

function updateCurrentSession() {
    if (isClockIn) {
        const duration = Date.now() - startTime;
        currentSessionEl.textContent = `Current session: ${formatDuration(duration)}`;
        setTimeout(updateCurrentSession, 1000);
    } else {
        currentSessionEl.textContent = '';
    }
}

function addSessionToList(start, end) {
    const duration = end - start;
    const sessionItem = {
        start: new Date(start).toLocaleString(),
        end: new Date(end).toLocaleString(),
        duration: formatDuration(duration)
    };
    sessionList.unshift(sessionItem);
    updateSessionList();
    localStorage.setItem('sessionList', JSON.stringify(sessionList));
}

function updateSessionList() {
    sessionListEl.innerHTML = '';
    sessionList.forEach(session => {
        const li = document.createElement('li');
        li.textContent = `${session.start} - ${session.end} (${session.duration})`;
        sessionListEl.appendChild(li);
    });
}

clockBtn.addEventListener('click', () => {
    if (isClockIn) {
        const endTime = Date.now();
        addSessionToList(startTime, endTime);
    } else {
        startTime = Date.now();
        updateCurrentSession();
    }
    isClockIn = !isClockIn;
    updateButtonAndStatus();
});

// Load saved sessions from localStorage
const savedSessions = localStorage.getItem('sessionList');
if (savedSessions) {
    sessionList = JSON.parse(savedSessions);
    updateSessionList();
}

updateButtonAndStatus();
