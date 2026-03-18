/**
 * Available card template IDs
 */
export const CARD_TEMPLATE_IDS = {
	BASIC: 'basic',
	// MEDIEVAL: 'medieval',
	// DARK: 'dark',
} as const;

export type CardTemplateId = typeof CARD_TEMPLATE_IDS[keyof typeof CARD_TEMPLATE_IDS];

/**
 * Available card templates
 */
export const CARD_TEMPLATES: Record<string, string> = {
	basic: './images/CardTemplate_Basic.png',
	// Add more templates here as needed
	// medieval: './images/CardTemplate_Medieval.png',
	// dark: './images/CardTemplate_Dark.png',
};

/**
 * Available card masks (automatically matched to templates)
 */
export const CARD_MASKS: Record<string, string> = {
	basic: './images/CardMask_Basic.png',
	// Add more masks here as needed
	// medieval: './images/CardMask_Medieval.png',
	// dark: './images/CardMask_Dark.png',
};

/**
 * Card rendering configuration and generation
 */
export interface CardConfig {
	// Template and mask selection (mask is auto-matched to template)
	templateId?: CardTemplateId; // Defaults to 'basic' if not provided

	// Layout
	scale: number; // 0-1, scales the card template
	width?: number; // Will be calculated from template if not provided
	height?: number; // Will be calculated from template if not provided

	// Background color (applied via mask)
	backgroundColor?: string;

	// Icon at top middle
	iconUrl?: string;
	iconSize?: number; // Relative to card width (0-1)

	// Text elements
	titleText?: string;
	titleFontSize?: number;
	titleColor?: string;
	titlePosition?: 'above-icon' | 'below-icon'; // Where to place title relative to icon

	descriptionText?: string;
	descriptionFontSize?: number;
	descriptionColor?: string;

	// Small icons array (shown below description)
	smallIconUrls?: string[];
	smallIconSize?: number; // Relative to card width (0-1)

	// Optional title text on top of template
	templateTitleText?: string;
	templateTitleFontSize?: number;
	templateTitleColor?: string;

	// Text style
	fontFamily?: string;
}

export default class Card {
	private config: CardConfig;
	private templateImg: HTMLImageElement | null = null;
	private maskImg: HTMLImageElement | null = null;
	private loadedImages: Map<string, HTMLImageElement> = new Map();

	constructor(config: CardConfig) {
		this.config = {
			templateId: CARD_TEMPLATE_IDS.BASIC as CardTemplateId,
			fontFamily: 'Arial, sans-serif',
			titleFontSize: 18,
			titleColor: '#000',
			descriptionFontSize: 14,
			descriptionColor: '#333',
			templateTitleFontSize: 16,
			templateTitleColor: '#fff',
			iconSize: 0.25,
			smallIconSize: 0.08,
			backgroundColor: '#e2dbc8',
			...config,
		};
	}

