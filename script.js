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
// Cache DOM elements
const domElements = {
    passwordInput: document.getElementById("passwordInput"),
    userIdInput: document.getElementById("userIdInput"),
    submitPassword: document.getElementById("submitPassword"),
    mainContent: document.getElementById("mainContent"),
    passwordPrompt: document.getElementById("passwordPrompt"),
    topicInput: document.getElementById("topic"),
    clockInBtn: document.getElementById("clockInBtn"),
    clockOutBtn: document.getElementById("clockOutBtn"),
    currentTopic: document.getElementById("currentTopic"),
    timer: document.getElementById("timer"),
    sessionsContainer: document.getElementById("sessionsContainer"),
    localTimeElement: document.getElementById("localTime"),
    todoList: document.getElementById("todoList"),
    newTodoInput: document.getElementById("newTodo"),
    addTodoBtn: document.getElementById("addTodoBtn"),
    todoItems: document.getElementById("todoItems")
};

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
let weeklyGoals = [];
let weeklyTarget = 56; // Default target

/**
 * Authentication Functions
 */
async function handleLogin() {
    const inputUserId = domElements.userIdInput.value;
    const password = domElements.passwordInput.value;

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
        console.error("Login error:", err);
        alert("Login failed. Please try again.");
    }
}

async function handleLogout() {
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
    domElements.clockInBtn.disabled = false;
    domElements.clockOutBtn.disabled = true;
    domElements.currentTopic.textContent = "";
    domElements.timer.textContent = "00:00:00";

    // Reset state
    currentSession = {};
    sessions = [];
    todos = [];
    stopTimer();
    domElements.mainContent.style.display = "none";
    domElements.passwordPrompt.style.display = "block";
    document.getElementById("weeklyStats").style.display = "none";
    document.getElementById("analytics").style.display = "none";
    document.getElementById("productivityDashboard").style.display = "none";
    domElements.passwordInput.value = "";
    domElements.topicInput.value = "";
    domElements.todoList.classList.add("d-none");

    // Clear all session storage
    sessionStorage.clear();
    userId = null;
}

/**
 * Time and Date Utility Functions
 */
function formatTime(date) {
    return new Date(date).toLocaleTimeString(); // Format as HH:MM:SS AM/PM
}

function formatDate(date) {
    return new Date(date).toLocaleDateString(); // Format as MM/DD/YYYY
}

