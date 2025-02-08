export async function exportToCSV(sessions) {
    const confirmExport = confirm('Are you sure you want to export your session data to a CSV file?');
    if (!confirmExport) {
        return;
    }

    const csvRows = [];
    const headers = ['Topic', 'Started', 'Ended', 'Break', 'Total Time', 'Comment'];
    csvRows.push(headers.join(','));

    sessions.forEach((session) => {
        const values = [
            session.topic,
            new Date(session.started).toLocaleString(),
            new Date(session.ended).toLocaleString(),
            session.breakTime || 0,
            session.totalTime,
            session.comment || '',
        ];
        csvRows.push(values.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'sessions.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
