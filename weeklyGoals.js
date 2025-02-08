export function isGoalActive(category, currentSession) {
    if (!currentSession.started) return false;
    const categoryUpper = category.toUpperCase();
    return currentSession.topic.toUpperCase().includes(categoryUpper);
}

export function getWeekNumber(date) {
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7));
    const weekStart = new Date(target.getFullYear(), 0, 4);
    return 1 + Math.round(((target - weekStart) / 86400000 - 3 + ((weekStart.getDay() + 6) % 7)) / 7);
}

export function isCurrentWeek(date, getWeekDateRange) {
    const { start, end } = getWeekDateRange();
    return date >= start && date <= end;
}

export function getBacklogGoals(goals, getWeekDateRange) {
    if (!goals || !goals.length) return [];
    const currentWeekStart = getWeekDateRange().start;
    return goals
        .filter((goal) => {
            if (!goal.weekStart) return false;
            const goalWeekStart = new Date(goal.weekStart);
            return goalWeekStart < currentWeekStart;
        })
        .sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart));
}

export function calculateGoalProgress(category, weekStart, sessions, currentSession, getWeekDateRange) {
    let start, end;
    const now = new Date();

    if (weekStart) {
        start = new Date(weekStart);
        if (start < getWeekDateRange().start) {
            end = now;
        } else {
            end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
        }
    } else {
        const weekRange = getWeekDateRange();
        start = weekRange.start;
        end = weekRange.end;
    }

    let totalHours = 0;
    const categoryUpper = category.toUpperCase();

    sessions.forEach((session) => {
        const sessionDate = new Date(session.started);
        if (sessionDate >= start && sessionDate <= end) {
            if (session.topic.toUpperCase().includes(categoryUpper)) {
                const sessionDuration = (new Date(session.ended) - new Date(session.started)) / (1000 * 60 * 60);
                const breakHours = (session.breakTime || 0) / 60;
                totalHours += sessionDuration - breakHours;
            }
        }
    });

    if (currentSession.started && currentSession.topic.toUpperCase().includes(categoryUpper)) {
        const activeSessionHours = (Date.now() - new Date(currentSession.started).getTime()) / (1000 * 60 * 60);
        totalHours += activeSessionHours;
    }

    return totalHours;
}

