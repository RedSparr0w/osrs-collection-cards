import CanvasManager from "./CanvasManager";

window.addEventListener('DOMContentLoaded', async () => {
	const canvasManager = new CanvasManager('main-canvas');

	const cardTemplateImg = await canvasManager.loadImage('./images/CardTemplate.png');

	// Load CardMask.png
	const maskImg = await canvasManager.loadImage('./images/CardMask.png');

	// Load Achievement_Diaries.png
	const achievementImg = await canvasManager.loadImage('./images/Achievement_Diaries.png');

	canvasManager.addAnimationCallback((ctx, canvas, frame, deltaTime) => {
		const img = cardTemplateImg;
		const centerY = canvas.height / 2;
		// Card positions: center, left, right
		const numCards = 3;
		const spacing = Math.min(canvas.width / 4, 350);
		const baseScale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.35;
		const cardCenters = [
			canvas.width / 2,
			canvas.width / 2 - spacing,
			canvas.width / 2 + spacing
		];
		for (let i = 0; i < numCards; i++) {
			const cardX = cardCenters[i];
			ctx.save();
			ctx.translate(cardX, centerY);
			ctx.drawImage(maskImg, -img.width * baseScale / 2, -img.height * baseScale / 2, img.width * baseScale, img.height * baseScale);
			// Draw achievement image (top middle, behind card, in front of mask)
			const achWidth = img.width * baseScale * 0.4;
			const achHeight = achWidth * (achievementImg.height / achievementImg.width);
			ctx.drawImage(
				achievementImg,
				-achWidth / 2,
				-img.height * baseScale / 2 + 20,
				achWidth,
				achHeight
			);
			// Draw card image
			ctx.drawImage(img, -img.width * baseScale / 2, -img.height * baseScale / 2, img.width * baseScale, img.height * baseScale);
			ctx.restore();
		}
	});
});
