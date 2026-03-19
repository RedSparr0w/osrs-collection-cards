/**
 * Card type definitions and defaults.
 * Each type owns its template, mask, and style preset.
 */

interface CardTypeConfig {
	fontFamily: string;
	titleFontFamily: string;
	descriptionFontFamily: string;
	titleFontSize: number;
	titleColor: string;
	descriptionFontSize: number;
	descriptionColor: string;
	categoryFontSize: number;
	categoryColor: string;
	categoryBendPercent: number;
	iconSize: number;
	smallIconSize: number;
	backgroundColor: string;
	defaultHeight: number;
}

export interface CardTypeDefinition {
	template: string;
	mask: string;
	config: CardTypeConfig;
}

export const CARD_TYPE = {
	BASIC: {
		template: './images/CardTemplate_Basic.png',
		mask: './images/CardMask_Basic.png',
		config: {
			fontFamily: 'Runescape, Arial, sans-serif',
			titleFontFamily: 'Runescape Bold, Arial Black, sans-serif',
			descriptionFontFamily: 'Runescape, Arial, sans-serif',
			titleFontSize: 18,
			titleColor: '#000',
			descriptionFontSize: 14,
			descriptionColor: '#333',
			categoryFontSize: 25,
			categoryColor: '#36281f',
			categoryBendPercent: 0.07,
			iconSize: 0.3,
			smallIconSize: 0.1,
			backgroundColor: '#e2dbc8',
			defaultHeight: 400,
		},
	},
} as const;

/**
 * User-configurable card input
 */
export interface CardConfig {
	type?: CardTypeDefinition;
	title?: string;
	description?: string;
	icon?: string;
	smallIcons?: string[];
	category?: string;
}

export default class Card {
	private config: CardConfig;
	private type: CardTypeDefinition;
	private templateImg: HTMLImageElement | null = null;
	private maskImg: HTMLImageElement | null = null;
	private loadedImages: Map<string, HTMLImageElement> = new Map();
	private width: number = 0;
	private height: number = 0;
	private cachedCanvas: HTMLCanvasElement | null = null;

	constructor(config: CardConfig) {
		this.type = config.type ?? CARD_TYPE.BASIC;
		this.config = {
			...config,
			type: this.type,
		};
	}

	/**
	 * Pre-load all images used in the card
	 */
	async loadImages(): Promise<void> {
		this.templateImg = await this.loadImage(this.type.template);
		this.maskImg = await this.loadImage(this.type.mask);

		if (!this.width || !this.height) {
			const aspectRatio = this.templateImg.width / this.templateImg.height;
			this.height = this.type.config.defaultHeight;
			this.width = this.height * aspectRatio;
		}

		// Load other images (gracefully skip if they fail)
		const urlsToLoad = [
			...(this.config.icon ? [this.config.icon] : []),
			...(this.config.smallIcons || []),
		];

		// Use allSettled to continue rendering even if optional images fail to load
		const results = await Promise.allSettled(
			urlsToLoad.map((url) => this.loadImage(url)),
		);

		// Log failed image loads for debugging
		results.forEach((result, index) => {
			if (result.status === 'rejected') {
				console.warn(`Optional image failed to load: ${urlsToLoad[index]}`);
			}
		});
	}

	/**
	 * Load a single image by URL
	 */
	private loadImage(url: string): Promise<HTMLImageElement> {
		return new Promise((resolve, reject) => {
			if (this.loadedImages.has(url)) {
				resolve(this.loadedImages.get(url)!);
				return;
			}

			const img = new Image();
			img.onload = () => {
				this.loadedImages.set(url, img);
				resolve(img);
			};
			img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
			img.src = url;
		});
	}

	/**
	 * Generate and cache a canvas for this card. Returns the cached canvas on subsequent calls.
	 */
	async generateCanvas(): Promise<HTMLCanvasElement> {
		if (this.cachedCanvas) {
			return this.cachedCanvas;
		}

		const canvas = document.createElement('canvas');
		await this.render(canvas);
		this.cachedCanvas = canvas;
		return canvas;
	}

