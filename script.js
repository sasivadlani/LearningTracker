AWS.config.update({
  region: 'us-east-1', // Replace with your DynamoDB region
  accessKeyId: 'AWS_ACCESS_KEY_ID', // Replace with your Access Key ID
  secretAccessKey: 'AWS_SECRET_ACCESS_KEY', // Replace with your Secret Access Key
});

const docClient = new AWS.DynamoDB.DocumentClient();

const domElements = {
  passwordInput: document.getElementById('passwordInput'),
  userIdInput: document.getElementById('userIdInput'),
  submitPassword: document.getElementById('submitPassword'),
  mainContent: document.getElementById('mainContent'),
  passwordPrompt: document.getElementById('passwordPrompt'),
  topicInput: document.getElementById('topic'),
  clockInBtn: document.getElementById('clockInBtn'),
  clockOutBtn: document.getElementById('clockOutBtn'),
  currentTopic: document.getElementById('currentTopic'),
  timer: document.getElementById('timer'),
  sessionsContainer: document.getElementById('sessionsContainer'),
  localTimeElement: document.getElementById('localTime'),
  todoList: document.getElementById('todoList'),
  newTodoInput: document.getElementById('newTodo'),
  addTodoBtn: document.getElementById('addTodoBtn'),
  todoItems: document.getElementById('todoItems'),
};

let currentSession = {};
let sessions = [];
let todos = [];
let userId = null;
let interval = null;
let weeklyGoals = [];
let weeklyTarget = 56;
let stickyNote = '';
let todoManager;

async function handleLogin() {
  const inputUserId = domElements.userIdInput.value;
  const password = domElements.passwordInput.value;

  if (!inputUserId) {
    alert('Please enter a User ID');
    return;
  }

  const params = {
    TableName: 'LearningTracker',
    Key: { userId: inputUserId },
  };

  try {
    const data = await docClient.get(params).promise();
    if (!data.Item) {
      alert('User ID not found');
      return;
    }

    if (data.Item.password === password) {
      userId = inputUserId;
      document.getElementById('logoutBtn').classList.remove('d-none');
      await loadUserData();
    } else {
      alert('Invalid Password');
    }
  } catch (err) {
    console.error('Login error:', err);
    alert('Login failed. Please try again.');
  }
}

async function handleLogout() {
  if (currentSession.started) {
    stopTimer();
    currentSession.ended = Date.now();
    currentSession.breakTime = 0;
    const totalMilliseconds = currentSession.ended - new Date(currentSession.started).getTime();
    currentSession.totalTime = calculateTotalTime(totalMilliseconds);
    currentSession.logoutClockOut = true;
    currentSession.comment = 'Clocked out due to logout';
    sessions.unshift({ ...currentSession });

    try {
      currentSession = {};
      await saveUserData();
    } catch (err) {
      console.error('Error saving session on logout:', err);
    }
  }

  domElements.clockInBtn.disabled = false;
  domElements.clockOutBtn.disabled = true;
  domElements.currentTopic.textContent = '';
  domElements.timer.textContent = '00:00:00';

  currentSession = {};
  sessions = [];
  todos = [];
  stopTimer();
  domElements.mainContent.style.display = 'none';
  domElements.passwordPrompt.style.display = 'block';
  document.getElementById('weeklyStats').style.display = 'none';
  document.getElementById('analytics').style.display = 'none';
  document.getElementById('productivityDashboard').style.display = 'none';
  document.getElementById('stickyNotes').classList.add('d-none');
  document.getElementById('logoutBtn').classList.add('d-none');
  domElements.passwordInput.value = '';
  domElements.topicInput.value = '';
  domElements.todoList.classList.add('d-none');

  sessionStorage.clear();
  userId = null;
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString();
}

function formatDate(date) {
  return new Date(date).toLocaleDateString();
}

