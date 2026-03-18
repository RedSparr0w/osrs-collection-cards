type AnimationCallback = (
	ctx: CanvasRenderingContext2D,
	canvas: HTMLCanvasElement,
	frame: number,
	deltaTime: number,
) => void;

export default class CanvasManager {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private animationCallbacks: AnimationCallback[] = [];
	private animationFrameId: number | null = null;
	private frameCount: number = 0;
	private lastFrameTime: number = 0;
	private frameInterval: number;
	private _targetFPS: number;

	constructor(canvasId: string, targetFPS: number = 60) {
		this._targetFPS = targetFPS;
		this.frameInterval = 1000 / targetFPS;

		let canvas = document.getElementById(canvasId) as HTMLCanvasElement;
		if (!canvas) {
			const newCanvas = document.createElement('canvas');
			newCanvas.id = canvasId;
			document.body.appendChild(newCanvas);
			canvas = newCanvas;
		}
		this.canvas = canvas;
		this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

		this.handleResize = this.handleResize.bind(this);
		window.addEventListener('resize', this.handleResize);
		this.handleResize();
		this.startAnimationLoop();
	}

	// --- Framerate control ---

	get targetFPS(): number {
		return this._targetFPS;
	}

	set targetFPS(fps: number) {
		this._targetFPS = fps;
		this.frameInterval = 1000 / fps;
	}

	// --- Image loading ---

	public loadImage(src: string): Promise<HTMLImageElement> {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => {
				resolve(img);
			};
			img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
			img.src = src;
		});
	}

	// --- Resize ---

	private handleResize(): void {
		this.canvas.width = window.innerWidth;
		this.canvas.height = window.innerHeight;
	}

	// --- Animation loop ---

	private startAnimationLoop(): void {
		const loop = (timestamp: number) => {
			this.animationFrameId = window.requestAnimationFrame(loop);

			const elapsed = timestamp - this.lastFrameTime;
			if (elapsed < this.frameInterval) return;

			// Snap lastFrameTime to a multiple of frameInterval to avoid drift
			this.lastFrameTime = timestamp - (elapsed % this.frameInterval);
			const deltaTime = elapsed / 1000; // seconds

			this.frameCount++;
			this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
			for (const cb of this.animationCallbacks) {
				cb(this.ctx, this.canvas, this.frameCount, deltaTime);
			}
		};
		this.animationFrameId = window.requestAnimationFrame(loop);
	}

	public stopAnimationLoop(): void {
		if (this.animationFrameId !== null) {
			window.cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
	}

	public resumeAnimationLoop(): void {
		if (this.animationFrameId === null) {
			this.lastFrameTime = 0;
			this.startAnimationLoop();
		}
	}

	// --- Callbacks ---

	public addAnimationCallback(cb: AnimationCallback): void {
		this.animationCallbacks.push(cb);
	}

	public removeAnimationCallback(cb: AnimationCallback): void {
		const index = this.animationCallbacks.indexOf(cb);
		if (index !== -1) this.animationCallbacks.splice(index, 1);
	}

	// --- Cleanup ---

	public destroy(): void {
		this.stopAnimationLoop();
		window.removeEventListener('resize', this.handleResize);
	}
}