	/**
	 * Render the card onto a canvas
	 */
	async render(targetCanvas: HTMLCanvasElement): Promise<void> {
		await this.loadImages();

		if (!this.templateImg) {
			throw new Error('Template image failed to load');
		}

		const ctx = targetCanvas.getContext('2d');
		if (!ctx) throw new Error('Could not get 2D context');

		const style = this.type.config;
		const w = this.width;
		const h = this.height;

		targetCanvas.width = w;
		targetCanvas.height = h;

		// Layer 1: Mask (defines the card shape)
		if (!this.maskImg) {
			throw new Error('Mask image failed to load');
		}
		ctx.drawImage(this.maskImg, 0, 0, w, h);

		// Set composite mode so background and content only appear where the mask is opaque
		ctx.globalCompositeOperation = 'source-atop';

		// Layer 2: Background color (only visible within mask)
		if (style.backgroundColor) {
			ctx.fillStyle = style.backgroundColor;
			ctx.fillRect(0, 0, w, h);
		}

		// Layer 3: Icon at top middle
		if (this.config.icon) {
			const iconImg = this.loadedImages.get(this.config.icon);
			if (iconImg) {
				const iconSize = w * style.iconSize;
				const iconX = (w - iconSize) / 2;
				const iconY = h * 0.145; // Top third of card
				ctx.drawImage(iconImg, iconX, iconY, iconSize, iconSize);
			}
		}

		// Calculate text positioning
		let currentY = h * 0.15; // Start below icon

		// Layer 4: Title text (above or below icon)
		if (this.config.title) {
			currentY = h * 0.42; // Below icon

			ctx.font = `${style.titleFontSize}px ${style.titleFontFamily}`;
			ctx.fillStyle = style.titleColor;
			ctx.textAlign = 'center';

			// Draw wrapped title and move description start directly after it
			const titleLineHeight = style.titleFontSize + 2;
			const titleBottomY = this.drawMultilineText(
				ctx,
				this.config.title,
				w / 2,
				currentY,
				w * 0.9,
				titleLineHeight,
			);
			currentY = titleBottomY + 20;
		}

		// Layer 5: Description text
		if (this.config.description) {
			ctx.font = `${style.descriptionFontSize}px ${style.descriptionFontFamily}`;
			ctx.fillStyle = style.descriptionColor;
			ctx.textAlign = 'center';
			const descriptionLineHeight = style.descriptionFontSize + 2;
			const descriptionBottomY = this.drawMultilineText(
				ctx,
				this.config.description,
				w / 2,
				currentY,
				w * 0.85,
				descriptionLineHeight,
			);
			currentY = descriptionBottomY + 15;
		}

		// Layer 6: Small icons array
		if (this.config.smallIcons && this.config.smallIcons.length > 0) {
			const smallIconSize = w * style.smallIconSize;
			const totalWidth = this.config.smallIcons.length * smallIconSize + (this.config.smallIcons.length - 1) * 5;
			const startX = (w - totalWidth) / 2;

			for (let i = 0; i < this.config.smallIcons.length; i++) {
				const url = this.config.smallIcons[i];
				const img = this.loadedImages.get(url);
				if (img) {
					const x = startX + i * (smallIconSize + 5);
					ctx.drawImage(img, x, currentY, smallIconSize, smallIconSize);
				}
			}
		}

		// Reset composite operation before drawing template
		ctx.globalCompositeOperation = 'source-over';

		// Layer 7: Card template (front layer)
		ctx.drawImage(this.templateImg, 0, 0, w, h);

		// Layer 8: Optional category text on top of template
		if (this.config.category) {
			ctx.font = `${style.categoryFontSize}px ${style.titleFontFamily}`;
			ctx.fillStyle = style.categoryColor;
			ctx.textAlign = 'center';
			this.drawCurvedText(
				ctx,
				this.config.category,
				w / 2,
				h * 0.155,
				w,
				style.categoryBendPercent,
			);
		}
	}

	/**
	 * Generate a card and return it as an image URL
	 */
	async generateImageUrl(): Promise<string> {
		const canvas = await this.generateCanvas();
		return canvas.toDataURL('image/png');
	}

	/**
	 * Draw curved text on canvas
	 */
	private drawCurvedText(
		ctx: CanvasRenderingContext2D,
		text: string,
		centerX: number,
		baselineY: number,
		fullImageWidth: number,
		bendPercent: number = 0.01,
	): void {
		const bendPixels = Math.max(0, fullImageWidth * bendPercent);
		const halfImageWidth = Math.max(1, fullImageWidth / 2);

		if (bendPixels <= 0) {
			ctx.textAlign = 'center';
			ctx.fillText(text, centerX, baselineY);
			return;
		}

		ctx.save();
		ctx.textAlign = 'left';
		ctx.textBaseline = 'alphabetic';

		const textWidth = ctx.measureText(text).width;
		const startX = centerX - textWidth / 2;

		let currentX = startX;

		for (let i = 0; i < text.length; i++) {
			const char = text[i];
			const charWidth = ctx.measureText(char).width;
			const charCenterX = currentX + charWidth / 2;
			const xFromCenter = charCenterX - centerX;
			const normalized = Math.max(-1, Math.min(1, xFromCenter / halfImageWidth));
			const yOffset = -bendPixels * (1 - normalized * normalized);
			const slope = (2 * bendPixels * normalized) / halfImageWidth;
			const rotation = Math.atan(slope);

			ctx.save();
			ctx.translate(charCenterX, baselineY + yOffset);
			ctx.rotate(rotation);
			ctx.fillText(char, -charWidth / 2, 0);
			ctx.restore();
			currentX += charWidth;
		}

		ctx.restore();
	}

	/**
	 * Draw multiline text on canvas
	 */
	private drawMultilineText(
		ctx: CanvasRenderingContext2D,
		text: string,
		x: number,
		y: number,
		maxWidth: number,
		lineHeight: number,
	): number {
		const words = text.split(' ');
		let line = '';
		let currentY = y;

		for (const word of words) {
			const testLine = line + (line ? ' ' : '') + word;
			const metrics = ctx.measureText(testLine);

			if (metrics.width > maxWidth && line) {
				ctx.fillText(line, x, currentY);
				line = word;
				currentY += lineHeight;
			} else {
				line = testLine;
			}
		}
		ctx.fillText(line, x, currentY);
		return currentY;
	}
}