function formatDateForDisplay(date) {
    const options = { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' };
    return new Date(date).toLocaleDateString('en-GB', options);
}

function calculateTotalTime(started, ended) {
    const duration = (new Date(ended) - new Date(started)) / 1000; // Difference in seconds
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = Math.floor(duration % 60);
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function updateLocalTime() {
    const now = new Date();
    domElements.localTimeElement.textContent = now.toLocaleTimeString();
}

function getWeekDateRange() {
    const now = new Date();
    const monday = new Date(now);
    const currentDay = monday.getDay();
    const diff = currentDay === 0 ? -6 : 1 - currentDay;
    monday.setDate(monday.getDate() + diff);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { start: monday, end: sunday };
}

/**
 * Data Management Functions
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
            weeklyGoals = data.Item.weeklyGoals || []; // Add this line to load weekly goals
            weeklyTarget = data.Item.weeklyTarget || 56; // Add this line

            if (currentSession.started) {
                domElements.clockInBtn.disabled = true;
                domElements.clockOutBtn.disabled = false;
                domElements.currentTopic.textContent = currentSession.topic;
                startTimer(currentSession.started);
            }
            
            loadSessions(sessions);
            domElements.passwordPrompt.style.display = "none";
            domElements.mainContent.style.display = "block";
            domElements.todoList.classList.remove("d-none");
            document.getElementById("weeklyStats").style.display = "block";
            document.getElementById("analytics").style.display = "block";
            document.getElementById("productivityDashboard").style.display = "block";

            loadTodos(todos);
            sessionStorage.setItem("loggedIn", "true");
            sessionStorage.setItem("userId", userId);
            addProductivityDashboard(); // Add this line before renderWeeklyGoals
            renderWeeklyGoals(); 
            updateAnalytics();
        }
    } catch (err) {
        console.error("Error loading data:", err);
    }
}

async function saveUserData() {
    const params = {
        TableName: "LearningTracker",
        Key: { userId },
        UpdateExpression: "SET sessions = :sessions, todos = :todos, currentSession = :currentSession, weeklyGoals = :weeklyGoals",
        ExpressionAttributeValues: {
            ":sessions": sessions,
            ":todos": todos,
            ":currentSession": currentSession,
            ":weeklyGoals": weeklyGoals
        }
    };

    try {
        await docClient.update(params).promise();
    } catch (err) {
        console.error("Error saving data:", err);
        alert("Error saving data. Check console.");
    }
}

async function exportToCSV() {
    const confirmExport = confirm("Are you sure you want to export your session data to a CSV file?");
    if (!confirmExport) {
        return;
    }

    const csvRows = [];
    const headers = ["Topic", "Started", "Ended", "Total Time", "Comment"];
    csvRows.push(headers.join(","));

    sessions.forEach(session => {
        const values = [
            session.topic,
            new Date(session.started).toLocaleString(),
            new Date(session.ended).toLocaleString(),
            session.totalTime,
            session.comment || ""
        ];
        csvRows.push(values.join(","));
    });

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute("download", "sessions.csv");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

/**
 * Session Management Functions
 */
function startTimer(startedTime) {
    interval = setInterval(() => {
        elapsed = Math.floor((Date.now() - startedTime) / 1000);
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;
        domElements.timer.textContent = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        if (hours >= 6) {
            autoClockOut();
        }
        
        if (seconds === 0) {
            renderWeeklyGoals();
        }
    }, 1000);
}

async function autoClockOut() {
    stopTimer();
    const sixHoursAgo = new Date(Date.now() - (6 * 60 * 60 * 1000));
    
    currentSession.ended = sixHoursAgo.getTime();
    currentSession.totalTime = calculateTotalTime(currentSession.started, currentSession.ended);
    currentSession.autoClockOut = true; // Add flag for auto clock-out
    currentSession.comment = "Auto clocked out after 6 hours of inactivity"; // Add default comment
    
    sessions.unshift(currentSession);
    
    try {
        currentSession = {};
        await saveUserData();
        domElements.clockInBtn.disabled = false;
        domElements.clockOutBtn.disabled = true;
        domElements.currentTopic.textContent = "";
        domElements.timer.textContent = "00:00:00";
        
        loadSessions(sessions);
        updateAnalytics();
        alert('Session was automatically clocked out after 6 hours. Please review and edit if needed.');
    } catch (err) {
        console.error("Error in auto clock-out:", err);
    }
}

function stopTimer() {
    clearInterval(interval);
    interval = null;
}

async function handleClockIn() {
    const topic = domElements.topicInput.value.trim();
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

    domElements.clockInBtn.disabled = true;
    domElements.clockOutBtn.disabled = false;
    domElements.currentTopic.textContent = topic + ": ";
    domElements.topicInput.value = ""; // Clear the topic input
    startTimer(currentSession.started);
    renderWeeklyGoals(); // Add this line at the end
}

async function handleClockOut() {
    if (!currentSession.started) return;

    currentSession.ended = Date.now();
    currentSession.totalTime = calculateTotalTime(currentSession.started, currentSession.ended);
    currentSession.comment = ""; // Add empty comment field

    domElements.clockInBtn.disabled = false;
    domElements.clockOutBtn.disabled = true;
    stopTimer();

    sessions.unshift(currentSession);
    try {
        currentSession = {}; // Reset current session
        await saveUserData();
        loadSessions(sessions);
        updateCategoryChart(); 
        updateDailyStudyChart();
        addProductivityDashboard(); // Add this line
        renderWeeklyGoals();
        updateAnalytics();
        domElements.currentTopic.textContent = "";
        domElements.timer.textContent = "00:00:00";
    } catch (err) {
        console.error("Error saving session:", err);
        alert("Error saving session. Check console.");
    }
}

function loadSessions(sessions) {
    const sessionsContainer = document.getElementById("sessionsContainer");
    sessionsContainer.innerHTML = "";
    
    // Get today's date for comparison
    const today = new Date().toLocaleDateString();

    // Group sessions by month and date
    const sessionsByMonth = sessions.reduce((acc, session) => {
        const date = new Date(session.date);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        const dateKey = formatDateForDisplay(session.date);
        
        if (!acc[monthKey]) {
            acc[monthKey] = {
                monthName: date.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
                dates: {}
            };
        }
        if (!acc[monthKey].dates[dateKey]) {
            acc[monthKey].dates[dateKey] = [];
        }
        acc[monthKey].dates[dateKey].push(session);
        return acc;
    }, {});

    // Sort months from newest to oldest
    const sortedMonths = Object.keys(sessionsByMonth).sort((a, b) => b.localeCompare(a));

    sortedMonths.forEach(monthKey => {
        const monthData = sessionsByMonth[monthKey];
        const monthSection = document.createElement("div");
        const isCurrentMonth = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }) === monthData.monthName;

        // Create month-level collapsible
        monthSection.innerHTML = `
            <button class="collapsible month-collapsible ${isCurrentMonth ? 'active' : ''}">
                ${monthData.monthName}
                <span class="icon">></span>
            </button>
            <div class="collapsible-content" style="${isCurrentMonth ? 'display:block;' : 'display:none;'}">
                ${Object.entries(monthData.dates).sort((a, b) => new Date(b[0]) - new Date(a[0])).map(([date, dateSessions]) => {
                    const isToday = new Date(date).toLocaleDateString() === today;
                    return `
                        <button class="collapsible date-collapsible ${isToday ? 'active' : ''}">
                            ${date}
                            <span class="icon">></span>
                        </button>
                        <div class="collapsible-content" style="${isToday ? 'display:block;' : 'display:none;'}">
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
                                    ${dateSessions.map((session, index) => `
                                        <tr data-session-index="${sessions.indexOf(session)}" 
                                            class="${session.autoClockOut ? 'auto-clockout-row' : ''}">
                                            <td class="topic-cell">
                                                <input type="text" class="edit-input" value="${session.topic}" disabled />
                                                <textarea class="topic-textarea" readonly></textarea>
                                            </td>
                                            <td><input type="text" class="edit-input" value="${formatTime(session.started)}" disabled /></td>
                                            <td><input type="text" class="edit-input" value="${formatTime(session.ended)}" disabled /></td>
                                            <td>${session.totalTime}</td>
                                            <td class="comment-cell">
                                                <input type="text" class="edit-input comment-input" 
                                                    value="${session.comment || ''}" 
                                                    disabled 
                                                    style="${session.autoClockOut ? 'color: #856404; font-style: italic;' : ''}"
                                                />
                                                <textarea class="comment-textarea" readonly></textarea>
                                            </td>
                                            <td class="actions">
                                                <button class="edit-btn btn btn-primary" data-session-index="${sessions.indexOf(session)}">Edit</button>
                                                <button class="save-btn btn btn-success" data-session-index="${sessions.indexOf(session)}" style="display: none;">Save</button>
                                                <button class="cancel-btn btn btn-secondary" data-session-index="${sessions.indexOf(session)}" style="display: none;">Cancel</button>
                                                <button class="delete-btn btn btn-danger" data-session-index="${sessions.indexOf(session)}">Delete</button>
                                            </td>
                                            ${session.autoClockOut ? `<div class="alert alert-warning mt-1 mb-1" role="alert">
                                                <i class="bi bi-exclamation-triangle"></i> Auto clocked out after 6 hours
                                            </div>` : ''}
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        sessionsContainer.appendChild(monthSection);
    });

    // Add collapsible functionality for both month and date levels
    document.querySelectorAll(".month-collapsible, .date-collapsible").forEach(button => {
        button.addEventListener("click", function(e) {
            e.stopPropagation();
            this.classList.toggle("active");
            const content = this.nextElementSibling;
            content.style.display = content.style.display === "block" ? "none" : "block";
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

            // Remove autoClockOut flag when session is edited
            delete sessions[index].autoClockOut;

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
                renderWeeklyGoals(); 
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
            renderWeeklyGoals(); 
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
                renderWeeklyGoals();
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
    updateCategoryChart();
    updateDailyStudyChart();
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

/**
 * Todo List Management Functions
 */
function loadTodos(todoList) {
    domElements.todoItems.innerHTML = "";
    todos = todoList;
    
    // Sort todos by status: intermediate -> unchecked -> checked
    todos.sort((a, b) => {
        const statusOrder = { 'intermediate': 0, 'unchecked': 1, 'checked': 2 };
        return statusOrder[a.status || 'unchecked'] - statusOrder[b.status || 'unchecked'];
    });

    todos.forEach((todo, index) => {
        const li = document.createElement("li");
        li.setAttribute('data-full-text', todo.text);
        li.setAttribute('data-id', index);
        const status = todo.status || 'unchecked';
        li.className = `list-group-item d-flex justify-content-between align-items-center ${status}`;
        li.innerHTML = `
            <div class="form-check">
                <input type="checkbox" class="form-check-input" 
                    ${status === 'checked' ? "checked" : ""} 
                    ${status === 'intermediate' ? "indeterminate='true'" : ""}
                    onclick="toggleTodoCheck(${index})">
                <input type="text" class="form-control-plaintext" value="${todo.text}" disabled>
            </div>
            <button class="btn btn-danger btn-sm" onclick="deleteTodo(${index})">x</button>
        `;
        domElements.todoItems.appendChild(li);
        
        if (status === 'intermediate') {
            li.querySelector('input[type="checkbox"]').indeterminate = true;
        }
    });

    // Initialize Sortable with modified options
    if (!domElements.todoItems.sortable) {
        domElements.todoItems.sortable = new Sortable(domElements.todoItems, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            filter: '.form-check-input, .btn', // Prevent dragging from checkbox and delete button
            onEnd: async function(evt) {
                const newIndex = evt.newIndex;
                const oldIndex = evt.oldIndex;
                
                // Reorder the todos array
                const item = todos.splice(oldIndex, 1)[0];
                todos.splice(newIndex, 0, item);
                
                // Save the new order
                await saveUserData();
                
                // Refresh the display without full reload
                loadTodos(todos);
            }
        });
    }
}

async function addTodo() {
    const todo = domElements.newTodoInput.value.trim();
    if (todo) {
        todos.unshift({ text: todo, status: 'unchecked' });
        await saveUserData();
        loadTodos(todos);
        domElements.newTodoInput.value = "";
    }
}

async function deleteTodo(index) {
    todos.splice(index, 1);
    await saveUserData();
    loadTodos(todos);
}

async function toggleTodoCheck(index) {
    // Cycle through states: unchecked -> intermediate -> checked
    const currentStatus = todos[index].status || 'unchecked';
    const todo = todos[index];

    switch (currentStatus) {
        case 'unchecked':
            todo.status = 'intermediate';
            // Move to top of the list
            todos.splice(index, 1);
            todos.unshift(todo);
            break;
        case 'intermediate':
            todo.status = 'checked';
            // Move to bottom with checked items
            todos.splice(index, 1);
            const firstCheckedIndex = todos.findIndex(t => t.status === 'checked');
            if (firstCheckedIndex === -1) {
                todos.push(todo);
            } else {
                todos.splice(firstCheckedIndex, 0, todo);
            }
            break;
        case 'checked':
            todo.status = 'unchecked';
            // Move after intermediate items but before checked items
            todos.splice(index, 1);
            const firstChecked = todos.findIndex(t => t.status === 'checked');
            const afterIntermediate = todos.findIndex(t => t.status !== 'intermediate');
            const insertIndex = afterIntermediate === -1 ? todos.length : afterIntermediate;
            todos.splice(insertIndex, 0, todo);
            break;
    }
    
    await saveUserData();
    loadTodos(todos);
}

/**
 * Weekly Goals Management Functions
 */
async function loadWeeklyGoals() {
    if (!userId) return;

    try {
        const data = await docClient.get({
            TableName: "LearningTracker",
            Key: { userId }
        }).promise();

        if (data.Item && data.Item.weeklyGoals) {
            weeklyGoals = data.Item.weeklyGoals;
            renderWeeklyGoals();
        }
    } catch (err) {
        console.error("Error loading weekly goals:", err);
    }
}

function isGoalCompleted(goal) {
    const progress = calculateGoalProgress(goal.category, goal.weekStart);
    return progress >= goal.hours;
}

function renderWeeklyGoals() {
    const goalsContainer = document.getElementById('goalsContainer');
    if (!goalsContainer) return;

    const { start, end } = getWeekDateRange();
    const dateRange = `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    
    // Get current week's goals (excluding completed ones)
    const currentWeekGoals = weeklyGoals.filter(goal => 
        (!goal.weekStart || isCurrentWeek(new Date(goal.weekStart))) && 
        !isGoalCompleted(goal)
    );

    // Get backlog goals (excluding completed ones)
    const backlogGoals = getBacklogGoals().filter(goal => !isGoalCompleted(goal));

    // Get completed goals
    const completedGoals = weeklyGoals.filter(goal => isGoalCompleted(goal));

    goalsContainer.innerHTML = `
        <div class="text-muted small mb-2">Week: ${dateRange}</div>
        <div id="currentWeekGoals"></div>
        ${backlogGoals.length ? '<div id="backlogGoals" class="mt-3"><h5 class="text-danger">Backlog</h5></div>' : ''}
        ${completedGoals.length ? '<div id="completedGoals" class="mt-3"><h5 class="text-success">Completed Goals</h5></div>' : ''}
    `;

    // Render current week's goals
    const currentWeekContainer = document.getElementById('currentWeekGoals');
    renderGoalsList(currentWeekGoals, currentWeekContainer);

    // Render backlog if exists
    if (backlogGoals.length) {
        const backlogContainer = document.getElementById('backlogGoals');
        renderGoalsList(backlogGoals, backlogContainer);
    }

    // Render completed goals if exists
    if (completedGoals.length) {
        const completedContainer = document.getElementById('completedGoals');
        renderGoalsList(completedGoals, completedContainer);
    }
}

async function addWeeklyGoal() {
    const categoryInput = document.getElementById('goalCategory');
    const hoursInput = document.getElementById('goalHours');
    
    const category = categoryInput.value.trim();
    const hours = parseFloat(hoursInput.value);

    if (!category) {
        alert('Please enter a category name');
        categoryInput.focus();
        return;
    }

    if (isNaN(hours) || hours <= 0) {
        alert('Please enter a valid number of hours (greater than 0)');
        hoursInput.focus();
        return;
    }

    // Get the Monday of current week
    const now = new Date();
    const monday = new Date(now);
    const currentDay = monday.getDay();
    const diff = currentDay === 0 ? -6 : 1 - currentDay; // Adjust for Sunday
    monday.setDate(monday.getDate() + diff);
    monday.setHours(0, 0, 0, 0);

    const newGoal = {
        category,
        hours,
        weekStart: monday.toISOString(),
        weekNumber: getWeekNumber(monday)
    };

    // Check if goal for this category already exists in the current week
    const existingGoal = weeklyGoals.find(g => {
        const goalWeekStart = new Date(g.weekStart);
        return g.category.toUpperCase() === category.toUpperCase() && 
               goalWeekStart.getTime() === monday.getTime();
    });

    if (existingGoal) {
        const update = confirm(`A goal for ${existingGoal.category} already exists for this week. Do you want to update it?`);
        if (update) {
            existingGoal.hours = hours;
        } else {
            return;
        }
    } else {
        weeklyGoals.push(newGoal);
    }
    
    try {
        await saveUserData(); // Use the existing saveUserData function that includes weeklyGoals
        categoryInput.value = '';
        hoursInput.value = '';
        renderWeeklyGoals();
        updateAnalytics(); // Update charts and goals display
    } catch (err) {
        console.error("Error saving weekly goal:", err);
        if (!existingGoal) {
            weeklyGoals.pop(); // Remove the goal if save failed
        }
        alert('Failed to save goal. Please try again.');
    }
}

async function deleteGoal(index) {
    weeklyGoals.splice(index, 1);
    
    try {
        await docClient.update({
            TableName: "LearningTracker",
            Key: { userId },
            UpdateExpression: "SET weeklyGoals = :goals",
            ExpressionAttributeValues: {
                ":goals": weeklyGoals
            }
        }).promise();
        
        renderWeeklyGoals();
    } catch (err) {
        console.error("Error deleting weekly goal:", err);
    }
}

function calculateGoalProgress(category, weekStart = null) {
    let start, end;
    const now = new Date();
    
    if (weekStart) {
        // For specific week's goal
        start = new Date(weekStart);
        // For backlog goals, count all sessions up to now
        if (start < getWeekDateRange().start) {
            end = now;
        } else {
            // For current/future week goals, only count that week
            end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
        }
    } else {
        // For current week
        const weekRange = getWeekDateRange();
        start = weekRange.start;
        end = weekRange.end;
    }

    let totalHours = 0;
    const categoryUpper = category.toUpperCase();

    sessions.forEach(session => {
        const sessionDate = new Date(session.started);
        if (sessionDate >= start && sessionDate <= end) {
            if (session.topic.toUpperCase().includes(categoryUpper)) {
                totalHours += (new Date(session.ended) - new Date(session.started)) / (1000 * 60 * 60);
            }
        }
    });

    if (currentSession.started && currentSession.topic.toUpperCase().includes(categoryUpper)) {
        const activeSessionHours = (Date.now() - new Date(currentSession.started).getTime()) / (1000 * 60 * 60);
        totalHours += activeSessionHours;
    }

    return totalHours;
}

function isCurrentWeek(date) {
    const { start, end } = getWeekDateRange();
    return date >= start && date <= end;
}

function getBacklogGoals() {
    if (!weeklyGoals || !weeklyGoals.length) return [];
    
    const currentWeekStart = getWeekDateRange().start;
    
    return weeklyGoals
        .filter(goal => {
            if (!goal.weekStart) return false;
            const goalWeekStart = new Date(goal.weekStart);
            return goalWeekStart < currentWeekStart;
        })
        .sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart)); // Sort by most recent first
}

function isGoalActive(category) {
    if (!currentSession.started) return false;
    const categoryUpper = category.toUpperCase();
    return currentSession.topic.toUpperCase().includes(categoryUpper);
}

function renderGoalsList(goals, container) {
    goals.sort((a, b) => {
        // If there's an active session, prioritize the active goal
        if (currentSession.started) {
            const aIsActive = isGoalActive(a.category);
            const bIsActive = isGoalActive(b.category);
            if (aIsActive && !bIsActive) return -1;
            if (!aIsActive && bIsActive) return 1;
        }

        // If neither is active or no current session, use the original sorting
        const weekDiff = new Date(b.weekStart) - new Date(a.weekStart);
        if (weekDiff !== 0) return weekDiff;

        const progressA = (calculateGoalProgress(a.category, a.weekStart) / a.hours) * 100;
        const progressB = (calculateGoalProgress(b.category, b.weekStart) / b.hours) * 100;
        return progressB - progressA;
    });

    goals.forEach((goal) => {
        const progress = calculateGoalProgress(goal.category, goal.weekStart);
        const percentage = Math.min((progress / goal.hours) * 100, 100);
        const isActive = isGoalActive(goal.category);
        
        const goalIndex = weeklyGoals.findIndex(g => 
            g.category === goal.category && 
            g.weekStart === goal.weekStart
        );
        
        const weekStart = new Date(goal.weekStart);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        const goalElement = document.createElement('div');
        goalElement.className = `goal-item ${isActive ? 'active-goal' : ''}`;
        goalElement.innerHTML = `
            <div class="goal-info">
                <div>
                    <strong>${goal.category}</strong>
                    ${isActive ? '<span class="active-indicator"><i class="bi bi-clock-fill text-success"></i></span>' : ''}
                    : ${progress.toFixed(1)}/${goal.hours}h
                </div>
                <div class="progress goal-progress">
                    <div class="progress-bar ${percentage >= 100 ? 'bg-success' : percentage >= 70 ? 'bg-info' : 'bg-primary'}" 
                         role="progressbar" 
                         style="width: ${percentage}%" 
                         aria-valuenow="${percentage}" 
                         aria-valuemin="0" 
                         aria-valuemax="100">
                        ${percentage.toFixed(0)}%
                    </div>
                </div>
            </div>
            <div class="goal-actions">
                <button class="btn btn-sm btn-outline-secondary edit-goal-btn" onclick="editGoal(${goalIndex})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteGoal(${goalIndex})">-</button>
            </div>
        `;
        container.appendChild(goalElement);
    });
}

async function editGoal(index) {
    const goal = weeklyGoals[index];
    document.getElementById('editGoalCategory').value = goal.category;
    document.getElementById('editGoalHours').value = goal.hours;
    
    // Fix date display
    const date = new Date(goal.weekStart);
    const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    document.getElementById('editGoalWeekStart').value = localDate.toISOString().split('T')[0];
    
    document.getElementById('editGoalModal').setAttribute('data-goal-index', index);
    $('#editGoalModal').modal('show');
}

async function saveEditedGoal() {
    const index = parseInt(document.getElementById('editGoalModal').getAttribute('data-goal-index'));
    const category = document.getElementById('editGoalCategory').value.trim();
    const hours = parseFloat(document.getElementById('editGoalHours').value);
    
    // Fix date handling
    const selectedDate = document.getElementById('editGoalWeekStart').value;
    const weekStart = new Date(selectedDate);
    // Add timezone offset to keep the date as selected
    weekStart.setMinutes(weekStart.getMinutes() + weekStart.getTimezoneOffset());
    weekStart.setHours(0, 0, 0, 0);

    if (!category || isNaN(hours) || hours <= 0) {
        alert('Please fill all fields correctly');
        return;
    }

    weeklyGoals[index] = {
        ...weeklyGoals[index],
        category,
        hours,
        weekStart: weekStart.toISOString(),
        weekNumber: getWeekNumber(weekStart)
    };

    try {
        await saveUserData();
        $('#editGoalModal').modal('hide');
        renderWeeklyGoals();
        updateAnalytics();
    } catch (err) {
        console.error("Error updating goal:", err);
        alert('Failed to update goal. Please try again.');
    }
}

// Add this new utility function
function getWeekNumber(date) {
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    target.setDate(target.getDate() + 3 - (target.getDay() + 6) % 7);
    const weekStart = new Date(target.getFullYear(), 0, 4);
    return 1 + Math.round(((target - weekStart) / 86400000 - 3 + (weekStart.getDay() + 6) % 7) / 7);
}

/**
 * Analytics and Visualization Functions
 */
function updateAnalytics() {
    updateCategoryChart();
    updateDailyStudyChart();
    renderWeeklyGoals();
}

function updateCategoryChart() {
    const groupTimes = calculateWeeklyGroupTimes();
    
    const data = new google.visualization.DataTable();
    data.addColumn('string', 'Category');
    data.addColumn('number', 'Hours');
    
    Object.entries(groupTimes).forEach(([category, hours]) => {
        data.addRow([`${category}`, hours]);
    });

    const options = {
        pieHole: 0.8,
        height: "100%",
        width: 200,
        legend: { 
            position: 'bottom',
            alignment: 'end',
                textStyle: {
                fontSize: 11,
                bold: true,
                color: 'black',
            },
        },
        chartArea: { 
            width: '90%',
            height: '90%',
            top: 0,
        },
        // is3D: ≥true,
        pieSliceText: 'label',
        pieSliceTextStyle: {
            color: 'black',
            fontSize: 10,
            bold: true,
        },
        tooltip: {
            trigger: 'selection'
        }
    };

    const chart = new google.visualization.PieChart(document.getElementById('categoryChart'));
    chart.draw(data, options);
}

function updateDailyStudyChart() {
    const dailyStudyTime = calculateDailyStudyTime();
    
    const data = new google.visualization.DataTable();
    data.addColumn('string', 'Date');

    // Get all unique groups
    const groups = new Set();
    Object.values(dailyStudyTime).forEach(groupsData => {
        Object.keys(groupsData).forEach(group => groups.add(group));
    });

    // Add columns for each group
    groups.forEach(group => data.addColumn('number', group));
    data.addColumn({ type: 'number', role: 'annotation' }); // Add annotation column for total hours

    // Get the last 7 dates including today
    const today = new Date().toLocaleDateString();
    const sortedDates = Object.keys(dailyStudyTime).sort((a, b) => new Date(a) - new Date(b));
    const last7Dates = sortedDates.filter(date => new Date(date) <= new Date(today)).slice(-7);

    // Add rows for each date
    last7Dates.forEach(date => {
        const groupsData = dailyStudyTime[date] || {};
        const dateObj = new Date(date);
        const formattedDate = `${dateObj.toLocaleDateString('en-US', { weekday: 'short' })}, ${dateObj.toLocaleDateString('en-GB')}`;
        const row = [formattedDate];
        let totalHours = 0;
        groups.forEach(group => {
            const hours = groupsData[group] || 0;
            row.push(hours);
            totalHours += hours;
        });
        row.push(totalHours); // Add total hours as annotation
        data.addRow(row);
    });

    const options = {
        title: 'Daily Study Time',
        hAxis: { 
            title: 'Date',
            slantedText: true,
            slantedTextAngle: 45
        },
        vAxis: { title: 'Hours' },
        legend: { position: 'none' },
        height: 400,
        chartArea: { width: '80%', height: '70%' },
        isStacked: true,
        annotations: {
            alwaysOutside: true,
            textStyle: {
                fontSize: 12,
                auraColor: 'none',
                color: 'black'
            }
        }
    };

    const chart = new google.visualization.ColumnChart(document.getElementById('dailyStudyChart'));
    chart.draw(data, options);
}

function calculateWeeklyGroupTimes() {
    const { start, end } = getWeekDateRange();
    const groupTimes = {};

    // Filter sessions within the current week
    const weekSessions = sessions.filter(session => {
        const sessionDate = new Date(session.started);
        return sessionDate >= start && sessionDate <= end;
    });

    weekSessions.forEach(session => {
        let group;
        if (session.topic.includes(':')) {
            group = session.topic.split(':')[0].trim().toUpperCase();
        } else {
            group = session.topic.split(' ')[0].trim().toUpperCase();
        }
        const duration = (new Date(session.ended) - new Date(session.started)) / (1000 * 60 * 60); // Duration in hours

        groupTimes[group] = (groupTimes[group] || 0) + duration;
    });

    return groupTimes;
}

function calculateDailyStudyTime() {
    const dailyStudyTime = {};

    sessions.forEach(session => {
        if (session.topic.toUpperCase().startsWith("LT:")) return;

        const date = formatDate(session.started);
        let group;
        if (session.topic.includes(':')) {
            group = session.topic.split(':')[0].trim().toUpperCase();
        } else {
            group = session.topic.split(' ')[0].trim().toUpperCase();
        }
        const duration = (new Date(session.ended) - new Date(session.started)) / (1000 * 60 * 60); // Duration in hours

        if (!dailyStudyTime[date]) {
            dailyStudyTime[date] = {};
        }

        dailyStudyTime[date][group] = (dailyStudyTime[date][group] || 0) + duration;
    });

    return dailyStudyTime;
}

// Add after calculateDailyStudyTime()
function calculateProductivityScore() {
    const { start, end } = getWeekDateRange();
    let totalMinutes = 0;
    let uniqueDays = new Set();
    let longSessions = 0;
    let totalSessions = 0;

    const weekSessions = sessions.filter(session => {
        const sessionDate = new Date(session.started);
        return sessionDate >= start && sessionDate <= end;
    });

    weekSessions.forEach(session => {
        const sessionDate = new Date(session.started).toLocaleDateString();
        uniqueDays.add(sessionDate);
        
        const duration = (new Date(session.ended) - new Date(session.started)) / (1000 * 60); // minutes
        totalMinutes += duration;
        totalSessions++;
        
        if (duration >= 45) { // Sessions longer than 45 minutes
            longSessions++;
        }
    });

    return {
        productivity: ((totalMinutes / (7 * weeklyTarget/7 * 60)) * 100).toFixed(1), // % of 8-hour daily target
        consistency: ((uniqueDays.size / 7) * 100).toFixed(1), // % of days active
        focus: totalSessions > 0 ? ((longSessions / totalSessions) * 100).toFixed(1) : "0.0" // % of focused sessions
    };
}

function addProductivityDashboard() {
    const scores = calculateProductivityScore();
    const dashboard = document.getElementById('productivityDashboard');
    if (!dashboard) return;

    dashboard.innerHTML = `
        <div class="card mb-4">
            <div class="card-header cursor-pointer" id="productivityHeader">
                <h5 class="mb-0 h4 d-flex justify-content-between align-items-center">
                    Weekly Productivity Metrics
                    <span class="toggle-icon">▼</span>
                </h5>
            </div>
            <div class="card-body" id="productivityMetrics" style="display: none;">
                <ul class="list-group">
                    <li class="list-group-item">
                        <div class="metric-label mb-2">
                            <h6 class="mb-0">Weekly Target</h6>
                            <small class="text-muted cursor-pointer" data-toggle="modal" data-target="#weeklyTargetModal">
                                Target: ${weeklyTarget} hours/week (click to edit)
                            </small>
                        </div>
                        <div class="progress" style="height: 20px;">
                            <div class="progress-bar bg-primary text-dark" role="progressbar" 
                                 style="width: ${Math.min(scores.productivity, 100)}%">
                                <span class="progress-text">${scores.productivity}%</span>
                            </div>
                        </div>
                    </li>
                    <li class="list-group-item">
                        <div class="metric-label mb-2">
                            <h6 class="mb-0">Daily Consistency</h6>
                            <small class="text-muted">Days active this week</small>
                        </div>
                        <div class="progress" style="height: 20px;">
                            <div class="progress-bar bg-success text-dark" role="progressbar" 
                                 style="width: ${scores.consistency}%">
                                <span class="progress-text">${scores.consistency}%</span>
                            </div>
                        </div>
                    </li>
                    <li class="list-group-item">
                        <div class="metric-label mb-2">
                            <h6 class="mb-0">Focus Score</h6>
                            <small class="text-muted">Sessions > 45 minutes</small>
                        </div>
                        <div class="progress" style="height: 20px;">
                            <div class="progress-bar bg-info text-dark" role="progressbar" 
                                 style="width: ${scores.focus}%">
                                <span class="progress-text">${scores.focus}%</span>
                            </div>
                        </div>
                    </li>
                </ul>
            </div>
        </div>
    `;

    // Add click event listener for toggling
    const header = document.getElementById('productivityHeader');
    const metrics = document.getElementById('productivityMetrics');
    const toggleIcon = header.querySelector('.toggle-icon');
    
    header.addEventListener('click', () => {
        const isVisible = metrics.style.display === 'block';
        metrics.style.display = isVisible ? 'none' : 'block';
        toggleIcon.textContent = isVisible ? '▼' : '▲';
    });
}

// Add after loadUserData function
async function saveWeeklyTarget(target) {
    try {
        await docClient.update({
            TableName: "LearningTracker",
            Key: { userId },
            UpdateExpression: "SET weeklyTarget = :target",
            ExpressionAttributeValues: {
                ":target": target
            }
        }).promise();
        weeklyTarget = target;
        addProductivityDashboard();
    } catch (err) {
        console.error("Error saving weekly target:", err);
        alert("Failed to save weekly target");
    }
}

/**
 * Event Listeners
 */
function initializeEventListeners() {
    domElements.submitPassword.addEventListener("click", handleLogin);

    domElements.passwordInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            domElements.submitPassword.click();
        }
    });

    domElements.newTodoInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            domElements.addTodoBtn.click();
        }
    });

    domElements.topicInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            domElements.clockInBtn.click();
        }
    });

    document.getElementById("logoutBtn").addEventListener("click", () => {
        handleLogout().catch(err => {
            console.error("Error during logout:", err);
        });
    });

    domElements.clockInBtn.addEventListener("click", handleClockIn);
    domElements.clockOutBtn.addEventListener("click", handleClockOut);
    domElements.addTodoBtn.addEventListener("click", addTodo);

    document.getElementById("exportDataBtn").addEventListener("click", exportToCSV);

    document.getElementById('addGoalBtn').addEventListener('click', addWeeklyGoal);
    document.getElementById('goalCategory').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('goalHours').focus();
        }
    });
    document.getElementById('goalHours').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addWeeklyGoal();
        }
    });

    // Add weekly target modal handlers
    document.getElementById('saveWeeklyTarget').addEventListener('click', async () => {
        const input = document.getElementById('weeklyTargetInput');
        const newTarget = parseFloat(input.value);
        if (newTarget > 0 && newTarget <= 168) {
            await saveWeeklyTarget(newTarget);
            $('#weeklyTargetModal').modal('hide');
        } else {
            alert('Please enter a valid number of hours (1-168)');
        }
    });

    $('#weeklyTargetModal').on('show.bs.modal', function () {
        document.getElementById('weeklyTargetInput').value = weeklyTarget;
    });

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'i':
                    e.preventDefault();
                    if (!domElements.clockInBtn.disabled) domElements.clockInBtn.click();
                    break;
                case 'o':
                    e.preventDefault();
                    if (!domElements.clockOutBtn.disabled) domElements.clockOutBtn.click();
                    break;
            }
        }
    });

    document.getElementById('saveEditedGoalBtn').addEventListener('click', saveEditedGoal);

    // Add styles for drag and drop
    const style = document.createElement('style');
    style.textContent = `
        .sortable-ghost {
            opacity: 0.4;
            background-color: #c8ebfb;
        }
        
        .handle {
            color: #999;
        }
        
        .handle:hover {
            color: #333;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Application Initialization
 */
window.onload = async () => {
    if (sessionStorage.getItem("loggedIn") === "true") {
        userId = sessionStorage.getItem("userId"); // Restore userId
        if (userId) {
            await loadUserData();
            await loadWeeklyGoals();
        }
    }
    updateLocalTime();
    setInterval(updateLocalTime, 1000);
    google.charts.load('current', { packages: ['corechart'] });
    google.charts.setOnLoadCallback(updateAnalytics);

    initializeEventListeners();
    addProductivityDashboard();
};

google.charts.load('current', {'packages':['corechart']});
google.charts.setOnLoadCallback(updateCategoryChart);