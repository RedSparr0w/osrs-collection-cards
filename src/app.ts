import TaskManager from "./TaskManager";
import './styles.scss';

window.addEventListener('DOMContentLoaded', async () => {
	const taskManager = new TaskManager();
	const cardGrid = document.getElementById('card-grid');
	const statusText = document.getElementById('status-text');

	if (!cardGrid) {
		console.error('Missing #card-grid container');
		return;
	}

	if (statusText) {
		statusText.textContent = 'Loading tasks...';
	}

	await taskManager.initialize();
	console.log('tasks', taskManager.getTasks());

	const tasks = taskManager.getTasks();

	if (statusText) {
		statusText.textContent = `Rendering ${tasks.length} cards...`;
	}

	let renderedTasks = 0;
	const tasksToRender = 5;
	tasks.sort((a, b) => Math.random() - 0.5); // Shuffle tasks randomly
	tasks.slice(0, tasksToRender).forEach(async (task) => {
		try {
			const cardElement = await task.getCard().then(card => card.generateElement());
			setTimeout(() =>{
				cardGrid.appendChild(cardElement);
			}, renderedTasks * 150); // Stagger card additions for visual effect
			renderedTasks++;
		} catch (error) {
			console.warn(`Failed to render card for task ${task.id}:`, error);
		}
		if (statusText) {
			statusText.textContent = `Rendered ${renderedTasks} of ${tasksToRender} cards...`;
		}
	});


	if (statusText) {
		statusText.textContent = `Rendered ${renderedTasks} cards`;
	}
});