function formatDateForDisplay(date) {
  const options = { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' };
  return new Date(date).toLocaleDateString('en-GB', options);
}

function calculateTotalTime(milliseconds) {
  const duration = milliseconds / 1000;
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = Math.floor(duration % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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

async function loadUserData() {
  if (!userId) {
    console.error('No user ID available');
    return;
  }

  const params = {
    TableName: 'LearningTracker',
    Key: { userId },
  };

  try {
    const data = await docClient.get(params).promise();
    if (data.Item) {
      sessions = data.Item.sessions || [];
      todos = data.Item.todos || [];
      stickyNote = data.Item.stickyNote || '';
      currentSession = data.Item.currentSession || {};
      weeklyGoals = data.Item.weeklyGoals || [];
      weeklyTarget = data.Item.weeklyTarget || 56;

      if (currentSession.started) {
        domElements.clockInBtn.disabled = true;
        domElements.clockOutBtn.disabled = false;
        domElements.currentTopic.textContent = currentSession.topic;
        startTimer(currentSession.started);
      }

      loadSessions(sessions);
      domElements.passwordPrompt.style.display = 'none';
      domElements.mainContent.style.display = 'block';
      domElements.todoList.classList.remove('d-none');
      document.getElementById('weeklyStats').style.display = 'block';
      document.getElementById('analytics').style.display = 'block';
      document.getElementById('productivityDashboard').style.display = 'block';

      import('./todoList.js')
        .then((module) => {
          todoManager = module.initializeTodoList(
            {
              todoItems: domElements.todoItems,
              newTodoInput: domElements.newTodoInput,
            },
            todos,
            async (updatedTodos) => {
              todos = updatedTodos;
              await saveUserData();
            }
          );
          todoManager.loadTodos(todos);
        })
        .catch((err) => {
          console.error('Error loading todo list module:', err);
        });

      import('./quickNote.js')
        .then((module) => {
          module.loadStickyNote('stickyNote', stickyNote, async (newNote) => {
            stickyNote = newNote;
            await saveUserData();
          });
        })
        .catch((err) => {
          console.error('Error loading quick note module:', err);
        });
      document.getElementById('stickyNotes').classList.remove('d-none');
      sessionStorage.setItem('loggedIn', 'true');
      sessionStorage.setItem('userId', userId);
      addProductivityDashboard();
      renderWeeklyGoals();
      updateAnalytics();
    }
  } catch (err) {
    console.error('Error loading data:', err);
  }
}

async function saveUserData() {
  const params = {
    TableName: 'LearningTracker',
    Key: { userId },
    UpdateExpression:
      'SET sessions = :sessions, todos = :todos, currentSession = :currentSession, weeklyGoals = :weeklyGoals, stickyNote = :stickyNote',
    ExpressionAttributeValues: {
      ':sessions': sessions,
      ':todos': todos,
      ':currentSession': currentSession,
      ':weeklyGoals': weeklyGoals,
      ':stickyNote': stickyNote,
    },
  };

  try {
    await docClient.update(params).promise();
  } catch (err) {
    console.error('Error saving data:', err);
    alert('Error saving data. Check console.');
  }
}

function startTimer(startedTime) {
  let elapsed = 0;
  interval = setInterval(() => {
    elapsed = Math.floor((Date.now() - startedTime) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    domElements.timer.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    if (hours >= 6) {
      autoClockOut();
    }
    renderWeeklyGoals();
  }, 1000);
}

async function autoClockOut() {
  stopTimer();

  const endTime = new Date(currentSession.started).getTime() + 6 * 60 * 60 * 1000;
  currentSession.ended = endTime;
  currentSession.breakTime = 0;
  const totalMilliseconds = currentSession.ended - new Date(currentSession.started).getTime();
  currentSession.totalTime = calculateTotalTime(totalMilliseconds);
  currentSession.autoClockOut = true;
  currentSession.comment = 'Auto clocked out after 6 hours of inactivity';

  sessions.unshift({ ...currentSession });

  try {
    currentSession = {};
    await saveUserData();
    domElements.clockInBtn.disabled = false;
    domElements.clockOutBtn.disabled = true;
    domElements.currentTopic.textContent = '';
    domElements.timer.textContent = '00:00:00';

    loadSessions(sessions);
    updateAnalytics();
    alert('Session was automatically clocked out after 6 hours. Please review and edit if needed.');
  } catch (err) {
    console.error('Error in auto clock-out:', err);
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
    return alert('Please enter a topic!');
  }

  if (specialCharPattern.test(topic)) {
    return alert('Topic contains special characters. Please use only letters and numbers.');
  }

  if (topic.length > 50) {
    return alert('Topic is too long. Please use a topic with less than 50 characters.');
  }

  currentSession = {
    topic,
    started: Date.now(),
    date: new Date().toLocaleDateString(),
  };

  await saveUserData();

  domElements.clockInBtn.disabled = true;
  domElements.clockOutBtn.disabled = false;
  domElements.currentTopic.textContent = topic + ': ';
  domElements.topicInput.value = '';
  startTimer(currentSession.started);
  renderWeeklyGoals();
}

async function handleClockOut() {
  if (!currentSession.started) return;

  currentSession.ended = Date.now();

  const totalSessionMinutes =
    (currentSession.ended - new Date(currentSession.started).getTime()) / (1000 * 60);

  let breakMinutes;
  let isValidBreakTime = false;

  while (!isValidBreakTime) {
    breakMinutes = prompt('Enter break time in minutes (if any):', '0');

    if (breakMinutes === null) {
      return;
    }

    breakMinutes = parseInt(breakMinutes);

    if (isNaN(breakMinutes) || breakMinutes < 0) {
      alert('Please enter a valid number of minutes (0 or positive number)');
    } else if (breakMinutes > totalSessionMinutes) {
      alert(
        'Error: Break time cannot be longer than the total session time!\n' +
          `Session duration: ${Math.floor(totalSessionMinutes)} minutes\n` +
          `Entered break time: ${breakMinutes} minutes`
      );
    } else {
      isValidBreakTime = true;
    }
  }

  currentSession.breakTime = breakMinutes;

  const totalMilliseconds = currentSession.ended - new Date(currentSession.started).getTime();
  const breakMilliseconds = currentSession.breakTime * 60 * 1000;
  const netMilliseconds = totalMilliseconds - breakMilliseconds;

  currentSession.totalTime = calculateTotalTime(netMilliseconds);
  currentSession.comment = '';

  domElements.clockInBtn.disabled = false;
  domElements.clockOutBtn.disabled = true;
  stopTimer();

  sessions.unshift(currentSession);
  try {
    currentSession = {};
    await saveUserData();
    loadSessions(sessions);
    addProductivityDashboard();
    renderWeeklyGoals();
    updateAnalytics();
    domElements.currentTopic.textContent = '';
    domElements.timer.textContent = '00:00:00';
  } catch (err) {
    console.error('Error saving session:', err);
    alert('Error saving session. Check console.');
  }
}

function loadSessions(sessions) {
  const sessionsContainer = document.getElementById('sessionsContainer');
  sessionsContainer.innerHTML = '';

  const today = new Date().toLocaleDateString();

  const sessionsByMonth = sessions.reduce((acc, session) => {
    const date = new Date(session.date);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    const dateKey = formatDateForDisplay(session.date);

    if (!acc[monthKey]) {
      acc[monthKey] = {
        monthName: date.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
        dates: {},
      };
    }
    if (!acc[monthKey].dates[dateKey]) {
      acc[monthKey].dates[dateKey] = [];
    }
    acc[monthKey].dates[dateKey].push(session);
    return acc;
  }, {});

  const sortedMonths = Object.keys(sessionsByMonth).sort((a, b) => b.localeCompare(a));

  sortedMonths.forEach((monthKey) => {
    const monthData = sessionsByMonth[monthKey];
    const monthSection = document.createElement('div');
    const isCurrentMonth =
      new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }) ===
      monthData.monthName;

    monthSection.innerHTML = `
            <button class="collapsible month-collapsible ${isCurrentMonth ? 'active' : ''}">
                ${monthData.monthName}
                <span class="icon">></span>
            </button>
            <div class="collapsible-content" style="${isCurrentMonth ? 'display:block;' : 'display:none;'}">
                ${Object.entries(monthData.dates)
                  .sort((a, b) => new Date(b[0]) - new Date(a[0]))
                  .map(([date, dateSessions]) => {
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
                                        <th class="breakTime">Break</th>
                                        <th class="totalTime">Total Time</th>
                                        <th class="comment">Comment</th>
                                        <th class="actions">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${dateSessions
                                      .map(
                                        (session) => `
                                        <tr data-session-index="${sessions.indexOf(session)}" 
                                            class="${session.autoClockOut ? 'auto-clockout-row' : ''} ${session.logoutClockOut ? 'logout-clockout-row' : ''}">
                                            <td class="topic-cell">
                                                ${session.topic}
                                            </td>
                                            <td>${formatTime(session.started)}</td>
                                            <td>${formatTime(session.ended)}</td>
                                            <td>${session.breakTime || 0}</td>
                                            <td>${session.totalTime}</td>
                                            <td class="comment-cell">
                                                ${session.comment || ''}
                                            </td>
                                            <td class="actions">
                                                <div class="btn-group-vertical">
                                                    <button class="edit-session-btn btn btn-outline-primary" 
                                                        onclick="editSession(${sessions.indexOf(session)})" 
                                                        title="Edit">
                                                        <i class="bi bi-pencil"></i>
                                                    </button>
                                                    <button class="delete-btn btn btn-outline-danger" 
                                                        data-session-index="${sessions.indexOf(session)}" 
                                                        title="Delete">
                                                        <i class="bi bi-trash"></i>
                                                    </button>
                                                </div>
                                            </td>
                                            ${
                                              session.autoClockOut
                                                ? `<div class="alert alert-warning mt-1 mb-1" role="alert">
                                                    <i class="bi bi-exclamation-triangle"></i> Auto clocked out after 6 hours
                                                </div>`
                                                : ''
                                            }
                                            ${
                                              session.logoutClockOut
                                                ? `<div class="alert alert-warning mt-1 mb-1" role="alert">
                                                    <i class="bi bi-exclamation-triangle"></i> Clocked out due to logout
                                                </div>`
                                                : ''
                                            }
                                        </tr>
                                    `
                                      )
                                      .join('')}
                                </tbody>
                            </table>
                        </div>
                    `;
                  })
                  .join('')}
            </div>
        `;
    sessionsContainer.appendChild(monthSection);
  });

  document.querySelectorAll('.month-collapsible, .date-collapsible').forEach((button) => {
    button.addEventListener('click', function (e) {
      e.stopPropagation();
      this.classList.toggle('active');
      const content = this.nextElementSibling;
      content.style.display = content.style.display === 'block' ? 'none' : 'block';
    });
  });

  document.querySelectorAll('.edit-btn').forEach((btn) => {
    btn.addEventListener('click', handleEdit);
  });

  function handleEdit(e) {
    e.stopPropagation();
    const button = e.target.closest('.edit-btn');
    if (!button) return;

    const row = button.closest('tr');
    if (!row) return;

    const inputs = row.querySelectorAll('.edit-input');
    inputs.forEach((input) => {
      input.disabled = false;
      input.addEventListener('keypress', handleEnterKey);
    });

    const editBtn = row.querySelector('.edit-btn');
    const saveBtn = row.querySelector('.save-btn');
    const cancelBtn = row.querySelector('.cancel-btn');

    if (editBtn) editBtn.style.display = 'none';
    if (saveBtn) saveBtn.style.display = 'inline-block';
    if (cancelBtn) cancelBtn.style.display = 'inline-block';
    row.querySelector('.actions').classList.add('editing');
  }

  function handleEnterKey(e) {
    if (e.key === 'Enter') {
      const row = e.target.closest('tr');
      if (row) {
        const saveBtn = row.querySelector('.save-btn');
        if (saveBtn) saveBtn.click();
      }
    }
  }

  document.querySelectorAll('.save-btn').forEach((btn) => {
    btn.addEventListener('click', handleSave);
  });

  async function handleSave(e) {
    e.stopPropagation();
    const button = e.target.closest('.save-btn');
    if (!button) return;

    const row = button.closest('tr');
    if (!row) return;

    const sessionIndex = button.dataset.sessionIndex;
    if (!sessionIndex) return;

    const updatedTopic = row.cells[0].querySelector('.edit-input').value.trim();
    const updatedStarted = row.cells[1].querySelector('.edit-input').value.trim();
    const updatedEnded = row.cells[2].querySelector('.edit-input').value.trim();
    const updatedBreakTime = parseInt(row.cells[3].querySelector('.edit-input').value) || 0;
    const updatedComment = row.cells[5].querySelector('.comment-input').value.trim();

    if (!updatedTopic || !updatedStarted || !updatedEnded) {
      alert('All fields (Topic, Started, Ended) must be filled!');
      return;
    }

    try {
      const startedTime = new Date(
        `${formatDate(sessions[sessionIndex].date)} ${updatedStarted}`
      ).getTime();
      let endedTime = new Date(
        `${formatDate(sessions[sessionIndex].date)} ${updatedEnded}`
      ).getTime();
      if (endedTime <= startedTime) {
        const confirmNextDay = confirm(
          'The entered end time is before the start time. Do you want to consider it as the next day?'
        );
        if (!confirmNextDay) {
          return;
        }
        endedTime += 24 * 60 * 60 * 1000;
      }

      const totalSessionMinutes = (endedTime - startedTime) / (1000 * 60);

      if (updatedBreakTime < 0) {
        alert('Break time cannot be negative');
        return;
      }

      if (updatedBreakTime > totalSessionMinutes) {
        alert(
          'Error: Break time cannot be longer than the total session time!\n' +
            `Session duration: ${Math.floor(totalSessionMinutes)} minutes\n` +
            `Entered break time: ${updatedBreakTime} minutes`
        );
        return;
      }

      const totalMilliseconds = endedTime - startedTime;
      const breakMilliseconds = updatedBreakTime * 60 * 1000;
      const netMilliseconds = totalMilliseconds - breakMilliseconds;

      const newTotalTime = calculateTotalTime(netMilliseconds);

      sessions[sessionIndex] = {
        ...sessions[sessionIndex],
        topic: updatedTopic,
        started: startedTime,
        ended: endedTime,
        breakTime: updatedBreakTime,
        totalTime: newTotalTime,
        comment: updatedComment,
      };

      delete sessions[sessionIndex].autoClockOut;
      delete sessions[sessionIndex].logoutClockOut;

      await saveUserData();
      const openSections = getOpenSections();
      loadSessions(sessions);
      setOpenSections(openSections);
      renderWeeklyGoals();
    } catch (err) {
      console.error('Error updating session:', err);
      alert('Error updating session. Check console.');
    }
  }

  document.querySelectorAll('.cancel-btn').forEach((btn) => {
    btn.addEventListener('click', handleCancel);
  });

  function handleCancel(e) {
    e.stopPropagation();
    const openSections = getOpenSections();
    loadSessions(sessions);
    setOpenSections(openSections);
    renderWeeklyGoals();
  }

  document.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const button = e.target.closest('.delete-btn');
      if (!button) return;

      const index = button.dataset.sessionIndex;
      if (typeof index === 'undefined') return;

      const session = sessions[index];
      if (!session) return;

      const confirmDelete = confirm(`Are you sure you want to delete "${session.topic}"?`);
      if (!confirmDelete) return;

      sessions.splice(index, 1);

      try {
        await saveUserData();

        const openSections = getOpenSections();

        loadSessions(sessions);

        setOpenSections(openSections);

        renderWeeklyGoals();
        updateAnalytics();
      } catch (err) {
        console.error('Error deleting session:', err);
        alert('Failed to delete session. Please try again.');
        sessions.splice(index, 0, session);
      }
    });
  });

  updateAnalytics();
}

function getOpenSections() {
  const openSections = [];
  document.querySelectorAll('.collapsible').forEach((button, index) => {
    if (button.classList.contains('active')) {
      openSections.push(index);
    }
  });
  return openSections;
}

function setOpenSections(openSections) {
  document.querySelectorAll('.collapsible').forEach((button, index) => {
    if (openSections.includes(index)) {
      button.classList.add('active');
      button.nextElementSibling.style.display = 'block';
    }
  });
}

async function loadWeeklyGoals() {
  if (!userId) return;

  try {
    const data = await docClient
      .get({
        TableName: 'LearningTracker',
        Key: { userId },
      })
      .promise();

    if (data.Item && data.Item.weeklyGoals) {
      weeklyGoals = data.Item.weeklyGoals;
      renderWeeklyGoals();
    }
  } catch (err) {
    console.error('Error loading weekly goals:', err);
  }
}

import * as weeklyGoalsModule from './weeklyGoals.js';

function renderWeeklyGoals() {
    const goalsContainer = document.getElementById('goalsContainer');
    weeklyGoalsModule.renderWeeklyGoals(
        goalsContainer,
        weeklyGoals,
        sessions,
        currentSession,
        getWeekDateRange
    );
}

async function addWeeklyGoal() {
    const categoryInput = document.getElementById('goalCategory');
    const hoursInput = document.getElementById('goalHours');

    const category = categoryInput.value.trim();
    const hours = parseFloat(hoursInput.value);

    try {
        const success = await weeklyGoalsModule.addWeeklyGoal(
            category, 
            hours, 
            weeklyGoals, // Pass the weeklyGoals array
            saveUserData
        );
        if (success) {
            categoryInput.value = '';
            hoursInput.value = '';
            renderWeeklyGoals();
            updateAnalytics();
        }
    } catch (err) {
        console.error('Error saving weekly goal:', err);
        alert(err.message || 'Failed to save goal. Please try again.');
    }
}

window.deleteGoal = async function (index) {
  weeklyGoals.splice(index, 1);

  try {
    await saveUserData();

    renderWeeklyGoals();
  } catch (err) {
    console.error('Error deleting weekly goal:', err);
  }
};

window.editGoal = async function (index) {
  const goal = weeklyGoals[index];
  document.getElementById('editGoalCategory').value = goal.category;
  document.getElementById('editGoalHours').value = goal.hours;

  const date = new Date(goal.weekStart);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  document.getElementById('editGoalWeekStart').value = localDate.toISOString().split('T')[0];

  document.getElementById('editGoalModal').setAttribute('data-goal-index', index);
  $('#editGoalModal').modal('show');
};

async function saveEditedGoal() {
  const index = parseInt(document.getElementById('editGoalModal').getAttribute('data-goal-index'));
  const category = document.getElementById('editGoalCategory').value.trim();
  const hours = parseFloat(document.getElementById('editGoalHours').value);

  const selectedDate = document.getElementById('editGoalWeekStart').value;
  const weekStart = new Date(selectedDate);
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
    weekNumber: weeklyGoalsModule.getWeekNumber(weekStart),
  };

  try {
    await saveUserData();
    $('#editGoalModal').modal('hide');
    renderWeeklyGoals();
    updateAnalytics();
  } catch (err) {
    console.error('Error updating goal:', err);
    alert('Failed to update goal. Please try again.');
  }
}

function updateAnalytics() {
  import('./weeklySummary.js')
    .then((module) => {
      const chartElement = document.getElementById('categoryChart');
      module.updateCategoryChart(chartElement, sessions, getWeekDateRange);
    })
    .catch((err) => {
      console.error('Error loading weekly summary module:', err);
    });

  import('./dailySummary.js')
    .then((module) => {
      const chartElement = document.getElementById('dailyStudyChart');
      module.updateDailyStudyChart(chartElement, sessions, formatDate);
    })
    .catch((err) => {
      console.error('Error loading daily summary module:', err);
    });
  renderWeeklyGoals();
}

function addProductivityDashboard() {
  import('./productivityMetrics.js')
    .then((module) => {
      const dashboard = document.getElementById('productivityDashboard');
      const scores = module.calculateProductivityScore(sessions, weeklyTarget, getWeekDateRange);
      module.renderProductivityDashboard(dashboard, scores, weeklyTarget);
    })
    .catch((err) => {
      console.error('Error loading productivity metrics module:', err);
    });
}

async function saveWeeklyTarget(target) {
  try {
    await docClient
      .update({
        TableName: 'LearningTracker',
        Key: { userId },
        UpdateExpression: 'SET weeklyTarget = :target',
        ExpressionAttributeValues: {
          ':target': target,
        },
      })
      .promise();
    weeklyTarget = target;
    addProductivityDashboard();
  } catch (err) {
    console.error('Error saving weekly target:', err);
    alert('Failed to save weekly target');
  }
}

function initializeEventListeners() {
  domElements.submitPassword.addEventListener('click', handleLogin);

  domElements.userIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      domElements.passwordInput.focus();
    }
  });

  domElements.passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      domElements.submitPassword.click();
    }
  });

  domElements.topicInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      domElements.clockInBtn.click();
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    handleLogout().catch((err) => {
      console.error('Error during logout:', err);
    });
  });

  domElements.clockInBtn.addEventListener('click', handleClockIn);
  domElements.clockOutBtn.addEventListener('click', handleClockOut);

  document.getElementById('exportDataBtn').addEventListener('click', () => {
    import('./exportData.js')
      .then((module) => {
        module.exportToCSV(sessions);
      })
      .catch((err) => {
        console.error('Error loading export module:', err);
        alert('Failed to export data. Please try again.');
      });
  });

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

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
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

  document.getElementById('saveEditedSessionBtn').addEventListener('click', saveEditedSession);

  const editSessionFields = [
    'editSessionTopic',
    'editSessionStarted',
    'editSessionEnded',
    'editSessionBreak',
    'editSessionComment',
  ];

  editSessionFields.forEach((fieldId) => {
    document.getElementById(fieldId).addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        await saveEditedSession();
      }
    });
  });

  import('./todoEvents.js')
    .then((module) => {
      module.initializeTodoEvents(domElements, todoManager);
    })
    .catch((err) => {
      console.error('Error loading todo events module:', err);
    });
}

window.onload = async () => {
  domElements.passwordInput.focus();
  if (sessionStorage.getItem('loggedIn') === 'true') {
    userId = sessionStorage.getItem('userId');
    if (userId) {
      document.getElementById('logoutBtn').classList.remove('d-none');
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

google.charts.load('current', { packages: ['corechart'] });
google.charts.setOnLoadCallback(updateAnalytics);

window.editSession = function (index) {
  const session = sessions[index];
  document.getElementById('editSessionTopic').value = session.topic;
  document.getElementById('editSessionStarted').value = new Date(session.started)
    .toTimeString()
    .slice(0, 5);
  document.getElementById('editSessionEnded').value = new Date(session.ended)
    .toTimeString()
    .slice(0, 5);
  document.getElementById('editSessionBreak').value = session.breakTime || 0;
  document.getElementById('editSessionComment').value = session.comment || '';

  document.getElementById('editSessionModal').setAttribute('data-session-index', index);
  $('#editSessionModal').modal('show');
};

async function saveEditedSession() {
  const index = parseInt(
    document.getElementById('editSessionModal').getAttribute('data-session-index')
  );
  const session = sessions[index];
  const sessionDate = new Date(session.started).toLocaleDateString();

  const topic = document.getElementById('editSessionTopic').value.trim();
  const startTime = document.getElementById('editSessionStarted').value;
  const endTime = document.getElementById('editSessionEnded').value;
  const breakTime = parseInt(document.getElementById('editSessionBreak').value) || 0;
  const comment = document.getElementById('editSessionComment').value.trim();

  if (!topic || !startTime || !endTime) {
    alert('Please fill all required fields');
    return;
  }

  const startDate = new Date(`${sessionDate} ${startTime}`);
  const endDate = new Date(`${sessionDate} ${endTime}`);

  if (endDate < startDate) {
    endDate.setDate(endDate.getDate() + 1);
  }

  const totalSessionMinutes = (endDate - startDate) / (1000 * 60);

  if (breakTime < 0) {
    alert('Break time cannot be negative');
    return;
  }

  if (breakTime > totalSessionMinutes) {
    alert(
      'Error: Break time cannot be longer than the total session time!\n' +
        `Session duration: ${Math.floor(totalSessionMinutes)} minutes\n` +
        `Entered break time: ${breakTime} minutes`
    );
    return;
  }

  const totalMilliseconds = endDate - startDate;
  const breakMilliseconds = breakTime * 60 * 1000;
  const netMilliseconds = totalMilliseconds - breakMilliseconds;

  sessions[index] = {
    ...session,
    topic,
    started: startDate.getTime(),
    ended: endDate.getTime(),
    breakTime,
    totalTime: calculateTotalTime(netMilliseconds),
    comment,
  };

  delete sessions[index].autoClockOut;
  delete sessions[index].logoutClockOut;

  try {
    await saveUserData();
    $('#editSessionModal').modal('hide');
    const openSections = getOpenSections();
    loadSessions(sessions);
    setOpenSections(openSections);
    updateAnalytics();
  } catch (err) {
    console.error('Error updating session:', err);
    alert('Failed to update session. Please try again.');
  }
}
