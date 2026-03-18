export default class CanvasManager {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private image: HTMLImageElement | null = null;

	constructor(canvasId: string) {
		let canvas = document.getElementById(canvasId) as HTMLCanvasElement;
		if (!canvas) {
            const newCanvas = document.createElement('canvas');
            newCanvas.id = canvasId;
            document.body.appendChild(newCanvas);
            canvas = newCanvas;
        }
		const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
		this.canvas = canvas;
		this.ctx = ctx;
		this.handleResize = this.handleResize.bind(this);
		window.addEventListener('resize', this.handleResize);
		this.handleResize();
	}

	private handleResize() {
		this.canvas.width = window.innerWidth;
		this.canvas.height = window.innerHeight;
		this.redraw();
	}

	public loadImage(src: string) {
		const img = new Image();
		img.src = src;
		img.onload = () => {
			this.image = img;
			this.redraw();
		};
		img.onerror = () => {
			this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
			this.ctx.fillStyle = 'red';
			this.ctx.font = '20px sans-serif';
			this.ctx.fillText('Image not found', 20, 40);
		};
	}

	public redraw() {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		if (this.image) {
			// Fit image to canvas while preserving aspect ratio
			const scale = Math.min(this.canvas.width / this.image.width, this.canvas.height / this.image.height);
			const drawWidth = this.image.width * scale;
			const drawHeight = this.image.height * scale;
			const x = (this.canvas.width - drawWidth) / 2;
			const y = (this.canvas.height - drawHeight) / 2;
			this.ctx.drawImage(this.image, x, y, drawWidth, drawHeight);
		}
	}
}
