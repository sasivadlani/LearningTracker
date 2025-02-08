export function calculateDailyStudyTime(sessions, formatDate) {
    const dailyStudyTime = {};

    sessions.forEach((session) => {
        if (session.topic.toUpperCase().startsWith('LT:')) return;

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

export function updateDailyStudyChart(chartElement, sessions, formatDate) {
    const dailyStudyTime = calculateDailyStudyTime(sessions, formatDate);

    const data = new google.visualization.DataTable();
    data.addColumn('string', 'Date');

    // Get all unique groups
    const groups = new Set();
    Object.values(dailyStudyTime).forEach((groupsData) => {
        Object.keys(groupsData).forEach((group) => groups.add(group));
    });

    // Add columns for each group
    groups.forEach((group) => data.addColumn('number', group));
    data.addColumn({ type: 'number', role: 'annotation' }); // Add annotation column for total hours

    // Get the last 7 dates including today
    const today = new Date().toLocaleDateString();
    const sortedDates = Object.keys(dailyStudyTime).sort((a, b) => new Date(a) - new Date(b));
    const last7Dates = sortedDates.filter((date) => new Date(date) <= new Date(today)).slice(-7);

    // Add rows for each date
    last7Dates.forEach((date) => {
        const groupsData = dailyStudyTime[date] || {};
        const dateObj = new Date(date);
        const formattedDate = `${dateObj.toLocaleDateString('en-US', { weekday: 'short' })}, ${dateObj.toLocaleDateString('en-GB')}`;
        const row = [formattedDate];
        let totalHours = 0;
        groups.forEach((group) => {
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
            slantedTextAngle: 45,
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
                color: 'black',
            },
        },
    };

    const chart = new google.visualization.ColumnChart(chartElement);
    chart.draw(data, options);
}
