/**
 * Card type definitions and defaults.
 * Each type owns its template, and style preset.
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
	config: CardTypeConfig;
}

export const CARD_TYPE = {
	BASIC: {
		template: './images/CardTemplate_Basic.png',
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
	private static sharedLoadedImages: Map<string, HTMLImageElement> = new Map();
	private loadedImages: Map<string, HTMLImageElement> = new Map();
	private width: number = 0;
	private height: number = 0;
	private cachedElement: HTMLElement | null = null;

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
			if (!url) {
				reject(new Error('Missing image URL'));
				return;
			}

			if (this.loadedImages.has(url)) {
				resolve(this.loadedImages.get(url)!);
				return;
			}

			if (Card.sharedLoadedImages.has(url)) {
				const cached = Card.sharedLoadedImages.get(url)!;
				this.loadedImages.set(url, cached);
				resolve(cached);
				return;
			}

			const img = new Image();
			img.onload = () => {
				this.loadedImages.set(url, img);
				Card.sharedLoadedImages.set(url, img);
				resolve(img);
			};
			img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
			img.loading = 'eager';
			img.src = url;
		});
	}

	/**
	 * Generate and cache an HTML element for this card.
	 */
	async generateElement(): Promise<HTMLElement> {
		if (this.cachedElement) {
			return this.cachedElement;
		}

		await this.loadImages();

		if (!this.templateImg) {
			throw new Error('Template image failed to load');
		}

		const style = this.type.config;
		const root = document.createElement('article');
		root.className = 'task-card';
		root.style.setProperty('--card-bg', style.backgroundColor);
		root.style.setProperty('--card-title-color', style.titleColor);
		root.style.setProperty('--card-desc-color', style.descriptionColor);
		root.style.setProperty('--card-category-color', style.categoryColor);
		root.style.setProperty('--card-title-size', `${style.titleFontSize}px`);
		root.style.setProperty('--card-desc-size', `${style.descriptionFontSize}px`);
		root.style.setProperty('--card-category-size', `${style.categoryFontSize}px`);
		root.style.setProperty('--card-font-title', style.titleFontFamily);
		root.style.setProperty('--card-font-body', style.descriptionFontFamily);
		root.style.setProperty('--card-icon-size', `${Math.round(style.iconSize * 100)}%`);
		root.style.setProperty('--card-small-icon-size', `${Math.max(26, Math.round(this.width * style.smallIconSize * 0.26))}px`);

		if (this.width > 0 && this.height > 0) {
			root.style.aspectRatio = `${this.width} / ${this.height}`;
		}

		const content = document.createElement('div');
		content.className = 'content';

		if (this.config.icon) {
			const iconImg = this.loadedImages.get(this.config.icon);
			if (iconImg) {
				const icon = document.createElement('img');
				icon.className = 'icon';
				icon.loading = 'lazy';
				icon.decoding = 'async';
				icon.src = iconImg.src;
				icon.alt = this.config.title ? `${this.config.title} icon` : 'Task icon';
				content.appendChild(icon);
			}
		}

		if (this.config.title) {
			const title = document.createElement('h3');
			title.className = 'title';
			title.textContent = this.config.title;
			content.appendChild(title);
		}

		if (this.config.description) {
			const description = document.createElement('p');
			description.className = 'description';
			description.innerHTML = this.config.description.replace(/ Step/g, '<br/>Step');
			content.appendChild(description);
		}

		const smallIconUrls = (this.config.smallIcons || []).filter(Boolean);
		if (smallIconUrls.length > 0) {
			const smallIcons = document.createElement('div');
			smallIcons.className = 'small-icons';
			smallIconUrls.forEach(url => {
				const iconImg = this.loadedImages.get(url);
				if (!iconImg) return;

				const img = document.createElement('img');
				img.className = 'small-icon';
				img.loading = 'lazy';
				img.decoding = 'async';
				img.src = iconImg.src;
				img.alt = 'Requirement item icon';
				smallIcons.appendChild(img);
			});

			if (smallIcons.childElementCount > 0) {
				content.appendChild(smallIcons);
			}
		}

		root.appendChild(content);

		const templateOverlay = document.createElement('img');
		templateOverlay.className = 'template';
		templateOverlay.loading = 'eager';
		templateOverlay.decoding = 'async';
		templateOverlay.src = this.templateImg.src;
		templateOverlay.alt = '';
		templateOverlay.ariaHidden = 'true';
		root.appendChild(templateOverlay);

		if (this.config.category) {
			const category = document.createElement('div');
			category.className = 'category';
			category.textContent = this.config.category;
			root.appendChild(category);
		}

		this.cachedElement = root;
		return root;
	}
}
