import CanvasManager from "./CanvasManager";

window.addEventListener('DOMContentLoaded', () => {
	const canvasManager = new CanvasManager('main-canvas');

	const cardTemplateImg = new Image();
	cardTemplateImg.src = './images/CardTemplate.png';
	let cardTemplateLoaded = false;
	cardTemplateImg.onload = () => { cardTemplateLoaded = true; };

	// Load CardMask.png
	const maskImg = new Image();
	maskImg.src = './images/CardMask.png';
	let maskLoaded = false;
	maskImg.onload = () => { maskLoaded = true; };

	// Load Achievement_Diaries.png
	const achievementImg = new Image();
	achievementImg.src = './images/Achievement_Diaries.png';
	let achievementLoaded = false;
	achievementImg.onload = () => { achievementLoaded = true; };

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
			if (maskLoaded) {
				ctx.drawImage(maskImg, -img.width * baseScale / 2, -img.height * baseScale / 2, img.width * baseScale, img.height * baseScale);
			}
			// Draw achievement image (top middle, behind card, in front of mask)
			if (achievementLoaded) {
				const achWidth = img.width * baseScale * 0.4;
				const achHeight = achWidth * (achievementImg.height / achievementImg.width);
				ctx.drawImage(
					achievementImg,
					-achWidth / 2,
					-img.height * baseScale / 2 + 20,
					achWidth,
					achHeight
				);
			}
			// Draw card image
			ctx.drawImage(img, -img.width * baseScale / 2, -img.height * baseScale / 2, img.width * baseScale, img.height * baseScale);
			ctx.restore();
		}
	});
});
