import TaskManager from './TaskManager';
import GameManager from './GameManager';
import './styles.scss';
import { Sections } from './UIController';
import { delay } from './helpers';

window.addEventListener('DOMContentLoaded', async () => {
	const gameManager = new GameManager();
	await gameManager.start();
});
