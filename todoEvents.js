export function initializeTodoEvents(domElements, todoManager) {
    // Todo input event listeners
    domElements.newTodoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            todoManager.addTodo(domElements.newTodoInput.value);
        }
    });

    domElements.addTodoBtn.addEventListener('click', () => {
        todoManager.addTodo(domElements.newTodoInput.value);
    });

    // Keyboard navigation for todos
    document.addEventListener('keydown', (e) => {
        if (document.activeElement.tagName === 'INPUT') return;

        if ((e.key === 'Delete' || e.key === 'Backspace') && 
            document.activeElement.tagName !== 'INPUT') {
            const selectedTodo = document.querySelector('#todoItems li.selected');
            if (selectedTodo) {
                const index = selectedTodo.getAttribute('data-id');
                todoManager.deleteTodo(index);
            }
        }

        const selectedTodo = document.querySelector('#todoItems li.selected');
        if (!selectedTodo) return;

        const allTodos = Array.from(document.querySelectorAll('#todoItems li'));
        const currentIndex = allTodos.indexOf(selectedTodo);

        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                if (currentIndex > 0) {
                    selectedTodo.classList.remove('selected');
                    allTodos[currentIndex - 1].classList.add('selected');
                    allTodos[currentIndex - 1].scrollIntoView({ block: 'nearest' });
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (currentIndex < allTodos.length - 1) {
                    selectedTodo.classList.remove('selected');
                    allTodos[currentIndex + 1].classList.add('selected');
                    allTodos[currentIndex + 1].scrollIntoView({ block: 'nearest' });
                }
                break;
        }
    });

    // Click outside todo list handler
    document.addEventListener('click', (e) => {
        const todoList = domElements.todoList;
        const selectedTodo = document.querySelector('#todoItems li.selected');

        if (selectedTodo && !todoList.contains(e.target)) {
            selectedTodo.classList.remove('selected');
        }
    });
}
