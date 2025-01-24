// AWS Configuration
AWS.config.update({
    region: "us-east-1", // Replace with your DynamoDB region
    accessKeyId: "AWS_ACCESS_KEY_ID", // Replace with your Access Key ID
    secretAccessKey: "AWS_SECRET_ACCESS_KEY" // Replace with your Secret Access Key
});


// DynamoDB Instance
const docClient = new AWS.DynamoDB.DocumentClient();

// Elements from DOM
const passwordInput = document.getElementById("passwordInput");
const submitPassword = document.getElementById("submitPassword");
const mainContent = document.getElementById("mainContent");
const passwordPrompt = document.getElementById("passwordPrompt");
const topicInput = document.getElementById("topic");
const clockInBtn = document.getElementById("clockInBtn");
const clockOutBtn = document.getElementById("clockOutBtn");
const currentTopic = document.getElementById("currentTopic");
const timer = document.getElementById("timer");
const sessionsTable = document.getElementById("sessions");

// Global Variables
let currentSession = {};
let sessions = [];
let userId = "userid"; // Replace with your unique user ID
let interval = null; // Timer interval

// Helper Functions
function formatTime(date) {
    return new Date(date).toLocaleTimeString(); // Format as HH:MM:SS AM/PM
}

function formatDate(date) {
    return new Date(date).toLocaleDateString(); // Format as MM/DD/YYYY
}

