import CanvasManager from "./CanvasManager";
import Card from "./Card";

window.addEventListener('DOMContentLoaded', async () => {
	const canvasManager = new CanvasManager('main-canvas');

	// Create and generate the card
	const card = new Card({
		scale: 0.5,
		backgroundColor: '#e2dbc8',
		iconUrl: './images/achievement.png',
		iconSize: 0.25,
		titleText: 'Diary Name',
		titlePosition: 'below-icon',
		descriptionText: 'Some achievement description...',
		smallIconUrls: ['icon1.png', 'icon2.png'],
		templateTitleText: 'Optional overlay text'
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
