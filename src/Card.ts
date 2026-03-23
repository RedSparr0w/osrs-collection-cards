import { url } from "inspector";
import GameManager from "./GameManager";


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
	back: string;
	mask: string;
	config: CardTypeConfig;
}

export const CARD_TYPE = {
	BASIC: {
		template: './images/CardTemplate_Basic.png',
		back: './images/CardBack_Basic.png',
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
	taskId: string;
	type?: CardTypeDefinition;
	title?: string;
	description?: string;
	icon?: string;
	smallIcons?: number[];
	category?: string;
	flipped?: boolean;
	active?: boolean;
	requiredCount?: number;
}

export default class Card {
	config: CardConfig;
	private type: CardTypeDefinition;
	private templateImg: HTMLImageElement | null = null;
	private backImg: HTMLImageElement | null = null;
	private width: number = 0;
	private height: number = 0;
	private cachedElement: HTMLElement | null = null;
	private gameManager: GameManager;

	constructor(config: CardConfig, gameManager: GameManager) {
		this.gameManager = gameManager;
		this.type = config.type ?? CARD_TYPE.BASIC;
		this.config = {
			...config,
			type: this.type,
		};
	}

	/**
	 * Clean up all references to allow garbage collection.
	 * Call this when the card is being discarded.
	 */
	cleanup(): void {
		// Clear cached element
		this.cachedElement = null;

		// Image loaders are already nulled after getElement() builds the DOM,
		// but guard here in case cleanup() is called before getElement() finishes.
		this.templateImg = null;
		this.backImg = null;

		// Clear gameManager reference to break circular dependencies
		(this.gameManager as any) = null;
	}

	setFlipped(flipped: boolean): void {
		this.config.flipped = flipped;
		if (this.cachedElement) {
			this.cachedElement.classList.toggle('is-flipped', flipped);
		}
	}

	toggleFlipped(): void {
		this.setFlipped(!this.config.flipped);
	}

	setActive(active: boolean): void {
		this.config.active = active;
		if (this.cachedElement) {
			this.cachedElement.classList.toggle('is-active', active);
		}
	}

	toggleActive(): void {
		this.setActive(!this.config.active);
	}


	/**
	 * Pre-load all images used in the card
	 */
	async loadImages(): Promise<void> {
		this.templateImg = await this.loadImage(this.type.template);
		this.backImg = await this.loadImage(this.type.back);

		if (!this.width || !this.height) {
			const aspectRatio = this.templateImg.width / this.templateImg.height;
			this.height = this.type.config.defaultHeight;
			this.width = this.height * aspectRatio;
		}
	}

	/**
	 * Load a single image by URL
	 */
	private loadImage(url: string): Promise<HTMLImageElement> {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => resolve(img);
			img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
			img.loading = 'eager';
			img.src = url;
		});
	}

	/**
	 * Generate and cache an HTML element for this card.
	 */
	async getElement(): Promise<HTMLElement> {
		if (this.cachedElement) {
			return this.cachedElement;
		}

		this.cachedElement = null;

		await this.loadImages();

		if (!this.templateImg) {
			throw new Error('Template image failed to load');
		}

		if (!this.backImg) {
			throw new Error('Back image failed to load');
		}

		const style = this.type.config;
		const root = document.createElement('article');
		root.className = 'task-card';
		root.classList.toggle('is-flipped', Boolean(this.config.flipped));
		root.classList.toggle('is-active', Boolean(this.config.active));
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

		if (this.width > 0 && this.height > 0) {
			root.style.aspectRatio = `${this.width} / ${this.height}`;
		}

		if (this.type.mask) {
			root.style.maskImage = `url(${this.type.mask})`;
			root.style.maskRepeat = 'no-repeat';
			root.style.maskPosition = 'center';
			root.style.maskSize = '100% 100%';
		}

		const rotator = document.createElement('div');
		rotator.className = 'card-rotator';

		const frontFace = document.createElement('div');
		frontFace.className = 'card-face card-face--front';

		const content = document.createElement('div');
		content.className = 'content';

		if (this.config.icon) {
			const icon = document.createElement('img');
			icon.className = 'icon';
			icon.loading = 'eager';
			icon.decoding = 'async';
			icon.onerror = () => {
				icon.src = 'https://oldschool.runescape.wiki/images/Cake_of_guidance.png';
				icon.alt = 'Task icon failed to load';
			}
			icon.src = this.config.icon;
			icon.alt = this.config.title ? `${this.config.title} icon` : 'Task icon';
			content.appendChild(icon);
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

		// If we have a required count, show the obtained count vs required count
		if (this.config.requiredCount) {
			const obtainedCount = Array.from(this.gameManager.playerData?.obtainedItemIds ?? []).filter(id => this.config.smallIcons?.includes(Number(id))).length;
			const requiredCount = document.createElement('p');
			requiredCount.className = 'description';
			requiredCount.textContent = `Obtained Count: ${obtainedCount}/${this.config.requiredCount}`;
			content.appendChild(requiredCount);
		}

		// TODO: Other tasks such as level 99s

		if (this.config.smallIcons?.length ?? 0 > 0) {
			const smallIcons = document.createElement('div');
			smallIcons.className = 'small-icons';
			this.config.smallIcons?.forEach(id => {
				const url = this.gameManager.wiki.getCollectionLogEntry(id)?.iconUrl || '';
				const img = document.createElement('img');
				img.className = `small-icon ${this.gameManager.playerData?.obtainedItemIds.has(id) ? 'obtained' : 'missing'}`;
				img.loading = 'eager';
				img.decoding = 'async';
				img.dataset.itemName = this.gameManager.wiki.getCollectionLogEntry(id)?.name || '';
				img.dataset.itemId = String(id);
				img.onerror = () => {
					img.src = 'https://oldschool.runescape.wiki/images/Cake_of_guidance.png';
					img.alt = 'Requirement item icon failed to load';
				}
				img.src = url;
				img.alt = this.gameManager.wiki.getCollectionLogEntry(id)?.name || 'Requirement item icon';
				smallIcons.appendChild(img);
			});

			if (smallIcons.childElementCount > 0) {
				content.appendChild(smallIcons);
			}
		}
		

		frontFace.appendChild(content);

		const templateOverlay = document.createElement('img');
		templateOverlay.className = 'template';
		templateOverlay.loading = 'eager';
		templateOverlay.decoding = 'async';
		templateOverlay.src = this.templateImg.src;
		templateOverlay.alt = '';
		templateOverlay.ariaHidden = 'true';
		frontFace.appendChild(templateOverlay);

		if (this.config.category) {
			const category = document.createElement('div');
			category.className = 'category';
			category.textContent = this.config.category;
			frontFace.appendChild(category);
		}

		// TODO: this is our "shiny" effect, lets fix/implement this later
		// const watermark = document.createElement('div');
		// watermark.className = 'watermark';
		// frontFace.appendChild(watermark);
		// const refraction = document.createElement('div');
		// refraction.className = 'refraction';
		// watermark.appendChild(refraction.cloneNode() as HTMLElement);
		// watermark.appendChild(refraction.cloneNode() as HTMLElement);

		const backFace = document.createElement('div');
		backFace.className = 'card-face card-face--back';

		const backImage = document.createElement('img');
		backImage.className = 'card-back-image';
		backImage.loading = 'eager';
		backImage.decoding = 'async';
		backImage.src = this.backImg.src;
		backFace.appendChild(backImage);

		rotator.appendChild(frontFace);
		rotator.appendChild(backFace);
		root.appendChild(rotator);

		this.cachedElement = root;

		// Release the temporary HTMLImageElement loaders — we only needed them to
		// read dimensions and copy src strings. They are never attached to the DOM,
		// so holding them would cause detached-node leaks in the heap profiler.
		this.templateImg = null;
		this.backImg = null;

		return root;
	}
}
