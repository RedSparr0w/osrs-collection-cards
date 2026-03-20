import TaskManager from './TaskManager';
import GameManager from './GameManager';
import './styles.scss';

window.addEventListener('DOMContentLoaded', async () => {

	const taskManager = new TaskManager();
	await taskManager.initialize();

	const gameManager = new GameManager(taskManager);

	const tasksToRender = 5;
	await gameManager.deal(tasksToRender);
});
