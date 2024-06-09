import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(bodyParser.json());
app.use(cors());

const filePath = path.join(__dirname, 'items.json');

type Task = {
  isCompleted: boolean;
  text: string;
};

type Todo = {
  id: number;
  name: string;
  isCompleted: boolean;
  isArchived: boolean;
  createdAt: string;
  completedAt?: string; // Optional field, only present if the todo is completed
  tasks: Task[];
};

type App = {
  id: number;
  name: string;
  createdAt: string;
  todos: Todo[];
};

type DataStructure = {
  Apps: App[];
};


// Initialize the file if it doesn't exist
const initializeFile = () => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({ Apps: [] }));
  }
};

// Read items from the JSON file
const readItems = (): DataStructure => {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(fileContent);
};

// Write items to the JSON file
const writeItems = (data: DataStructure) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// Initialize the file
initializeFile();
let data: DataStructure = readItems();

// Helper function to get the next available app ID
const getNextAppId = (): number => {
  const maxId = data.Apps.reduce((max, app) => Math.max(max, app.id), 0);
  return maxId + 1;
};

// Helper function to get the next available todo ID within a specific app
const getNextTodoId = (app: App): number => {
  const maxId = app.todos.reduce((max, todo) => Math.max(max, todo.id), 0);
  return maxId + 1;
};

// Get all apps
app.get('/apps', (req: Request, res: Response) => {
  res.json(data.Apps);
});

// Create a new app
app.post('/apps', (req: Request, res: Response) => {
  const newApp: App = {
    ...req.body,
    id: getNextAppId(),
    createdAt: new Date().toISOString(),
    todos: []
  };
  data.Apps.push(newApp);
  writeItems(data);
  res.status(201).json(newApp);
});

// Update an app name
app.put('/apps/:appId', (req: Request, res: Response) => {
  const appId = parseInt(req.params.appId);
  const updatedAppName = req.body.name;
  const app = data.Apps.find(a => a.id === appId);
  if (app) {
    app.name = updatedAppName;
    writeItems(data);
    res.json(app);
  } else {
    res.status(404).json({ message: 'App not found' });
  }
});

// Get todos of a specific app
app.get('/apps/:appId/todos', (req: Request, res: Response) => {
  const appId = parseInt(req.params.appId);
  const app = data.Apps.find(a => a.id === appId);
  if (app) {
    res.json(app.todos);
  } else {
    res.status(404).json({ message: 'App not found' });
  }
});

// Create a new todo in a specific app
app.post('/apps/:appId/todos', (req: Request, res: Response) => {
  const appId = parseInt(req.params.appId);
  const app = data.Apps.find(a => a.id === appId);
  if (app) {
    const newTodo: Todo = {
      ...req.body,
      id: getNextTodoId(app),
      createdAt: new Date().toISOString(),
      isArchived: false, // Ensure new todos are not archived
      tasks: []
    };
    app.todos.push(newTodo);
    writeItems(data);
    res.status(201).json(newTodo);
  } else {
    res.status(404).json({ message: 'App not found' });
  }
});

// Update a specific todo in a specific app
app.put('/apps/:appId/todos/:todoId', (req: Request, res: Response) => {
  const appId = parseInt(req.params.appId);
  const todoId = parseInt(req.params.todoId);
  const updatedTodoData: Partial<Todo> = req.body;
  const app = data.Apps.find(a => a.id === appId);
  if (app) {
    const todoIndex = app.todos.findIndex(t => t.id === todoId);
    if (todoIndex !== -1) {
      const todo = app.todos[todoIndex];
      app.todos[todoIndex] = { ...todo, ...updatedTodoData }; // Merge old and new data
      writeItems(data);
      res.json(app.todos[todoIndex]);
    } else {
      res.status(404).json({ message: 'Todo not found' });
    }
  } else {
    res.status(404).json({ message: 'App not found' });
  }
});

// Archive a specific todo in a specific app
app.delete('/apps/:appId/todos/:todoId', (req: Request, res: Response) => {
  const appId = parseInt(req.params.appId);
  const todoId = parseInt(req.params.todoId);
  const app = data.Apps.find(a => a.id === appId);
  if (app) {
    const todo = app.todos.find(t => t.id === todoId);
    if (todo) {
      todo.isArchived = true;
      writeItems(data);
      res.status(204).end();
    } else {
      res.status(404).json({ message: 'Todo not found' });
    }
  } else {
    res.status(404).json({ message: 'App not found' });
  }
});

