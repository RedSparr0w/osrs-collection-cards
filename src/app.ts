import CanvasManager from "./CanvasManager";
import Card, { CARD_TYPE } from "./Card";
import TaskManager from "./TaskManager";

window.addEventListener('DOMContentLoaded', async () => {
	const canvasManager = new CanvasManager('main-canvas');
	const taskManager = new TaskManager();
	await taskManager.initialize();
	console.log('tasks', taskManager.getTasks());

	const tasks = taskManager.getTasks();
	
	// Create cards from tasks and generate canvases
	console.debug('Generating cards for tasks...');
	await Promise.all(tasks.map(task => task.getCard()));

	console.debug('All cards generated, setting up animation callbacks...');
	tasks.forEach(async (task, index) => {

		if (index >= 10) return; // Limit to first 10 tasks for demo purposes
		const card = task.card;
		if (!card) return console.debug(`No card for task ${task.id} (${task.name})`);
		
		const cardCanvas = await card.generateCanvas();
		if (!cardCanvas) return console.debug(`No canvas for task ${task.id} (${task.name})`);

		canvasManager.addAnimationCallback((ctx, canvas, frame, deltaTime) => {
			const cardWidth = 300;
			const cardHeight = (cardCanvas.height / cardCanvas.width) * cardWidth;
			const randomX = parseInt(task.id.replace(/\W/g, ''), 36) % (canvas.width - cardWidth);
			const randomY = parseInt(task.id.replace(/\W/g, ''), 36) % (canvas.height - cardHeight);
			ctx.drawImage(cardCanvas, randomX, randomY, cardWidth, cardHeight);
		});
	});
});