export function renderWeeklyGoals(container, goals, sessions, currentSession, getWeekDateRange) {
    if (!container) return;

    const { start, end } = getWeekDateRange();
    const dateRange = `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;

    const allGoals = [...goals];
    const activeGoal = allGoals.find((goal) => isGoalActive(goal.category, currentSession));
    const currentWeekGoals = allGoals.filter((goal) => {
        if (!goal.weekStart || isCurrentWeek(new Date(goal.weekStart), getWeekDateRange)) {
            return !isGoalCompleted(goal, sessions, currentSession, getWeekDateRange) || goal === activeGoal;
        }
        return false;
    });

    const backlogGoals = getBacklogGoals(goals, getWeekDateRange).filter((goal) => {
        return !isGoalCompleted(goal, sessions, currentSession, getWeekDateRange) || goal === activeGoal;
    });
    const completedGoals = allGoals.filter((goal) => 
        isGoalCompleted(goal, sessions, currentSession, getWeekDateRange) && goal !== activeGoal
    );

    container.innerHTML = `
        <div class="text-muted small mb-2">Week: ${dateRange}</div>
        <div id="currentSessionGoal" style="display: ${activeGoal ? 'block' : 'none'}"></div>
        <div id="currentWeekGoals"></div>
        ${backlogGoals.length ? '<div id="backlogGoals" class="mt-3"><h5 class="text-danger">Backlog</h5></div>' : ''}
        ${completedGoals.length ? '<div id="completedGoals" class="mt-3"><h5 class="text-success">Completed Goals</h5></div>' : ''}
    `;

    renderGoalsList(activeGoal ? [activeGoal] : [], document.getElementById('currentSessionGoal'), true, goals, sessions, currentSession, getWeekDateRange);
    renderGoalsList(currentWeekGoals.filter(g => g !== activeGoal), document.getElementById('currentWeekGoals'), false, goals, sessions, currentSession, getWeekDateRange);
    if (backlogGoals.length) {
        renderGoalsList(backlogGoals.filter(g => g !== activeGoal), document.getElementById('backlogGoals'), false, goals, sessions, currentSession, getWeekDateRange);
    }
    if (completedGoals.length) {
        renderGoalsList(completedGoals, document.getElementById('completedGoals'), false, goals, sessions, currentSession, getWeekDateRange);
    }
}

function isGoalCompleted(goal, sessions, currentSession, getWeekDateRange) {
    const progress = calculateGoalProgress(goal.category, goal.weekStart, sessions, currentSession, getWeekDateRange);
    return progress >= goal.hours;
}

function renderGoalsList(goals, container, isCurrentSession, allGoals, sessions, currentSession, getWeekDateRange) {
    if (!container) return;

    goals.sort((a, b) => {
        const aIsActive = isGoalActive(a.category, currentSession);
        const bIsActive = isGoalActive(b.category, currentSession);
        if (aIsActive && !bIsActive) return -1;
        if (!aIsActive && bIsActive) return 1;

        const weekDiff = new Date(b.weekStart) - new Date(a.weekStart);
        if (weekDiff !== 0) return weekDiff;

        const progressA = (calculateGoalProgress(a.category, a.weekStart, sessions, currentSession, getWeekDateRange) / a.hours) * 100;
        const progressB = (calculateGoalProgress(b.category, b.weekStart, sessions, currentSession, getWeekDateRange) / b.hours) * 100;
        return progressB - progressA;
    });

    goals.forEach((goal) => {
        const progress = calculateGoalProgress(goal.category, goal.weekStart, sessions, currentSession, getWeekDateRange);
        const percentage = Math.min((progress / goal.hours) * 100, 100);
        const isActive = isGoalActive(goal.category, currentSession);
        const goalIndex = allGoals.findIndex(g => g.category === goal.category && g.weekStart === goal.weekStart);
        
        renderGoalItem(container, goal, progress, percentage, isActive, goalIndex);
    });
}

function renderGoalItem(container, goal, progress, percentage, isActive, goalIndex) {
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
            <button class="btn btn-sm btn-outline-secondary edit-goal-btn" onclick="window.editGoal(${goalIndex})">
                <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-danger btn-sm" onclick="window.deleteGoal(${goalIndex})">-</button>
        </div>
    `;
    container.appendChild(goalElement);
}

export async function addWeeklyGoal(category, hours, goals, saveCallback) {
    if (!category) {
        throw new Error('Please enter a category name');
    }

    if (isNaN(hours) || hours <= 0) {
        throw new Error('Please enter a valid number of hours (greater than 0)');
    }

    const now = new Date();
    const monday = new Date(now);
    const currentDay = monday.getDay();
    const diff = currentDay === 0 ? -6 : 1 - currentDay;
    monday.setDate(monday.getDate() + diff);
    monday.setHours(0, 0, 0, 0);

    const newGoal = {
        category,
        hours,
        weekStart: monday.toISOString(),
        weekNumber: getWeekNumber(monday),
    };

    const existingGoal = goals.find((g) => {
        const goalWeekStart = new Date(g.weekStart);
        return (
            g.category.toUpperCase() === category.toUpperCase() &&
            goalWeekStart.getTime() === monday.getTime()
        );
    });

    if (existingGoal) {
        const update = confirm(
            `A goal for ${existingGoal.category} already exists for this week. Do you want to update it?`
        );
        if (update) {
            existingGoal.hours = hours;
        } else {
            return false;
        }
    } else {
        goals.push(newGoal);
    }

    try {
        await saveCallback();
        return true;
    } catch (err) {
        if (!existingGoal) {
            goals.pop();
        }
        throw err;
    }
}
