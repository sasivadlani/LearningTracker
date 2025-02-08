export function initializeTodoList(containerElements, todos, onTodoUpdate) {
  const { todoItems, newTodoInput } = containerElements;

  function loadTodos(todoList) {
    todoItems.innerHTML = '';

    // Sort todos by status: intermediate -> unchecked -> checked
    todoList.sort((a, b) => {
      const statusOrder = { intermediate: 0, unchecked: 1, checked: 2 };
      return statusOrder[a.status || 'unchecked'] - statusOrder[b.status || 'unchecked'];
    });

    todoList.forEach((todo, todoIndex) => {
      const li = createTodoElement(todo, todoIndex);
      todoItems.appendChild(li);
    });

    // Initialize Sortable if not already initialized
    initializeSortable(todoItems, todoList, onTodoUpdate);
  }

  function createTodoElement(todo, todoIndex) {
    const li = document.createElement('li');
    li.setAttribute('data-id', todoIndex);
    const status = todo.status || 'unchecked';
    li.className = `list-group-item ${status}`;
    li.innerHTML = `
            <div class="form-check">
                <input type="checkbox" class="form-check-input" 
                    ${status === 'checked' ? 'checked' : ''} 
                    ${status === 'intermediate' ? "indeterminate='true'" : ''}>
                <span class="form-control-plaintext">${todo.text}</span>
            </div>
        `;

    const checkbox = li.querySelector('.form-check-input');
    const textSpan = li.querySelector('.form-control-plaintext');

    setupTodoEventListeners(li, checkbox, textSpan, todoIndex, todos, onTodoUpdate);

    if (status === 'intermediate') {
      checkbox.indeterminate = true;
    }

    return li;
  }

  function setupTodoEventListeners(li, checkbox, textSpan, todoIndex, todos, onTodoUpdate) {
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleTodoCheck(todoIndex, todos, onTodoUpdate);
    });

    [textSpan, li, li.querySelector('.form-check')].forEach((element) => {
      element.addEventListener('click', (e) => {
        if (e.target !== checkbox && e.target.type !== 'checkbox') {
          handleTodoSelection(li);
          e.stopPropagation();
        }
      });
    });
  }

  function handleTodoSelection(li) {
    if (li.classList.contains('selected')) {
      li.classList.remove('selected');
    } else {
      document.querySelectorAll('#todoItems li').forEach((item) => {
        item.classList.remove('selected');
      });
      li.classList.add('selected');
    }
  }

  function toggleTodoCheck(index, todos, onTodoUpdate) {
    const currentStatus = todos[index].status || 'unchecked';
    const todo = todos[index];

    switch (currentStatus) {
      case 'unchecked': {
        todo.status = 'intermediate';
        todos.splice(index, 1);
        todos.unshift(todo);
        break;
      }
      case 'intermediate': {
        todo.status = 'checked';
        todos.splice(index, 1);
        const firstCheckedIndex = todos.findIndex((t) => t.status === 'checked');
        if (firstCheckedIndex === -1) {
          todos.push(todo);
        } else {
          todos.splice(firstCheckedIndex, 0, todo);
        }
        break;
      }
      case 'checked': {
        todo.status = 'unchecked';
        todos.splice(index, 1);
        const afterIntermediate = todos.findIndex((t) => t.status !== 'intermediate');
        const insertIndex = afterIntermediate === -1 ? todos.length : afterIntermediate;
        todos.splice(insertIndex, 0, todo);
        break;
      }
    }

    onTodoUpdate(todos);
    loadTodos(todos);
  }

  function initializeSortable(container, todos, onTodoUpdate) {
    if (!container.sortable) {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      container.sortable = new Sortable(container, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        dragClass: 'sortable-drag',
        filter: '.form-check-input',
        delay: isTouchDevice ? 300 : 0,
        delayOnTouchOnly: true,
        onEnd: async function (evt) {
          const item = todos.splice(evt.oldIndex, 1)[0];
          todos.splice(evt.newIndex, 0, item);
          await onTodoUpdate(todos);
          loadTodos(todos);
        },
      });
    }
  }

  async function addTodo(text) {
    if (text.trim()) {
      todos.unshift({ text: text.trim(), status: 'unchecked' });
      await onTodoUpdate(todos);
      loadTodos(todos);
      newTodoInput.value = '';
    }
  }

  async function deleteTodo(index) {
    todos.splice(index, 1);
    await onTodoUpdate(todos);
    loadTodos(todos);
  }

  return {
    loadTodos,
    addTodo,
    deleteTodo,
  };
}
