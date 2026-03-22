import TaskManager from './TaskManager';
import GameManager from './GameManager';
import TooltipController from './TooltipController';
import './styles.scss';
import { Sections } from './UIController';
import { delay } from './helpers';

window.addEventListener('DOMContentLoaded', async () => {
	new TooltipController();
	const gameManager = new GameManager();
	await gameManager.start();
});
