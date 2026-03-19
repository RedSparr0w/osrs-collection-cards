import TaskManager from "./TaskManager";

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

	const fragment = document.createDocumentFragment();
	let renderedTasks = 0;
	for (const task of tasks) {
		if (Math.random() > 0.015) continue;
		const card = await task.getCard();
		const cardElement = await card.generateElement();
		fragment.appendChild(cardElement);
		renderedTasks++;
	}

	cardGrid.replaceChildren(fragment);

	if (statusText) {
		statusText.textContent = `Rendered ${renderedTasks} cards`;
	}
});
