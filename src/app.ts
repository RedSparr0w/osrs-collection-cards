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
			const card = await task.getCard();
			const cardElement = await card.generateElement();
			card.setFlipped(true);
			cardElement.tabIndex = 0;
			cardElement.setAttribute('role', 'button');
			cardElement.setAttribute('aria-label', `Flip ${task.name}`);
			cardElement.addEventListener('click', () => card.toggleFlipped());
			cardGrid.appendChild(cardElement);
			setTimeout(() =>{
				card.setFlipped(false);
			}, 1000 + renderedTasks * 200); // Stagger card additions for visual effect
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
