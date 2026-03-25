import Card from './Card';
import GameManager from './GameManager';
import { delay, getNumericCssVar, mapRange } from './helpers';

export default class CardController {
	activeCard: Card | null = null;
	activeCardElement: HTMLElement | null = null;
	gameManager: GameManager;
	private activePointerMoveHandler: ((e: PointerEvent) => void) | null = null;

	constructor(gameManager: GameManager) {
		this.gameManager = gameManager;
	}

  // When selecting a card, it will be the active card
	activate(card: Card, element: HTMLElement): void {
		if (this.activeCard === card && this.activeCardElement === element) {
			this.setActiveSizeForViewport(element);
			card.setActive(true);
			const isSelected = this.gameManager.isTaskSelected(card.config.taskId);
			this.gameManager.ui.setButtonLinks(
				this.gameManager.taskManager.getTask(card.config.taskId)?.wikiLink || '',
				() => {
					if (isSelected) {
						this.gameManager.completeSelectedTask(card.config.taskId);
						return;
					}
					this.gameManager.selectCard(card.config.taskId);
				},
				() => this.gameManager.dispose(card.config.taskId),
				isSelected,
			);

			requestAnimationFrame(() => {
				if (this.activeCardElement !== element) return;
				this.moveToCenter(element);
				this.apply3dTransforms(element);
			});
			return;
		}

		if (this.activeCard && this.activeCardElement) {
			this.clearTransforms(this.activeCardElement);
			this.activeCard.setActive(false);
		}

		this.setActiveSizeForViewport(element);
		card.setActive(true);
		this.activeCard = card;
		this.activeCardElement = element;

		console.debug(`Activated card: ${card.config.title}, wiki: ${this.gameManager.taskManager.getTask(card.config.taskId)?.wikiLink || 'N/A'}	`);
		const isSelected = this.gameManager.isTaskSelected(card.config.taskId);
		this.gameManager.ui.setButtonLinks(
			this.gameManager.taskManager.getTask(card.config.taskId)?.wikiLink || '',
			() => {
				if (isSelected) {
					this.gameManager.completeSelectedTask(card.config.taskId);
					return;
				}
				this.gameManager.selectCard(card.config.taskId);
			},
			() => this.gameManager.dispose(card.config.taskId),
			isSelected,
		);

		requestAnimationFrame(() => {
			if (this.activeCardElement !== element) return;
			this.moveToCenter(element);
			this.apply3dTransforms(element);
		});
	}

  // Remove our active state from the currently active card, if it exists
	deactivate(): void {
		if (this.activeCard && this.gameManager.isTaskSelected(this.activeCard.config.taskId)) {
			return;
		}

		if (this.activePointerMoveHandler) {
			document.body.removeEventListener('pointermove', this.activePointerMoveHandler);
			this.activePointerMoveHandler = null;
		}
		if (this.activeCardElement) {
			this.clearTransforms(this.activeCardElement);
			const oldActiveEl = this.activeCardElement;
			// Temporarily disable pointer events to prevent hover bugs during the transform reset
			oldActiveEl.style.pointerEvents = 'none';
			delay(300).then(() => {
				oldActiveEl.style.pointerEvents = '';
			});
		}
		if (this.activeCard) {
			this.activeCard.setActive(false);
		}
		this.activeCard = null;
		this.activeCardElement = null;
	}

	isActive(element: HTMLElement): boolean {
		return this.activeCardElement === element;
	}

	resizeTimeout: number = 0;
	bindResize(): void {
		window.addEventListener('resize', () => {
			if (this.activeCardElement) {
				clearTimeout(this.resizeTimeout);
				this.resizeTimeout = window.setTimeout(() => {
					if (this.activeCardElement) {
						this.setActiveSizeForViewport(this.activeCardElement);
						this.moveToCenter(this.activeCardElement);
					}
				}, 100);
			}
		});
	}

	private clearTransforms(element: HTMLElement): void {
		element.style.setProperty('--active-x', '0px');
		element.style.setProperty('--active-y', '0px');
		element.style.removeProperty('--active-size');
		element.style.removeProperty('--brightness');
	}

	private setActiveSizeForViewport(element: HTMLElement): void {
		const currentSize = getNumericCssVar(element, '--active-size', 1) || 1;
		const baseHeight = element.offsetHeight / currentSize;
		if (!baseHeight) return;
		const targetHeight = window.innerHeight * 0.7;
		const nextSize = targetHeight / baseHeight;
		element.style.setProperty('--active-size', `${nextSize}`);
	}

	private moveToCenter(element: HTMLElement): void {
		const scale = getNumericCssVar(element, '--active-size', 1)
		const parentRect = (element.offsetParent as HTMLElement).getBoundingClientRect()
		const width = Math.min(Math.max(window.innerWidth * 0.25, 160), 260);
		const height = width * (1.41); // aspect ratio of the card
		const targetX = (parentRect.width - (width * scale)) / 2;
		const targetY = (parentRect.height - (height * scale)) / 2 - 50; // lift it up a bit to fit the buttons below
		element.style.left = `${targetX}px`;
		element.style.top = `${targetY}px`;
	}

	private apply3dTransforms(element: HTMLElement): void {
		const onPointerMove = (e: PointerEvent) => {
			if (this.activeCardElement !== element) {
				document.body.removeEventListener('pointermove', onPointerMove);
				this.activePointerMoveHandler = null;
				element.style.removeProperty('--brightness');
				return;
			}

			const rect = element.getBoundingClientRect();
			const deltaX = e.clientX - rect.left;
			const deltaY = e.clientY - rect.top;
			const ratioX = deltaX / rect.width - 0.5;
			const ratioY = deltaY / rect.height - 0.5;
			const pointerX = mapRange(ratioX, -0.5, 0.5, -1, 1);
			const pointerY = mapRange(ratioY, -0.5, 0.5, -1, 1);
			element.style.setProperty('--pointer-x', `${pointerX}`);
			element.style.setProperty('--pointer-y', `${pointerY}`);
			const brightness = mapRange(ratioY, -0.5, 0.5, 0.95, 1.05);
			element.style.setProperty('--brightness', `${brightness}`);

			const clampedX = Math.max(0, Math.min(100, deltaX / rect.width * 100));
			const clampedY = Math.max(0, Math.min(100, deltaY / rect.height * 100));
			element.style.setProperty('--shine-x', `${clampedX}%`);
			element.style.setProperty('--shine-y', `${clampedY}%`);
			element.style.setProperty('--shine-opacity', '1');
		};

		this.activePointerMoveHandler = onPointerMove;
		document.body.addEventListener('pointermove', onPointerMove);
	}
}
