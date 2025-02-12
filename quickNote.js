export function initializeQuickNote(noteElement, initialNote, onNoteChange) {
    // Create initial bullet list if empty
    if (!initialNote) {
        noteElement.innerHTML = '<ul><li><br></li></ul>';
    } else {
        noteElement.innerHTML = initialNote;
        // If there's content but no list, wrap it in a list
        if (!noteElement.querySelector('ul')) {
            const content = noteElement.innerHTML;
            noteElement.innerHTML = `<ul><li>${content}</li></ul>`;
        }
    }

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

    const debouncedSave = debounce(onNoteChange, 3000);

    noteElement.addEventListener('keydown', (e) => {
        // New logic for removing bullet formatting on Backspace for an empty bullet
        if (e.key === 'Backspace') {
            const selection = window.getSelection();
            if (selection.rangeCount) {
                const range = selection.getRangeAt(0);
                const currentLine = range.commonAncestorContainer;
                const currentLi = currentLine.closest ? currentLine.closest('li') : null;
                if (currentLi && currentLi.textContent.trim() === '') {
                    e.preventDefault();
                    // Replace the empty li with a span to remove bullet formatting
                    const span = document.createElement('span');
                    span.innerHTML = currentLi.innerHTML; // Should be empty or a <br>
                    currentLi.parentNode.replaceChild(span, currentLi);
                    // Set caret inside the new span at the end
                    const newRange = document.createRange();
                    newRange.selectNodeContents(span);
                    newRange.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                    return; // exit event handler
                }
            }
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            const currentLine = range.commonAncestorContainer;
            const currentLi = currentLine.closest ? currentLine.closest('li') : null;
            
            if (currentLi) {
                // If current line is empty and it's not the last bullet point
                if (currentLi.textContent.trim() === '' && 
                    (!currentLi.nextElementSibling || currentLi.parentNode.children.length > 1)) {
                    e.preventDefault();
                    currentLi.remove();
                } else {
                    // Create new bullet at same level
                    const newLi = document.createElement('li');
                    newLi.innerHTML = '<br>';
                    currentLi.parentNode.insertBefore(newLi, currentLi.nextSibling);
                    selection.collapse(newLi, 0);
                }
            } else {
                // Ensure we're working with the main ul
                const mainUl = noteElement.querySelector('ul') || noteElement;
                const newLi = document.createElement('li');
                newLi.innerHTML = '<br>';
                mainUl.appendChild(newLi);
                selection.collapse(newLi, 0);
            }
        }
        
        // Support for basic formatting shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch(e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    document.execCommand('bold', false);
                    break;
                case 'i':
                    e.preventDefault();
                    document.execCommand('italic', false);
                    break;
                case 'u':
                    e.preventDefault();
                    document.execCommand('underline', false);
                    break;
            }
        }
    });

    // Prevent nested lists when pasting
    noteElement.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const replacedText = text.replace(urlRegex, url => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="quick-note-link">${url}</a>`);
        document.execCommand('insertHTML', false, replacedText);
    });
    
    // New listener to ensure clicked links open in a new tab
    noteElement.addEventListener('click', (e) => {
        const target = e.target;
        if(target.tagName.toLowerCase() === 'a') {
            e.preventDefault();
            window.open(target.href, '_blank');
        }
    });

    noteElement.addEventListener('input', () => {
        // Ensure there's always at least one bullet point
        if (!noteElement.querySelector('ul')) {
            noteElement.innerHTML = '<ul><li>' + noteElement.innerHTML + '</li></ul>';
        }
        debouncedSave(noteElement.innerHTML);
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
