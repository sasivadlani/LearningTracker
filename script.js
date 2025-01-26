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
const sessionsContainer = document.getElementById("sessionsContainer");
const localTimeElement = document.getElementById("localTime");
const todoList = document.getElementById("todoList");
const newTodoInput = document.getElementById("newTodo");
const addTodoBtn = document.getElementById("addTodoBtn");
const todoItems = document.getElementById("todoItems");

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
    interval = setInterval(() => {
        elapsed = Math.floor((Date.now() - startedTime) / 1000);
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
        currentSession = JSON.parse(localStorage.getItem("currentSession")) || [];
        sessions = JSON.parse(localStorage.getItem("sessions")) || [];

        // Fetch sessions from DynamoDB
        const params = {
            TableName: "LearningTracker",
            Key: { userId }
        };

        docClient.get(params, (err, data) => {
            if (err) {
                console.error("Error fetching sessions from DynamoDB:", err);
            } else {
                sessions = data.Item.sessions || [];
                if (currentSession.started) {
                    clockInBtn.disabled = true;
                    clockOutBtn.disabled = false;
                    currentTopic.textContent = currentSession.topic;
                    startTimer(currentSession.started);
                    todoList.style.display = "block"; // Ensure todo list is visible
                    loadTodos();
                }
                loadSessions(sessions);
                passwordPrompt.style.display = "none";
                mainContent.style.display = "block";
            }
        });
    }
}

function clearLocalStorage() {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userId");
    localStorage.removeItem("currentSession");
    localStorage.removeItem("sessions");
}

function formatDateForDisplay(date) {
    const options = { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' };
    return new Date(date).toLocaleDateString('en-GB', options);
}

// Load sessions from DynamoDB
function loadSessions(sessions) {
    const sessionsContainer = document.getElementById("sessionsContainer");
    sessionsContainer.innerHTML = ""; // Clear the container

    const sessionsByDate = sessions.reduce((acc, session) => {
        const date = formatDateForDisplay(session.date);
        if (!acc[date]) acc[date] = [];
        acc[date].push(session);
        return acc;
    }, {});

    // Sort dates from newest to oldest
    const sortedDates = Object.keys(sessionsByDate).sort((a, b) => new Date(b) - new Date(a));

    sortedDates.forEach(date => {
        // Sort sessions within each date from newest to oldest
        sessionsByDate[date].sort((a, b) => new Date(b.started) - new Date(a.started));

        const dateSection = document.createElement("div");
        const isToday = date === formatDateForDisplay(new Date());

        dateSection.innerHTML = `
            <button class="collapsible" ${isToday ? 'class="active"' : ''}>
                ${date}
                <span class="icon">></span>
            </button>
            <div class="collapsible-content" style="${isToday ? 'display:block;' : ''}">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th class="topic">Topic</th>
                            <th class="started">Started</th>
                            <th class="ended">Ended</th>
                            <th class="totalTime">Total Time</th>
                            <th class="comment">Comment</th>
                            <th class="actions">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sessionsByDate[date].map((session, index) => `
                            <tr data-session-index="${sessions.indexOf(session)}">
                                <td><input type="text" class="edit-input" value="${session.topic}" disabled /></td>
                                <td><input type="text" class="edit-input" value="${formatTime(session.started)}" disabled /></td>
                                <td><input type="text" class="edit-input" value="${formatTime(session.ended)}" disabled /></td>
                                <td>${session.totalTime}</td>
                                <td><input type="text" class="edit-input comment-input" value="${session.comment || ''}" disabled /></td>
                                <td class="actions">
                                    <button class="edit-btn btn btn-primary" data-session-index="${sessions.indexOf(session)}">Edit</button>
                                    <button class="save-btn btn btn-success" data-session-index="${sessions.indexOf(session)}" style="display: none;">Save</button>
                                    <button class="cancel-btn btn btn-secondary" data-session-index="${sessions.indexOf(session)}" style="display: none;">Cancel</button>
                                    <button class="delete-btn btn btn-danger" data-session-index="${sessions.indexOf(session)}">Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        sessionsContainer.appendChild(dateSection);
    });

    // Add collapsible functionality
    document.querySelectorAll(".collapsible").forEach(button => {
        button.addEventListener("click", function () {
            this.classList.toggle("active");
            const content = this.nextElementSibling;
            if (content.style.display === "block") {
                content.style.display = "none";
            } else {
                content.style.display = "block";
            }
        });
    });

    // Add Edit functionality
    document.querySelectorAll(".edit-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const index = e.target.dataset.sessionIndex;
            const row = sessionsContainer.querySelector(`tr[data-session-index="${index}"]`);
            row.querySelectorAll(".edit-input").forEach(input => input.disabled = false);
            row.querySelector(".edit-btn").style.display = "none";
            row.querySelector(".save-btn").style.display = "inline-block";
            row.querySelector(".cancel-btn").style.display = "inline-block";
            row.querySelector(".actions").classList.add("editing"); // Add class to expand actions column
        });
    });

    // Save Edited Session
    document.querySelectorAll(".save-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const index = e.target.dataset.sessionIndex;
            const row = sessionsContainer.querySelector(`tr[data-session-index="${index}"]`);

            // Get updated values
            const updatedTopic = row.cells[0].querySelector(".edit-input").value.trim();
            const updatedStarted = row.cells[1].querySelector(".edit-input").value.trim();
            const updatedEnded = row.cells[2].querySelector(".edit-input").value.trim();
            const updatedComment = row.cells[4].querySelector(".comment-input").value.trim(); // Corrected cell index

            if (!updatedTopic || !updatedStarted || !updatedEnded) {
                alert("All fields (Topic, Started, Ended) must be filled!");
                return;
            }

            // Parse updated time and recalculate total time
            const startedTime = new Date(`${formatDate(sessions[index].date)} ${updatedStarted}`).getTime();
            let endedTime = new Date(`${formatDate(sessions[index].date)} ${updatedEnded}`).getTime();
            if (endedTime <= startedTime) {
                const confirmNextDay = confirm("The entered end time is before the start time. Do you want to consider it as the next day?");
                if (!confirmNextDay) {
                    return;
                }
                endedTime += 24 * 60 * 60 * 1000; // Add 24 hours to the end time
            }
            const newTotalTime = calculateTotalTime(startedTime, endedTime);

            // Update session
            sessions[index] = {
                ...sessions[index],
                topic: updatedTopic,
                started: startedTime,
                ended: endedTime,
                totalTime: newTotalTime,
                comment: updatedComment
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
                const openSections = getOpenSections();
                loadSessions(sessions); // Reload the table
                setOpenSections(openSections);
                row.querySelector(".actions").classList.remove("editing"); // Remove class after editing
            } catch (err) {
                console.error("Error updating session:", err);
                alert("Error updating session. Check console.");
            }
        });
    });

    // Cancel Editing
    document.querySelectorAll(".cancel-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const openSections = getOpenSections();
            loadSessions(sessions); // Reload table without changes
            setOpenSections(openSections);
        });
    });

    // Add Delete functionality
    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const index = e.target.dataset.sessionIndex;
            const confirmDelete = confirm(`Are you sure you want to delete "${sessions[index].topic}"?`);
            if (!confirmDelete) {
                return;
            }
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
                const openSections = getOpenSections();
                loadSessions(sessions); // Reload the table with updated data
                setOpenSections(openSections);
            } catch (err) {
                console.error("Error deleting session:", err);
                alert("Error deleting session. Check console.");
            }
        });
    });
}

