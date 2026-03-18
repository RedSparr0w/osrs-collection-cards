import CanvasManager from "./CanvasManager";
import Card, { CARD_TYPE } from "./Card";

window.addEventListener('DOMContentLoaded', async () => {
	const canvasManager = new CanvasManager('main-canvas');

	// Create and generate the card
	const card = new Card({
		type: CARD_TYPE.BASIC,
		category: 'ACHIEVEMENT DIARY',
		title: 'Complete the Falador Easy Achievement Diary',
		description: 'I don\'t even know what to put here, Just complete the diary..',
		icon: './images/achievement.png',
		smallIcons: ['icon1.png', 'icon2.png'],
	});

	// Generate the card canvas once
	const cardCanvas = await card.generateCanvas();

	// Draw it in the animation loop
	canvasManager.addAnimationCallback((ctx, canvas, frame, deltaTime) => {
		const cardWidth = 300;
		const cardHeight = (cardCanvas.height / cardCanvas.width) * cardWidth;
		const centerX = canvas.width / 2 - cardWidth / 2;
		const centerY = canvas.height / 2 - cardHeight / 2;

		// Draw the generated card
		ctx.drawImage(cardCanvas, centerX, centerY, cardWidth, cardHeight);
	});
});
