export function calculateWeeklyGroupTimes(sessions, getWeekDateRange) {
    const { start, end } = getWeekDateRange();
    const groupTimes = {};

    // Filter sessions within the current week
    const weekSessions = sessions.filter((session) => {
        const sessionDate = new Date(session.started);
        return sessionDate >= start && sessionDate <= end;
    });

    weekSessions.forEach((session) => {
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

export function updateCategoryChart(chartElement, sessions, getWeekDateRange) {
    const groupTimes = calculateWeeklyGroupTimes(sessions, getWeekDateRange);

    const data = new google.visualization.DataTable();
    data.addColumn('string', 'Category');
    data.addColumn('number', 'Hours');

    Object.entries(groupTimes).forEach(([category, hours]) => {
        data.addRow([`${category}`, hours]);
    });

    const options = {
        pieHole: 0.8,
        height: '100%',
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
        pieSliceText: 'label',
        pieSliceTextStyle: {
            color: 'black',
            fontSize: 10,
            bold: true,
        },
        tooltip: {
            trigger: 'selection',
        },
    };

    const chart = new google.visualization.PieChart(chartElement);
    chart.draw(data, options);
}
