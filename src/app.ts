import CanvasManager from "./CanvasManager";

window.addEventListener('DOMContentLoaded', () => {
	const canvasManager = new CanvasManager('main-canvas');
	canvasManager.loadImage('./images/CardTemplate.png');
});
