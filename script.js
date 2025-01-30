/**
 * AWS Configuration and DynamoDB Setup
 */
// AWS Configuration
AWS.config.update({
    region: "us-east-1", // Replace with your DynamoDB region
    accessKeyId: "AWS_ACCESS_KEY_ID", // Replace with your Access Key ID
    secretAccessKey: "AWS_SECRET_ACCESS_KEY" // Replace with your Secret Access Key
});

// DynamoDB Instance
const docClient = new AWS.DynamoDB.DocumentClient();

/**
 * DOM Element References
 * Get references to all HTML elements needed for the application
 */
// Elements from DOM
const passwordInput = document.getElementById("passwordInput");
const userIdInput = document.getElementById("userIdInput");
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
const startPomodoroBtn = document.getElementById("startPomodoro");
const resetPomodoroBtn = document.getElementById("resetPomodoro");
const workDurationInput = document.getElementById("workDuration");
const pomodoroMinutes = document.getElementById("pomodoroMinutes");
const pomodoroSeconds = document.getElementById("pomodoroSeconds");

/**
 * Global State Variables
 * Track current session, todos, and timer states
 */
// Global Variables
let currentSession = {};
let sessions = [];
let todos = [];
let userId = null; 
let interval = null; 
let pomodoroTimer = null;
let pomodoroTimeLeft = 0;

/**
 * Time Formatting and Calculation Functions
 */
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

/**
 * Timer Management Functions
 */
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

/**
 * Data Management Functions
 * Handle loading and saving user data to DynamoDB
 */
async function loadUserData() {
    if (!userId) {
        console.error("No user ID available");
        return;
    }

    const params = {
        TableName: "LearningTracker",
        Key: { userId }
    };

    try {
        const data = await docClient.get(params).promise();
        if (data.Item) {
            sessions = data.Item.sessions || [];
            todos = data.Item.todos || [];
            currentSession = data.Item.currentSession || {};

            if (currentSession.started) {
                clockInBtn.disabled = true;
                clockOutBtn.disabled = false;
                currentTopic.textContent = currentSession.topic;
                startTimer(currentSession.started);
            }
            
            loadSessions(sessions);
            passwordPrompt.style.display = "none";
            mainContent.style.display = "block";
            todoList.classList.remove("d-none");
            document.getElementById("pomodoro").style.display = "block"; // Show Pomodoro timer
            loadTodos(todos);
            sessionStorage.setItem("loggedIn", "true"); // Set logged-in state
            sessionStorage.setItem("userId", userId); // Store userId in session storage
        }
    } catch (err) {
        console.error("Error loading data:", err);
    }
}

async function saveUserData() {
    const params = {
        TableName: "LearningTracker",
        Key: { userId },
        UpdateExpression: "SET sessions = :sessions, todos = :todos, currentSession = :currentSession",
        ExpressionAttributeValues: {
            ":sessions": sessions,
            ":todos": todos,
            ":currentSession": currentSession
        }
    };

    try {
        await docClient.update(params).promise();
    } catch (err) {
        console.error("Error saving data:", err);
        alert("Error saving data. Check console.");
    }
}

/**
 * Session Management Functions
 * Handle displaying and managing learning sessions
 */
