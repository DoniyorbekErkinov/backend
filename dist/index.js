"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
app.use(body_parser_1.default.json());
app.use((0, cors_1.default)());
const filePath = path_1.default.join(__dirname, 'items.json');
// Initialize the file if it doesn't exist
const initializeFile = () => {
    if (!fs_1.default.existsSync(filePath)) {
        fs_1.default.writeFileSync(filePath, JSON.stringify({ Apps: [] }));
    }
};
// Read items from the JSON file
const readItems = () => {
    const fileContent = fs_1.default.readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent);
};
// Write items to the JSON file
const writeItems = (data) => {
    fs_1.default.writeFileSync(filePath, JSON.stringify(data, null, 2));
};
// Initialize the file
initializeFile();
let data = readItems();
// Helper function to get the next available app ID
const getNextAppId = () => {
    const maxId = data.Apps.reduce((max, app) => Math.max(max, app.id), 0);
    return maxId + 1;
};
// Helper function to get the next available todo ID within a specific app
const getNextTodoId = (app) => {
    const maxId = app.todos.reduce((max, todo) => Math.max(max, todo.id), 0);
    return maxId + 1;
};
// Import a specific app
app.post('/apps/import', (req, res) => {
    const importedApp = req.body;
    // Assign a new ID to the imported app
    importedApp.id = getNextAppId();
    // Assign new IDs to the todos within the imported app
    importedApp.todos = importedApp.todos.map(todo => (Object.assign(Object.assign({}, todo), { id: getNextTodoId(importedApp) })));
    // Add the imported app to the data structure
    data.Apps.push(importedApp);
    writeItems(data);
    res.status(201).json(importedApp);
});
// Export a specific app
app.get('/apps/:appId/export', (req, res) => {
    const appId = parseInt(req.params.appId);
    const app = data.Apps.find(a => a.id === appId);
    if (app) {
        res.json(app);
    }
    else {
        res.status(404).json({ message: 'App not found' });
    }
});
// Get all apps
app.get('/apps', (req, res) => {
    res.json(data.Apps);
});
// Create a new app
app.post('/apps', (req, res) => {
    const newApp = Object.assign(Object.assign({}, req.body), { id: getNextAppId(), createdAt: new Date().toISOString(), todos: [] });
    data.Apps.push(newApp);
    writeItems(data);
    res.status(201).json(newApp);
});
// Update an app name
app.put('/apps/:appId', (req, res) => {
    const appId = parseInt(req.params.appId);
    const updatedAppName = req.body.name;
    const app = data.Apps.find(a => a.id === appId);
    if (app) {
        app.name = updatedAppName;
        writeItems(data);
        res.json(app);
    }
    else {
        res.status(404).json({ message: 'App not found' });
    }
});
// Get todos of a specific app with search and filter options
app.post('/apps/:appId/todos', (req, res) => {
    const appId = parseInt(req.params.appId);
    const { query, archived, completed } = req.body;
    const app = data.Apps.find(a => a.id === appId);
    if (!app) {
        return res.status(404).json({ message: 'App not found' });
    }
    let todos = app.todos;
    if (typeof archived === 'boolean') {
        todos = todos.filter(todo => todo.isArchived === archived);
    }
    else {
        todos = todos.filter(todo => !todo.isArchived); // Default to only active todos if archived is not specified
    }
    if (typeof query === 'string' && query.trim() !== '') {
        todos = todos.filter(todo => todo.name.toLowerCase().includes(query.toLowerCase()));
    }
    if (typeof completed === 'boolean') {
        todos = todos.filter(todo => todo.isCompleted === completed);
    }
    res.json(todos);
});
// Create a new todo in a specific app
app.post('/apps/:appId/todos/new', (req, res) => {
    const appId = parseInt(req.params.appId);
    const app = data.Apps.find(a => a.id === appId);
    if (app) {
        const newTodo = Object.assign(Object.assign({}, req.body), { id: getNextTodoId(app), createdAt: new Date().toISOString(), isArchived: false, isCompleted: false, tasks: [] });
        app.todos.push(newTodo);
        writeItems(data);
        res.status(201).json(newTodo);
    }
    else {
        res.status(404).json({ message: 'App not found' });
    }
});
// Update a specific todo in a specific app
app.put('/apps/:appId/todos/:todoId', (req, res) => {
    const appId = parseInt(req.params.appId);
    const todoId = parseInt(req.params.todoId);
    const updatedTodoData = req.body;
    const app = data.Apps.find(a => a.id === appId);
    if (app) {
        const todoIndex = app.todos.findIndex(t => t.id === todoId);
        if (todoIndex !== -1) {
            const todo = app.todos[todoIndex];
            app.todos[todoIndex] = Object.assign(Object.assign({}, todo), updatedTodoData); // Merge old and new data
            writeItems(data);
            res.json(app.todos[todoIndex]);
        }
        else {
            res.status(404).json({ message: 'Todo not found' });
        }
    }
    else {
        res.status(404).json({ message: 'App not found' });
    }
});
// Archive a specific todo in a specific app
app.delete('/apps/:appId/todos/:todoId', (req, res) => {
    const appId = parseInt(req.params.appId);
    const todoId = parseInt(req.params.todoId);
    const app = data.Apps.find(a => a.id === appId);
    if (app) {
        const todo = app.todos.find(t => t.id === todoId);
        if (todo) {
            todo.isArchived = true;
            writeItems(data);
            res.status(204).end();
        }
        else {
            res.status(404).json({ message: 'Todo not found' });
        }
    }
    else {
        res.status(404).json({ message: 'App not found' });
    }
});
// Add a task to a specific todo in a specific app
app.post('/apps/:appId/todos/:todoId/tasks', (req, res) => {
    const appId = parseInt(req.params.appId);
    const todoId = parseInt(req.params.todoId);
    const newTask = req.body;
    const app = data.Apps.find(a => a.id === appId);
    if (app) {
        const todo = app.todos.find(t => t.id === todoId);
        if (todo) {
            todo.tasks.push(newTask);
            writeItems(data);
            res.status(201).json(newTask);
        }
        else {
            res.status(404).json({ message: 'Todo not found' });
        }
    }
    else {
        res.status(404).json({ message: 'App not found' });
    }
});
// Get tasks of a specific todo in a specific app
app.get('/apps/:appId/todos/:todoId/tasks', (req, res) => {
    const appId = parseInt(req.params.appId);
    const todoId = parseInt(req.params.todoId);
    const app = data.Apps.find(a => a.id === appId);
    if (app) {
        const todo = app.todos.find(t => t.id === todoId);
        if (todo) {
            res.json(todo.tasks);
        }
        else {
            res.status(404).json({ message: 'Todo not found' });
        }
    }
    else {
        res.status(404).json({ message: 'App not found' });
    }
});
// Update a task in a specific todo in a specific app
app.put('/apps/:appId/todos/:todoId/tasks/:taskIndex', (req, res) => {
    const appId = parseInt(req.params.appId);
    const todoId = parseInt(req.params.todoId);
    const taskIndex = parseInt(req.params.taskIndex);
    const updatedTaskData = req.body;
    const app = data.Apps.find(a => a.id === appId);
    if (app) {
        const todo = app.todos.find(t => t.id === todoId);
        if (todo) {
            if (taskIndex >= 0 && taskIndex < todo.tasks.length) {
                const task = todo.tasks[taskIndex];
                todo.tasks[taskIndex] = Object.assign(Object.assign({}, task), updatedTaskData); // Merge old and new data
                writeItems(data);
                res.json(todo.tasks[taskIndex]);
            }
            else {
                res.status(404).json({ message: 'Task not found' });
            }
        }
        else {
            res.status(404).json({ message: 'Todo not found' });
        }
    }
    else {
        res.status(404).json({ message: 'App not found' });
    }
});
// Delete a task from a specific todo in a specific app
app.delete('/apps/:appId/todos/:todoId/tasks/:taskIndex', (req, res) => {
    const appId = parseInt(req.params.appId);
    const todoId = parseInt(req.params.todoId);
    const taskIndex = parseInt(req.params.taskIndex);
    const app = data.Apps.find(a => a.id === appId);
    if (app) {
        const todo = app.todos.find(t => t.id === todoId);
        if (todo) {
            if (taskIndex >= 0 && taskIndex < todo.tasks.length) {
                todo.tasks.splice(taskIndex, 1);
                writeItems(data);
                res.status(204).end();
            }
            else {
                res.status(404).json({ message: 'Task not found' });
            }
        }
        else {
            res.status(404).json({ message: 'Todo not found' });
        }
    }
    else {
        res.status(404).json({ message: 'App not found' });
    }
});
// Check or uncheck a todo
app.put('/apps/:appId/todos/:todoId/check', (req, res) => {
    const appId = parseInt(req.params.appId);
    const todoId = parseInt(req.params.todoId);
    const app = data.Apps.find(a => a.id === appId);
    if (app) {
        const todo = app.todos.find(t => t.id === todoId);
        if (todo) {
            todo.isCompleted = !todo.isCompleted;
            if (todo.isCompleted) {
                todo.completedAt = new Date().toISOString();
            }
            else {
                delete todo.completedAt;
            }
            writeItems(data);
            res.json(todo);
        }
        else {
            res.status(404).json({ message: 'Todo not found' });
        }
    }
    else {
        res.status(404).json({ message: 'App not found' });
    }
});
// Search todos by name within a specific app and optionally filter by status and completion
app.get('/apps/:appId/todos/search', (req, res) => {
    const appId = parseInt(req.params.appId);
    const query = req.query.q;
    const status = req.query.status;
    const completed = req.query.completed;
    if (!query) {
        return res.status(400).json({ message: 'Query parameter "q" is required' });
    }
    const app = data.Apps.find(a => a.id === appId);
    if (!app) {
        return res.status(404).json({ message: 'App not found' });
    }
    let results = app.todos.filter(todo => todo.name.toLowerCase().includes(query.toLowerCase()));
    if (status) {
        results = results.filter(todo => (status === 'archived' ? todo.isArchived : !todo.isArchived));
    }
    if (completed) {
        const isCompleted = completed === 'true';
        results = results.filter(todo => todo.isCompleted === isCompleted);
    }
    res.json(results);
});
// Filter todos by archived status and completion
app.get('/apps/:appId/todos/filter', (req, res) => {
    const appId = parseInt(req.params.appId);
    const status = req.query.status;
    const completed = req.query.completed;
    const app = data.Apps.find(a => a.id === appId);
    if (!app) {
        return res.status(404).json({ message: 'App not found' });
    }
    let filteredTodos = app.todos;
    if (status) {
        filteredTodos = filteredTodos.filter(todo => (status === 'archived' ? todo.isArchived : !todo.isArchived));
    }
    if (completed) {
        const isCompleted = completed === 'true';
        filteredTodos = filteredTodos.filter(todo => todo.isCompleted === isCompleted);
    }
    res.json(filteredTodos);
});
// Toggle completion of a task in a specific todo in a specific app
app.put('/apps/:appId/todos/:todoId/tasks/:taskIndex/toggle', (req, res) => {
    const appId = parseInt(req.params.appId);
    const todoId = parseInt(req.params.todoId);
    const taskIndex = parseInt(req.params.taskIndex);
    const app = data.Apps.find(a => a.id === appId);
    if (app) {
        const todo = app.todos.find(t => t.id === todoId);
        if (todo) {
            if (taskIndex >= 0 && taskIndex < todo.tasks.length) {
                const task = todo.tasks[taskIndex];
                task.isCompleted = !task.isCompleted;
                writeItems(data);
                res.json(task);
            }
            else {
                res.status(404).json({ message: 'Task not found' });
            }
        }
        else {
            res.status(404).json({ message: 'Todo not found' });
        }
    }
    else {
        res.status(404).json({ message: 'App not found' });
    }
});
// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