function getOpenSections() {
    const openSections = [];
    document.querySelectorAll(".collapsible").forEach((button, index) => {
        if (button.classList.contains("active")) {
            openSections.push(index);
        }
    });
    return openSections;
}

function setOpenSections(openSections) {
    document.querySelectorAll(".collapsible").forEach((button, index) => {
        if (openSections.includes(index)) {
            button.classList.add("active");
            button.nextElementSibling.style.display = "block";
        }
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

passwordInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        submitPassword.click();
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
    const specialCharPattern = /[^a-zA-Z0-9 &@,._-]/g;

    if (!topic) {
        return alert("Please enter a topic!");
    }

    if (specialCharPattern.test(topic)) {
        return alert("Topic contains special characters. Please use only letters and numbers.");
    }

    if (topic.length > 50) {
        return alert("Topic is too long. Please use a topic with less than 50 characters.");
    }

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
    todoList.style.display = "block"; // Ensure todo list is visible
    loadTodos();
});

// Stop Session
clockOutBtn.addEventListener("click", async () => {
    if (!currentSession.started) return;

    currentSession.ended = Date.now();
    currentSession.totalTime = calculateTotalTime(currentSession.started, currentSession.ended);
    currentSession.comment = ""; // Add empty comment field

    clockInBtn.disabled = false;
    clockOutBtn.disabled = true;
    stopTimer();

    sessions.push(currentSession);
    try {
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

        await docClient.update(params).promise();
        loadSessions(sessions);
        currentTopic.textContent = "";
        timer.textContent = "00:00:00";
        todoList.style.display = "none";
    } catch (err) {
        console.error("Error saving session:", err);
        alert("Error saving session. Check console.");
    }
});

// Initialize the app by loading data from localStorage
window.onload = () => {
    loadFromLocalStorage();
    updateLocalTime();
    setInterval(updateLocalTime, 1000);
    loadTodos();
};

function updateLocalTime() {
    const now = new Date();
    localTimeElement.textContent = now.toLocaleTimeString();
}

function loadTodos() {
    const todos = JSON.parse(localStorage.getItem("todos")) || [];
    todoItems.innerHTML = "";
    todos.forEach((todo, index) => {
        const li = document.createElement("li");
        li.innerHTML = `
            <input type="text" value="${todo}" disabled>
            <button class="btn btn-danger btn-sm" onclick="deleteTodo(${index})">Delete</button>
        `;
        todoItems.appendChild(li);
    });
}

function saveTodos(todos) {
    localStorage.setItem("todos", JSON.stringify(todos));
}

function addTodo() {
    const todo = newTodoInput.value.trim();
    if (todo) {
        const todos = JSON.parse(localStorage.getItem("todos")) || [];
        todos.push(todo);
        saveTodos(todos);
        loadTodos();
        newTodoInput.value = "";
    }
}

function deleteTodo(index) {
    const todos = JSON.parse(localStorage.getItem("todos")) || [];
    todos.splice(index, 1);
    saveTodos(todos);
    loadTodos();
}

addTodoBtn.addEventListener("click", addTodo);