function calculateTotalTime(started, ended) {
    const duration = (new Date(ended) - new Date(started)) / 1000; // Difference in seconds
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = Math.floor(duration % 60);
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function startTimer(startedTime) {
    let elapsed = Math.floor((Date.now() - startedTime) / 1000);
    interval = setInterval(() => {
        elapsed++;
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;
        timer.textContent = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }, 1000);
}

function stopTimer() {
    clearInterval(interval);
    interval = null;
}

function saveToLocalStorage() {
    localStorage.setItem("isLoggedIn", true);
    localStorage.setItem("userId", userId);
    localStorage.setItem("currentSession", JSON.stringify(currentSession));
    localStorage.setItem("sessions", JSON.stringify(sessions));
}

function loadFromLocalStorage() {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (isLoggedIn) {
        userId = localStorage.getItem("userId");
        currentSession = JSON.parse(localStorage.getItem("currentSession")) || {};
        sessions = JSON.parse(localStorage.getItem("sessions")) || [];
        if (currentSession.started) {
            clockInBtn.disabled = true;
            clockOutBtn.disabled = false;
            currentTopic.textContent = currentSession.topic;
            startTimer(currentSession.started);
        }
        loadSessions(sessions);
        passwordPrompt.style.display = "none";
        mainContent.style.display = "block";
    }
}

function clearLocalStorage() {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userId");
    localStorage.removeItem("currentSession");
    localStorage.removeItem("sessions");
}

// Load sessions from DynamoDB
function loadSessions(sessions) {
    sessionsTable.innerHTML = ""; // Clear the table
    sessions.forEach((session, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><input type="text" class="edit-input" value="${session.topic}" disabled /></td>
            <td><input type="text" class="edit-input" value="${formatTime(session.started)}" disabled /></td>
            <td><input type="text" class="edit-input" value="${formatTime(session.ended)}" disabled /></td>
            <td>${session.totalTime}</td>
            <td>${formatDate(session.date)}</td>
            <td>
                <button class="edit-btn" data-index="${index}">Edit</button>
                <button class="save-btn" data-index="${index}" style="display: none;">Save</button>
                <button class="cancel-btn" data-index="${index}" style="display: none;">Cancel</button>
                <button class="delete-btn" data-index="${index}">Delete</button>
            </td>
        `;
        sessionsTable.appendChild(row);
    });

    // Add Edit functionality
    document.querySelectorAll(".edit-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const index = e.target.dataset.index;
            const row = sessionsTable.rows[index];
            row.querySelectorAll(".edit-input").forEach(input => input.disabled = false);
            row.querySelector(".edit-btn").style.display = "none";
            row.querySelector(".save-btn").style.display = "inline-block";
            row.querySelector(".cancel-btn").style.display = "inline-block";
        });
    });

    // Save Edited Session
    document.querySelectorAll(".save-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const index = e.target.dataset.index;
            const row = sessionsTable.rows[index];

            // Get updated values
            const updatedTopic = row.cells[0].querySelector(".edit-input").value.trim();
            const updatedStarted = row.cells[1].querySelector(".edit-input").value.trim();
            const updatedEnded = row.cells[2].querySelector(".edit-input").value.trim();

            if (!updatedTopic || !updatedStarted || !updatedEnded) {
                alert("All fields (Topic, Started, Ended) must be filled!");
                return;
            }

            // Parse updated time and recalculate total time
            const startedTime = new Date(`${formatDate(sessions[index].date)} ${updatedStarted}`).getTime();
            const endedTime = new Date(`${formatDate(sessions[index].date)} ${updatedEnded}`).getTime();
            if (endedTime <= startedTime) {
                alert("Ended time must be after the Started time.");
                return;
            }
            const newTotalTime = calculateTotalTime(startedTime, endedTime);

            // Update session
            sessions[index] = {
                ...sessions[index],
                topic: updatedTopic,
                started: startedTime,
                ended: endedTime,
                totalTime: newTotalTime
            };

            // Save to DynamoDB
            const params = {
                TableName: "LearningTracker",
                Key: { userId },
                UpdateExpression: "SET sessions = :updatedSessions",
                ExpressionAttributeValues: {
                    ":updatedSessions": sessions
                }
            };

            try {
                await docClient.update(params).promise();
                saveToLocalStorage(); // Update local storage
                loadSessions(sessions); // Reload the table
            } catch (err) {
                console.error("Error updating session:", err);
                alert("Error updating session. Check console.");
            }
        });
    });

    // Cancel Editing
    document.querySelectorAll(".cancel-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            loadSessions(sessions); // Reload table without changes
        });
    });

    // Add Delete functionality
    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const index = e.target.dataset.index; // Get the session index
            sessions.splice(index, 1); // Remove the session from the local array
            saveToLocalStorage(); // Update local storage

            // Update DynamoDB
            const params = {
                TableName: "LearningTracker",
                Key: { userId },
                UpdateExpression: "SET sessions = :updatedSessions",
                ExpressionAttributeValues: {
                    ":updatedSessions": sessions
                }
            };

            try {
                await docClient.update(params).promise();
                loadSessions(sessions); // Reload the table with updated data
            } catch (err) {
                console.error("Error deleting session:", err);
                alert("Error deleting session. Check console.");
            }
        });
    });
}


// Login Functionality
submitPassword.addEventListener("click", async () => {
    const password = passwordInput.value;
    const params = {
        TableName: "LearningTracker",
        Key: { userId }
    };

    try {
        const data = await docClient.get(params).promise();
        if (data.Item && data.Item.password === password) {
            sessions = data.Item.sessions || [];
            saveToLocalStorage(); // Save login state to localStorage
            loadSessions(sessions);
            passwordPrompt.style.display = "none";
            mainContent.style.display = "block";
        } else {
            alert("Invalid Password");
        }
    } catch (err) {
        console.error("Error logging in:", err);
        alert("Error logging in. Check console.");
    }
});

// Logout Functionality
document.getElementById("logoutBtn").addEventListener("click", async () => {
    if (currentSession.started) {
        // Stop the current session
        currentSession.ended = Date.now();
        currentSession.totalTime = calculateTotalTime(currentSession.started, currentSession.ended);
        sessions.push(currentSession); // Add to sessions
        saveToLocalStorage(); // Update localStorage

        // Save to DynamoDB
        const params = {
            TableName: "LearningTracker",
            Key: { userId },
            UpdateExpression: "SET sessions = :updatedSessions",
            ExpressionAttributeValues: {
                ":updatedSessions": sessions
            }
        };

        try {
            await docClient.update(params).promise();
        } catch (err) {
            console.error("Error saving session on logout:", err);
        }
    }

    // Clear everything on logout
    clearLocalStorage();
    stopTimer();
    mainContent.style.display = "none";
    passwordPrompt.style.display = "block";
    passwordInput.value = "";
    topicInput.value = "";
    timer.textContent = "00:00:00";
    currentSession = {};
});

// Start Session
clockInBtn.addEventListener("click", () => {
    const topic = topicInput.value.trim();
    if (!topic) return alert("Please enter a topic!");

    currentSession = {
        topic,
        started: Date.now(),
        date: new Date().toLocaleDateString()
    };

    saveToLocalStorage(); // Save session state to localStorage

    clockInBtn.disabled = true;
    clockOutBtn.disabled = false;
    currentTopic.textContent = topic;
    startTimer(currentSession.started);
});

// Stop Session
clockOutBtn.addEventListener("click", async () => {
    if (!currentSession.started) return;

    currentSession.ended = Date.now();
    currentSession.totalTime = calculateTotalTime(currentSession.started, currentSession.ended);

    clockInBtn.disabled = false;
    clockOutBtn.disabled = true;
    stopTimer();

    sessions.push(currentSession);
    currentSession = {}; // Reset current session
    saveToLocalStorage(); // Save updated state to localStorage

    const params = {
        TableName: "LearningTracker",
        Key: { userId },
        UpdateExpression: "SET sessions = :updatedSessions",
        ExpressionAttributeValues: {
            ":updatedSessions": sessions
        }
    };

    try {
        await docClient.update(params).promise();
        loadSessions(sessions);
        currentTopic.textContent = "";
        timer.textContent = "00:00:00";
    } catch (err) {
        console.error("Error saving session:", err);
        alert("Error saving session. Check console.");
    }
});

// Initialize the app by loading data from localStorage
window.onload = () => {
    loadFromLocalStorage();
};
