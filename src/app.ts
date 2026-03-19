import TaskManager from './TaskManager';
import GameManager from './GameManager';
import CardController from './CardController';
import HandRenderer from './HandRenderer';
import './styles.scss';

window.addEventListener('DOMContentLoaded', async () => {

	const taskManager = new TaskManager();
	await taskManager.initialize();

	const gameManager = new GameManager(taskManager);
	gameManager.reset();
	gameManager.shuffle();

	const cardController = new CardController();
	cardController.bindResize();

	const tasksToRender = 5;
	const hand = gameManager.deal(tasksToRender);
	const handRenderer = new HandRenderer(cardController);
	await handRenderer.render(hand, {
		staggerMs: 200,
		flipDelayMs: 3000,
	});
});
