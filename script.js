let isClockIn = false;
let startTime;
let sessionList = [];
let currentTopic = '';
let topicTimeSpent = {};

const clockBtn = document.getElementById('clockBtn');
const statusEl = document.getElementById('status');
const currentSessionEl = document.getElementById('currentSession');
const sessionListEl = document.getElementById('sessionList');
const topicInputEl = document.getElementById('topicInput');

function updateButtonAndStatus() {
    clockBtn.textContent = isClockIn ? 'Clock Out' : 'Clock In';
    statusEl.textContent = isClockIn ? `Clocked In: ${currentTopic}` : 'Not clocked in';
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
        currentSessionEl.textContent = `Current session (${currentTopic}): ${formatDuration(duration)}`;
        setTimeout(updateCurrentSession, 1000);
    } else {
        currentSessionEl.textContent = '';
    }
}

function addSessionToList(start, end, topic) {
    const duration = end - start;
    const sessionItem = {
        start: new Date(start).toLocaleString(),
        end: new Date(end).toLocaleString(),
        duration: formatDuration(duration),
        topic: topic
    };
    sessionList.unshift(sessionItem);
    updateSessionList();
    localStorage.setItem('sessionList', JSON.stringify(sessionList));

    // Update total time spent on topic
    topicTimeSpent[topic] = (topicTimeSpent[topic] || 0) + duration;
    localStorage.setItem('topicTimeSpent', JSON.stringify(topicTimeSpent));
}

function updateSessionList() {
    sessionListEl.innerHTML = '';
    sessionList.forEach(session => {
        const li = document.createElement('li');
        li.textContent = `${session.start} - ${session.end} (${session.duration}) - ${session.topic}`;
        sessionListEl.appendChild(li);
    });

    // Display total time spent on each topic
    const topicSummary = document.createElement('div');
    topicSummary.innerHTML = '<h3>Total Time Spent on Topics:</h3>';
    for (const [topic, time] of Object.entries(topicTimeSpent)) {
        topicSummary.innerHTML += `<p>${topic}: ${formatDuration(time)}</p>`;
    }
    sessionListEl.appendChild(topicSummary);
}

clockBtn.addEventListener('click', () => {
    if (isClockIn) {
        const endTime = Date.now();
        addSessionToList(startTime, endTime, currentTopic);
        currentTopic = '';
        topicInputEl.value = '';
    } else {
        currentTopic = topicInputEl.value.trim();
        if (!currentTopic) {
            alert('Please enter a topic before clocking in.');
            return;
        }
        startTime = Date.now();
        updateCurrentSession();
    }
    isClockIn = !isClockIn;
    updateButtonAndStatus();
});

// Load saved sessions and topic time spent from localStorage
const savedSessions = localStorage.getItem('sessionList');
if (savedSessions) {
    sessionList = JSON.parse(savedSessions);
    updateSessionList();
}

const savedTopicTimeSpent = localStorage.getItem('topicTimeSpent');
if (savedTopicTimeSpent) {
    topicTimeSpent = JSON.parse(savedTopicTimeSpent);
}

updateButtonAndStatus();
