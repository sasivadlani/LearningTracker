export function calculateProductivityScore(sessions, weeklyTarget, getWeekDateRange) {
    const { start, end } = getWeekDateRange();
    let totalMinutes = 0;
    const uniqueDays = new Set();
    let longSessions = 0;
    let totalSessions = 0;

    const weekSessions = sessions.filter((session) => {
        const sessionDate = new Date(session.started);
        return sessionDate >= start && sessionDate <= end;
    });

    weekSessions.forEach((session) => {
        const sessionDate = new Date(session.started).toLocaleDateString();
        uniqueDays.add(sessionDate);

        const duration = (new Date(session.ended) - new Date(session.started)) / (1000 * 60); // minutes
        totalMinutes += duration;
        totalSessions++;

        if (duration >= 45) {
            longSessions++;
        }
    });

    return {
        productivity: ((totalMinutes / (((7 * weeklyTarget) / 7) * 60)) * 100).toFixed(1),
        consistency: ((uniqueDays.size / 7) * 100).toFixed(1),
        focus: totalSessions > 0 ? ((longSessions / totalSessions) * 100).toFixed(1) : '0.0',
    };
}

export function renderProductivityDashboard(dashboard, scores, weeklyTarget, onTargetClick) {
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
    const header = dashboard.querySelector('#productivityHeader');
    const metrics = dashboard.querySelector('#productivityMetrics');
    const toggleIcon = header.querySelector('.toggle-icon');

    header.addEventListener('click', () => {
        const isVisible = metrics.style.display === 'block';
        metrics.style.display = isVisible ? 'none' : 'block';
        toggleIcon.textContent = isVisible ? '▼' : '▲';
    });
}
