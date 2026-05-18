const router = require('express').Router();
const auth = require('../middleware/auth');
const { getTasks, createTask, updateTask, deleteTask } = require('../controllers/taskController');
const { getSubtasks, createSubtask, updateSubtask, deleteSubtask } = require('../controllers/subtaskController');

router.use(auth);

// Tasks
router.get('/', getTasks);
router.post('/', createTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

// Subtasks (nested under a task)
router.get('/:taskId/subtasks', getSubtasks);
router.post('/:taskId/subtasks', createSubtask);
router.put('/subtasks/:id', updateSubtask);
router.delete('/subtasks/:id', deleteSubtask);

module.exports = router;