// Add a task to a specific todo in a specific app
app.post('/apps/:appId/todos/:todoId/tasks', (req: Request, res: Response) => {
  const appId = parseInt(req.params.appId);
  const todoId = parseInt(req.params.todoId);
  const newTask: Task = req.body;
  const app = data.Apps.find(a => a.id === appId);
  if (app) {
    const todo = app.todos.find(t => t.id === todoId);
    if (todo) {
      todo.tasks.push(newTask);
      writeItems(data);
      res.status(201).json(newTask);
    } else {
      res.status(404).json({ message: 'Todo not found' });
    }
  } else {
    res.status(404).json({ message: 'App not found' });
  }
});

// Get tasks of a specific todo in a specific app
app.get('/apps/:appId/todos/:todoId/tasks', (req: Request, res: Response) => {
  const appId = parseInt(req.params.appId);
  const todoId = parseInt(req.params.todoId);
  const app = data.Apps.find(a => a.id === appId);
  if (app) {
    const todo = app.todos.find(t => t.id === todoId);
    if (todo) {
      res.json(todo.tasks);
    } else {
      res.status(404).json({ message: 'Todo not found' });
    }
  } else {
    res.status(404).json({ message: 'App not found' });
  }
});

// Update a task in a specific todo in a specific app
app.put('/apps/:appId/todos/:todoId/tasks/:taskIndex', (req: Request, res: Response) => {
  const appId = parseInt(req.params.appId);
  const todoId = parseInt(req.params.todoId);
  const taskIndex = parseInt(req.params.taskIndex);
  const updatedTask: Task = req.body;
  const app = data.Apps.find(a => a.id === appId);
  if (app) {
    const todo = app.todos.find(t => t.id === todoId);
    if (todo) {
      if (taskIndex >= 0 && taskIndex < todo.tasks.length) {
        todo.tasks[taskIndex] = updatedTask;
        writeItems(data);
        res.json(updatedTask);
      } else {
        res.status(404).json({ message: 'Task not found' });
      }
    } else {
      res.status(404).json({ message: 'Todo not found' });
    }
  } else {
    res.status(404).json({ message: 'App not found' });
  }
});

// Toggle completion of a task in a specific todo in a specific app
app.put('/apps/:appId/todos/:todoId/tasks/:taskIndex/toggle', (req: Request, res: Response) => {
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
      } else {
        res.status(404).json({ message: 'Task not found' });
      }
    } else {
      res.status(404).json({ message: 'Todo not found' });
    }
  } else {
    res.status(404).json({ message: 'App not found' });
  }
});
app.delete('/apps/:appId/todos/:todoId/tasks/:taskIndex', (req: Request, res: Response) => {
  const appId = parseInt(req.params.appId);
  const todoId = parseInt(req.params.todoId);
  const taskIndex = parseInt(req.params.taskIndex);
  const app = data.Apps.find(a => a.id === appId);
  if (app) {
    const todo = app.todos.find(t => t.id === todoId);
    if (todo) {
      if (taskIndex >= 0 && taskIndex < todo.tasks.length) {
        const deletedTask = todo.tasks.splice(taskIndex, 1)[0]; // Remove the task and store it
        writeItems(data);
        res.json(deletedTask); // Respond with the deleted task
      } else {
        res.status(404).json({ message: 'Task not found' });
      }
    } else {
      res.status(404).json({ message: 'Todo not found' });
    }
  } else {
    res.status(404).json({ message: 'App not found' });
  }
});

// Check or uncheck a todo
app.put('/apps/:appId/todos/:todoId/check', (req: Request, res: Response) => {
  const appId = parseInt(req.params.appId);
  const todoId = parseInt(req.params.todoId);
  const app = data.Apps.find(a => a.id === appId);
  if (app) {
    const todo = app.todos.find(t => t.id === todoId);
    if (todo) {
      todo.isCompleted = !todo.isCompleted;
      if (todo.isCompleted) {
        todo.completedAt = new Date().toISOString();
      } else {
        delete todo.completedAt;
      }
      writeItems(data);
      res.json(todo);
    } else {
      res.status(404).json({ message: 'Todo not found' });
    }
  } else {
    res.status(404).json({ message: 'App not found' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
