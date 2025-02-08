export function initializeQuickNote(noteElement, initialNote, onNoteChange) {
    noteElement.textContent = initialNote;
    
    // Debounce function for saving notes
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Debounced save handler - only save after 3 seconds of no typing
    const debouncedSave = debounce(onNoteChange, 3000);

    // Add input event listener
    noteElement.addEventListener('input', () => {
        debouncedSave(noteElement.textContent);
    });
}

export function loadStickyNote(containerId, initialNote, onNoteChange) {
    const noteElement = document.querySelector(`#${containerId} .note-text`);
    if (!noteElement) {
        console.error('Note element not found');
        return;
    }
    
    initializeQuickNote(noteElement, initialNote, onNoteChange);
}