function formatDateForDisplay(date) {
    const options = { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' };
    return new Date(date).toLocaleDateString('en-GB', options);
}

function toggleCommentDisplay(event) {
    const row = event.currentTarget.closest('tr');
    const commentCell = row.querySelector('.comment-cell');
    const topicCell = row.querySelector('.topic-cell');
    
    const commentInput = commentCell.querySelector(".comment-input");
    const commentTextarea = commentCell.querySelector(".comment-textarea");
    const topicInput = topicCell.querySelector(".edit-input");
    const topicTextarea = topicCell.querySelector(".topic-textarea");

    if (commentInput.disabled && topicInput.disabled) {
        // Toggle both textareas
        const isHidden = commentTextarea.style.display === "none" || !commentTextarea.style.display;
        commentTextarea.style.display = isHidden ? "block" : "none";
        topicTextarea.style.display = isHidden ? "block" : "none";
        
        commentTextarea.value = commentInput.value;
        topicTextarea.value = topicInput.value;
    }
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
                                <td class="topic-cell">
                                    <input type="text" class="edit-input" value="${session.topic}" disabled />
                                    <textarea class="topic-textarea" readonly></textarea>
                                </td>
                                <td><input type="text" class="edit-input" value="${formatTime(session.started)}" disabled /></td>
                                <td><input type="text" class="edit-input" value="${formatTime(session.ended)}" disabled /></td>
                                <td>${session.totalTime}</td>
                                <td class="comment-cell">
                                    <input type="text" class="edit-input comment-input" value="${session.comment || ''}" disabled />
                                    <textarea class="comment-textarea" readonly></textarea>
                                </td>
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
            const inputs = row.querySelectorAll(".edit-input");
            
            inputs.forEach(input => {
                input.disabled = false;
                // Add keypress event listener for Enter key
                input.addEventListener("keypress", async (e) => {
                    if (e.key === "Enter") {
                        const saveBtn = row.querySelector(".save-btn");
                        saveBtn.click(); // Trigger save button click
                    }
                });
            });
            
            row.querySelector(".edit-btn").style.display = "none";
            row.querySelector(".save-btn").style.display = "inline-block";
            row.querySelector(".cancel-btn").style.display = "inline-block";
            row.querySelector(".actions").classList.add("editing");
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

    // Add event listener for comment cells and inputs
    document.querySelectorAll(".comment-cell, .topic-cell").forEach(element => {
        element.addEventListener("click", toggleCommentDisplay);
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

/**
 * Authentication Functions
 */
// Login Functionality
submitPassword.addEventListener("click", async () => {
    const inputUserId = userIdInput.value;
    const password = passwordInput.value;

    if (!inputUserId) {
        alert("Please enter a User ID");
        return;
    }

    const params = {
        TableName: "LearningTracker",
        Key: { userId: inputUserId }
    };

    try {
        const data = await docClient.get(params).promise();
        if (!data.Item) {
            alert("User ID not found");
            return;
        }

        if (data.Item.password === password) {
            userId = inputUserId; // Set the userId after successful login
            await loadUserData();
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

newTodoInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        addTodoBtn.click();
    }
});

topicInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        clockInBtn.click();
    }
});

// Logout Functionality
document.getElementById("logoutBtn").addEventListener("click", async () => {
    // Stop Pomodoro timer if running
    if (pomodoroTimer) {
        clearInterval(pomodoroTimer);
        pomodoroTimer = null;
        pomodoroTimeLeft = 3600;
        updatePomodoroDisplay();
    }

    if (currentSession.started) {
        stopTimer();
        currentSession.ended = Date.now();
        currentSession.totalTime = calculateTotalTime(currentSession.started, currentSession.ended);
        sessions.push({ ...currentSession });

        try {
            currentSession = {};
            await saveUserData();
        } catch (err) {
            console.error("Error saving session on logout:", err);
        }
    }

    // Reset UI elements
    clockInBtn.disabled = false;
    clockOutBtn.disabled = true;
    currentTopic.textContent = "";
    timer.textContent = "00:00:00";
    startPomodoroBtn.disabled = false;
    workDurationInput.disabled = false;
    workDurationInput.value = "60";

    // Reset state
    currentSession = {};
    sessions = [];
    todos = [];
    stopTimer();
    mainContent.style.display = "none";
    passwordPrompt.style.display = "block";
    document.getElementById("pomodoro").style.display = "none";
    passwordInput.value = "";
    topicInput.value = "";
    todoList.classList.add("d-none");

    // Clear all session storage
    sessionStorage.clear();
    userId = null;
});

/**
 * Session Management Functions
 */
// Start Session
clockInBtn.addEventListener("click", async () => {
    const topic = topicInput.value.trim();
    const specialCharPattern = /[^a-zA-Z0-9 &@,._:-]/g;

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

    await saveUserData();

    clockInBtn.disabled = true;
    clockOutBtn.disabled = false;
    currentTopic.textContent = topic;
    topicInput.value = ""; // Clear the topic input
    startTimer(currentSession.started);
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
        await saveUserData();
        loadSessions(sessions);
        currentTopic.textContent = "";
        timer.textContent = "00:00:00";
    } catch (err) {
        console.error("Error saving session:", err);
        alert("Error saving session. Check console.");
    }
});

/**
 * Pomodoro Timer Functions
 */
function startPomodoro() {
    if (pomodoroTimer) return;
    
    const duration = parseInt(workDurationInput.value) || 60;
    pomodoroTimeLeft = duration * 60;
    
    startPomodoroBtn.disabled = true;
    workDurationInput.disabled = true;
    
    // Save state when starting
    sessionStorage.setItem('pomodoroTimeLeft', pomodoroTimeLeft);
    sessionStorage.setItem('pomodoroRunning', 'true');
    sessionStorage.setItem('pomodoroDuration', duration);
    
    pomodoroTimer = setInterval(() => {
        pomodoroTimeLeft--;
        updatePomodoroDisplay();
        sessionStorage.setItem('pomodoroTimeLeft', pomodoroTimeLeft);
        
        if (pomodoroTimeLeft <= 0) {
            stopPomodoro();
            new Notification("Pomodoro Timer", {
                body: "Time's up! Take a break!",
                icon: "favicon.ico"
            });
        }
    }, 1000);
}

function stopPomodoro() {
    clearInterval(pomodoroTimer);
    pomodoroTimer = null;
    startPomodoroBtn.disabled = false;
    workDurationInput.disabled = false;
    sessionStorage.removeItem('pomodoroRunning');
}

function resetPomodoro() {
    stopPomodoro();
    const duration = parseInt(workDurationInput.value) || 60;
    pomodoroTimeLeft = duration * 60;
    updatePomodoroDisplay();
    // Clear timer state from storage
    sessionStorage.removeItem('pomodoroTimeLeft');
    sessionStorage.removeItem('pomodoroRunning');
    sessionStorage.removeItem('pomodoroDuration');
}

function updatePomodoroDisplay() {
    const minutes = Math.floor(pomodoroTimeLeft / 60);
    const seconds = pomodoroTimeLeft % 60;
    pomodoroMinutes.textContent = minutes.toString().padStart(2, "0");
    pomodoroSeconds.textContent = seconds.toString().padStart(2, "0");
}

/**
 * Todo List Management Functions
 */
function updateLocalTime() {
    const now = new Date();
    localTimeElement.textContent = now.toLocaleTimeString();
}

function loadTodos(todoList) {
    todoItems.innerHTML = "";
    todos = todoList;
    todos.forEach((todo, index) => {
        const li = document.createElement("li");
        li.setAttribute('data-full-text', todo.text);
        li.className = `list-group-item d-flex justify-content-between align-items-center ${todo.checked ? "checked" : ""}`;
        li.innerHTML = `
            <div class="form-check">
                <input type="checkbox" class="form-check-input" ${todo.checked ? "checked" : ""} onclick="toggleTodoCheck(${index})">
                <input type="text" class="form-control-plaintext" value="${todo.text}" disabled>
            </div>
            <button class="btn btn-danger btn-sm" onclick="deleteTodo(${index})">x</button>
        `;
        todoItems.appendChild(li);
    });
}

async function addTodo() {
    const todo = newTodoInput.value.trim();
    if (todo) {
        todos.unshift({ text: todo, checked: false });
        await saveUserData();
        loadTodos(todos);
        newTodoInput.value = "";
    }
}

async function deleteTodo(index) {
    todos.splice(index, 1);
    await saveUserData();
    loadTodos(todos);
}

async function toggleTodoCheck(index) {
    todos[index].checked = !todos[index].checked;
    if (todos[index].checked) {
        const [checkedTodo] = todos.splice(index, 1);
        const firstUncheckedIndex = todos.findIndex(todo => todo.checked);
        if (firstUncheckedIndex === -1) {
            todos.push(checkedTodo);
        } else {
            todos.splice(firstUncheckedIndex, 0, checkedTodo);
        }
    }
    await saveUserData();
    loadTodos(todos);
}

/**
 * Event Listeners
 */
addTodoBtn.addEventListener("click", addTodo);

// Add these event listeners after other event listeners
startPomodoroBtn.addEventListener("click", () => {
    // Request notification permission if needed
    if (Notification.permission === "default") {
        Notification.requestPermission();
    }
    startPomodoro();
});

resetPomodoroBtn.addEventListener("click", resetPomodoro);

workDurationInput.addEventListener("change", () => {
    if (!pomodoroTimer) {
        resetPomodoro();
    }
});

/**
 * Application Initialization
 */
window.onload = async () => {
    if (sessionStorage.getItem("loggedIn") === "true") {
        userId = sessionStorage.getItem("userId"); // Restore userId
        if (userId) {
            await loadUserData();
        }
    }
    updateLocalTime();
    setInterval(updateLocalTime, 1000);
    
    // Restore pomodoro state
    const savedTimeLeft = sessionStorage.getItem('pomodoroTimeLeft');
    const isRunning = sessionStorage.getItem('pomodoroRunning');
    const savedDuration = sessionStorage.getItem('pomodoroDuration');
    
    if (savedTimeLeft && isRunning) {
        pomodoroTimeLeft = parseInt(savedTimeLeft);
        workDurationInput.value = savedDuration;
        updatePomodoroDisplay();
        startPomodoroBtn.disabled = true;
        workDurationInput.disabled = true;
        
        pomodoroTimer = setInterval(() => {
            pomodoroTimeLeft--;
            updatePomodoroDisplay();
            sessionStorage.setItem('pomodoroTimeLeft', pomodoroTimeLeft);
            
            if (pomodoroTimeLeft <= 0) {
                stopPomodoro();
                new Notification("Pomodoro Timer", {
                    body: "Time's up! Take a break!",
                    icon: "favicon.ico"
                });
            }
        }, 1000);
    } else {
        resetPomodoro();
    }
};
