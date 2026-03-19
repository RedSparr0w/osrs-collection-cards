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
	for (const task of tasks) {
		if (Math.random() > 0.02) continue;
		setTimeout(async () => {
			const card = await task.getCard();
			const cardElement = await card.generateElement();
			cardGrid.appendChild(cardElement);
		}, renderedTasks * 100);
		renderedTasks++;
	}


	if (statusText) {
		statusText.textContent = `Rendered ${renderedTasks} cards`;
	}
});
