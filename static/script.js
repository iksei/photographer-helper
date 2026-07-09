const dofBtn = document.getElementById('dofBtn');
const dofAperture = document.getElementById('dofAperture');
const dofFocal = document.getElementById('dofFocal');
const dofDistance = document.getElementById('dofDistance');

dofBtn.addEventListener('click', async function(){
    const aperture = dofAperture.value;
    const focal = dofFocal.value;
    const distance = dofDistance.value;

    const response = await fetch(`/api/dof?aperture=${aperture}&focal=${focal}&distance=${distance}`);
    const data = await response.json();

    document.getElementById('dofValue').textContent = data.dof;
    document.getElementById('dofNear').textContent = data.near;
    document.getElementById('dofFar').textContent = data.far;
    document.getElementById('dofHyperfocal').textContent = data.hyperfocal;
    dofResult.classList.add('show');
});

const shutterBtn = document.getElementById('shutterBtn');
const shutterResult = document.getElementById('shutterResult');

shutterBtn.addEventListener('click', async function() {
    const iso = document.getElementById('shutterISO').value;
    const aperture = document.getElementById('shutterAperture').value;
    const ev = document.getElementById('shutterEV').value;

    let url = `/api/shutter?iso=${iso}&aperture=${aperture}`;
    if (ev) {
        url += `&ev=${ev}`;
    }
    console.log('📤 Отправка запроса:', url);

    const response = await fetch(url);
    const data = await response.json();

    console.log(data);

    document.getElementById('shutterValue').textContent = data.recommended;
    document.getElementById('shutterExact').textContent = data.exact;
    shutterResult.classList.add('show');
});

const todoInput = document.getElementById('todoInput');
const addTodoBtn = document.getElementById('addTodoBtn');
const todoList = document.getElementById('todoList');
const todoCount = document.getElementById('todoCount');

async function loadTodos() {
    try {
    const response = await fetch('/api/todos');
    const todos = await response.json();
    renderTodos(todos);
    } catch (error) {
        todoList.innerHTML = '<li class="todo-empty">Ошибка загрузки</li>';
    }
}
function renderTodos(todos) {
    if (!todos || todos.length==0) {
    todoList.innerHTML = '<li class="todo-empty">Список пуст. Добавьте снаряжение!</li>';
    todoCount.textContent = '0/0';
    return;
    }
    let html = '';
    let doneCount = 0;
    todos.forEach(todo => {
        if (todo.done) doneCount++;
        html += `
            <li class="${todo.done ? 'done' : ''}" data-id="${todo.id}">
                <span class="text">${todo.text}</span>
                <button class="delete-btn" data-id="${todo.id}">✕</button>
            </li>
        `;
    });
    todoList.innerHTML = html;
    todoCount.textContent = `${doneCount}/${todos.length}`;

    todoList.querySelectorAll('li').forEach(li => {
        li.addEventListener('click', function(e) {
            if (e.target.classList.contains('delete-btn')) return;
            const id = parseInt(this.dataset.id);
            toggleTodo(id);
        });
    });

    todoList.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = parseInt(this.dataset.id);
            deleteTodo(id);
        });
    });
}
async function addTodo() {
    const text = todoInput.value.trim();
    if (!text) return;

    try {
        const response = await fetch('/api/todos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        if (response.ok) {
            todoInput.value = '';
            loadTodos();
        }
    } catch (error) {
        alert('Ошибка при добавлении');
    }
}

async function toggleTodo(id) {
    try {
        await fetch(`/api/todos/${id}`, { method: 'PUT' });
        loadTodos();
    } catch (error) {
        alert('Ошибка');
    }
}

async function deleteTodo(id) {
    try {
        await fetch(`/api/todos/${id}`, { method: 'DELETE' });
        loadTodos();
    } catch (error) {
        alert('Ошибка');
    }
}

addTodoBtn.addEventListener('click', addTodo);
todoInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTodo();
});

loadTodos();