	/**
	 * Pre-load all images used in the card
	 */
	async loadImages(): Promise<void> {
		// Load template and mask images
		const templateId = this.config.templateId || CARD_TEMPLATE_IDS.BASIC;
		const templateUrl = CARD_TEMPLATES[templateId];
		const maskUrl = CARD_MASKS[templateId];

		if (!templateUrl) {
			throw new Error(`Unknown template: ${templateId}`);
		}
		if (!maskUrl) {
			throw new Error(`Unknown mask for template: ${templateId}`);
		}

		this.templateImg = await this.loadImage(templateUrl);
		this.maskImg = await this.loadImage(maskUrl);

		// Calculate dimensions based on template if not provided
		if (!this.config.width || !this.config.height) {
			const aspectRatio = this.templateImg.width / this.templateImg.height;
			if (!this.config.height) {
				this.config.height = 400; // default height
			}
			if (!this.config.width) {
				this.config.width = this.config.height * aspectRatio;
			}
		}

		// Load other images (gracefully skip if they fail)
		const urlsToLoad = [
			...(this.config.iconUrl ? [this.config.iconUrl] : []),
			...(this.config.smallIconUrls || []),
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
	 * Render the card onto a canvas
	 */
	async render(targetCanvas: HTMLCanvasElement): Promise<void> {
		await this.loadImages();

		if (!this.templateImg) {
			throw new Error('Template image failed to load');
		}

		const ctx = targetCanvas.getContext('2d');
		if (!ctx) throw new Error('Could not get 2D context');

		const w = this.config.width!;
		const h = this.config.height!;

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
		if (this.config.backgroundColor) {
			ctx.fillStyle = this.config.backgroundColor;
			ctx.fillRect(0, 0, w, h);
		}

		// Layer 3: Icon at top middle
		if (this.config.iconUrl) {
			const iconImg = this.loadedImages.get(this.config.iconUrl);
			if (iconImg) {
				const iconSize = w * (this.config.iconSize || 0.25);
				const iconX = (w - iconSize) / 2;
				const iconY = h * 0.15; // Top third of card
				ctx.drawImage(iconImg, iconX, iconY, iconSize, iconSize);
			}
		}

		// Calculate text positioning
		let currentY = h * 0.15; // Start below icon

		// Layer 4: Title text (above or below icon)
		if (this.config.titleText) {
			if (this.config.titlePosition === 'above-icon') {
				currentY = h * 0.1;
			} else {
				currentY = h * 0.45; // Below icon
			}

			ctx.font = `${this.config.titleFontSize}px ${this.config.fontFamily}`;
			ctx.fillStyle = this.config.titleColor!;
			ctx.textAlign = 'center';
			this.drawMultilineText(ctx, this.config.titleText, w / 2, currentY, w * 0.9);
			currentY += (this.config.titleFontSize || 18) + 10;
		}

		// Layer 5: Description text
		if (this.config.descriptionText) {
			ctx.font = `${this.config.descriptionFontSize}px ${this.config.fontFamily}`;
			ctx.fillStyle = this.config.descriptionColor!;
			ctx.textAlign = 'center';
			this.drawMultilineText(ctx, this.config.descriptionText, w / 2, currentY, w * 0.85);
			currentY += (this.config.descriptionFontSize || 14) * 2 + 15;
		}

		// Layer 6: Small icons array
		if (this.config.smallIconUrls && this.config.smallIconUrls.length > 0) {
			const smallIconSize = w * (this.config.smallIconSize || 0.08);
			const totalWidth = this.config.smallIconUrls.length * smallIconSize + (this.config.smallIconUrls.length - 1) * 5;
			const startX = (w - totalWidth) / 2;

			for (let i = 0; i < this.config.smallIconUrls.length; i++) {
				const url = this.config.smallIconUrls[i];
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

		// Layer 8: Optional title text on top of template
		if (this.config.templateTitleText) {
			ctx.font = `${this.config.templateTitleFontSize}px ${this.config.fontFamily}`;
			ctx.fillStyle = this.config.templateTitleColor!;
			ctx.textAlign = 'center';
			ctx.fillText(this.config.templateTitleText, w / 2, h * 0.1);
		}
	}

	/**
	 * Generate a card and return it as a canvas
	 */
	async generateCanvas(): Promise<HTMLCanvasElement> {
		const canvas = document.createElement('canvas');
		await this.render(canvas);
		return canvas;
	}

	/**
	 * Generate a card and return it as an image URL
	 */
	async generateImageUrl(): Promise<string> {
		const canvas = await this.generateCanvas();
		return canvas.toDataURL('image/png');
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
	): void {
		const words = text.split(' ');
		let line = '';
		let lineHeight = this.config.titleFontSize || 18;

		for (const word of words) {
			const testLine = line + (line ? ' ' : '') + word;
			const metrics = ctx.measureText(testLine);

			if (metrics.width > maxWidth && line) {
				ctx.fillText(line, x, y);
				line = word;
				y += lineHeight;
			} else {
				line = testLine;
			}
		}
		ctx.fillText(line, x, y);
	}
}
