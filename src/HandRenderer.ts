import Task from './Task';
import CardController from './CardController';
import Card from './Card';
import { delay, getNumericCssVar } from './helpers';
import GameManager from './GameManager';

export default class HandRenderer {
	private cardController: CardController;
	private cardsInHand: Map<string, Card> = new Map();
	private cardElements: Map<string, HTMLElement> = new Map();
	private cardEventListeners: Map<string, Map<string, EventListener>> = new Map();
	private cardGridEl: HTMLElement;
	gameManager: GameManager;

	constructor(gameManager: GameManager) {
		this.gameManager = gameManager;
		const cardGridEl: HTMLElement | null = document.getElementById('card-grid');

		if (!cardGridEl) {
			throw new Error('Missing #card-grid container');
		}

		this.cardGridEl = cardGridEl as HTMLElement;
		this.cardController = new CardController(this.gameManager);
		this.cardController.bindResize();
		window.addEventListener('resize', () => this.layoutCards());
	}

	async dealCard(task: Task, delayMs: number = 0): Promise<void> {
		const flipDelayMs = 50;

		try {
			const card = await task.getCard();
			this.cardsInHand.set(task.id, card);
			const cardElement = await card.getElement();
			this.cardElements.set(task.id, cardElement);
			cardElement.classList.remove('discarded');
			card.setFlipped(true);
			cardElement.tabIndex = 0;
			cardElement.dataset.taskId = task.id;

			// Store event listeners so we can remove them later
			const listeners: Map<string, EventListener> = new Map();

			const onClickListener = () => {
				if (this.cardController.isActive(cardElement)) {
					this.cardController.deactivate();
				} else {
					card.setFlipped(false);
					this.cardController.activate(card, cardElement);
					this.spreadCardsActive(cardElement);
				}
			};
			listeners.set('click', onClickListener as EventListener);
			cardElement.addEventListener('click', onClickListener);

			const onContextMenuListener = (e: MouseEvent) => {
				e.preventDefault();
				if (this.cardController.isActive(cardElement)) {
					this.cardController.deactivate();
				}
				card.toggleFlipped();
			};
			listeners.set('contextmenu', onContextMenuListener as EventListener);
			cardElement.addEventListener('contextmenu', onContextMenuListener);

			const onPointerMoveListener = (e: PointerEvent) => {
				this.updateCardGlowPosition(cardElement, e);
			};
			listeners.set('pointermove', onPointerMoveListener as EventListener);
			cardElement.addEventListener('pointermove', onPointerMoveListener);

			const onMouseEnterListener = () => {
				this.setCardGlowVisibility(cardElement, true);
				if (!this.cardController.activeCardElement) {
					this.spreadCardsAwayFrom(cardElement);
				}
			};
			listeners.set('mouseenter', onMouseEnterListener as EventListener);
			cardElement.addEventListener('mouseenter', onMouseEnterListener);

			const onMouseLeaveListener = () => {
				this.setCardGlowVisibility(cardElement, false);
				if (!this.cardController.activeCardElement) {
					this.layoutCards();
				}
			};
			listeners.set('mouseleave', onMouseLeaveListener as EventListener);
			cardElement.addEventListener('mouseleave', onMouseLeaveListener);

			// Store the listeners for later cleanup
			this.cardEventListeners.set(task.id, listeners);

			await delay(delayMs);
			this.cardGridEl.appendChild(cardElement);
			cardElement.classList.add('is-entering');
			this.placeCardOffscreen(cardElement);
			void cardElement.offsetWidth;
			requestAnimationFrame(() => {
				cardElement.classList.remove('is-entering');
				this.layoutCards();
			});
			setTimeout(() => card.setFlipped(false), flipDelayMs);

		} catch (error) {
			console.warn(`Failed to render card for task ${task.id}:`, error);
		}
	}

	getCard(taskId: string): Card | undefined {
		return this.cardsInHand.get(taskId);
	}

	selectCard(taskId: string): void {
		const card = this.cardsInHand.get(taskId);
		const cardElement = this.cardElements.get(taskId);
		if (!card || !cardElement) return;

		card.setFlipped(false);
		this.cardController.activate(card, cardElement);
		this.spreadCardsActive(cardElement);

		// Keep only the active pointer tracking managed by CardController.
		this.removeCardEventListeners(taskId, cardElement);
	}

	discardCard(taskId: string): void {
		const card = this.cardsInHand.get(taskId);
		const element = this.cardElements.get(taskId);
		if (!card || !element) return;

		if (this.cardController.isActive(element)) {
			this.cardController.deactivate();
		}

		this.removeCardEventListeners(taskId, element);

		this.cardsInHand.delete(taskId);
		this.cardElements.delete(taskId);
		element.classList.add('discarded');
		this.layoutCards();
		setTimeout(() => {
			element.remove();
			// Clean up card references for garbage collection
			card.cleanup();
			this.gameManager.taskManager.getTask(taskId)?.clearCard();
		}, 1000);
	}

	private removeCardEventListeners(taskId: string, cardElement: HTMLElement): void {
		const listeners = this.cardEventListeners.get(taskId);
		if (!listeners) return;

		listeners.forEach((listener, eventType) => {
			cardElement.removeEventListener(eventType, listener);
		});

		this.cardEventListeners.delete(taskId);
	}

	private setCardGlowVisibility(cardElement: HTMLElement, isVisible: boolean): void {
		cardElement.style.setProperty('--shine-opacity', isVisible ? '1' : '0');
	}

	private updateCardGlowPosition(cardElement: HTMLElement, event: PointerEvent): void {
		const rect = cardElement.getBoundingClientRect();
		if (!rect.width || !rect.height) {
			return;
		}

		const x = ((event.clientX - rect.left) / rect.width) * 100;
		const y = ((event.clientY - rect.top) / rect.height) * 100;
		const clampedX = Math.max(0, Math.min(100, x));
		const clampedY = Math.max(0, Math.min(100, y));

		cardElement.style.setProperty('--shine-x', `${clampedX}%`);
		cardElement.style.setProperty('--shine-y', `${clampedY}%`);
		cardElement.style.setProperty('--shine-opacity', '1');
	}

	private placeCardOffscreen(cardElement: HTMLElement): void {
		const cardWidth = cardElement.offsetWidth || 220;
		const cardHeight = cardElement.offsetHeight || 320;
		const left = this.cardGridEl.clientWidth / 2 - cardWidth / 2;
		const top = this.cardGridEl.clientHeight + cardHeight;
		cardElement.style.left = `${left}px`;
		cardElement.style.top = `${top}px`;
	}

	private layoutCards(): void {
		if (this.cardController.activeCardElement) {
			this.spreadCardsActive(this.cardController.activeCardElement);
			return;
		}
		const entries = Array.from(this.cardElements.values()).filter((element) => !element.classList.contains('discarded'));
		const count = entries.length;

		if (count === 0) {
			return;
		}

		const containerWidth = this.cardGridEl.clientWidth;
		const containerHeight = this.cardGridEl.clientHeight;
		const firstCard = entries[0];
		const secondCard = entries[1];
		const cardWidth = Math.min(firstCard?.offsetWidth, secondCard?.offsetWidth) || 220;
		const cardHeight = Math.min(firstCard?.offsetHeight, secondCard?.offsetHeight) || 320;
		const centerIndex = (count - 1) / 2;
		const maxStep = cardWidth * 0.72;
		const availableWidth = Math.max(cardWidth, containerWidth - cardWidth - 32);
		const step = count > 1 ? Math.min(maxStep, availableWidth / (count - 1)) : 0;
		const baseTop = Math.max(16, (containerHeight - cardHeight) / 2 - 12);
		const maxDip = Math.min(36, containerHeight * 0.08);
		const maxRotation = Math.min(14, 8 + count);

		entries.forEach((element, index) => {
			const offsetFromCenter = index - centerIndex;
			const normalized = count > 1 ? offsetFromCenter / centerIndex : 0;
			const left = containerWidth / 2 - cardWidth / 2 + offsetFromCenter * step;
			const dip = Math.abs(normalized) ** 2 * maxDip;
			const top = baseTop + dip;
			const rotate = normalized * maxRotation;
			const zIndex = String(10 + index);

			element.style.left = `${left}px`;
			element.style.top = `${top}px`;
			element.style.zIndex = zIndex;
			element.style.setProperty('--fan-rotate', `${rotate}deg`);
			element.style.setProperty('--fan-dip', `${dip}px`);
		});
	}

	private spreadCardsAwayFrom(hoveredElement: HTMLElement): void {
		const entries = Array.from(this.cardElements.values()).filter((element) => !element.classList.contains('discarded'));
		const count = entries.length;
		const hoveredIndex = entries.indexOf(hoveredElement);

		if (hoveredIndex === -1 || count === 0) return;

		const containerWidth = this.cardGridEl.clientWidth;
		const containerHeight = this.cardGridEl.clientHeight;
		const firstCard = entries[0];
		const secondCard = entries[1];
		const cardWidth = Math.min(firstCard?.offsetWidth, secondCard?.offsetWidth) || 220;
		const cardHeight = Math.min(firstCard?.offsetHeight, secondCard?.offsetHeight) || 320;
		const centerIndex = (count - 1) / 2;
		const maxStep = cardWidth * 0.72;
		const availableWidth = Math.max(cardWidth, containerWidth - cardWidth - 32);
		const step = count > 1 ? Math.min(maxStep, availableWidth / (count - 1)) : 0;
		const baseTop = Math.max(16, (containerHeight - cardHeight) / 2 - 12);
		const maxDip = Math.min(36, containerHeight * 0.08);
		const maxRotation = Math.min(14, 8 + count);
		const spreadAmount = cardWidth * 0.35;

		entries.forEach((element, index) => {
			if (index === hoveredIndex) {
				return;
			}
			const offsetFromCenter = index - centerIndex;
			const normalized = count > 1 ? offsetFromCenter / centerIndex : 0;
			let left = containerWidth / 2 - cardWidth / 2 + offsetFromCenter * step;
			const dip = Math.abs(normalized) ** 2 * maxDip;
			const top = baseTop + dip;
			const rotate = normalized * maxRotation;
			const zIndex = String(10 + index);
			const distanceToMove = spreadAmount / (Math.abs(hoveredIndex - index));

			// Spread immediate neighbors, and cascade the movement to cards beyond them
			if (index < hoveredIndex) {
				left -= distanceToMove;
			} else if (index > hoveredIndex) {
				left += distanceToMove;
			}

			element.style.left = `${left}px`;
			element.style.top = `${top}px`;
			element.style.zIndex = zIndex;
			element.style.setProperty('--fan-rotate', `${rotate}deg`);
			element.style.setProperty('--fan-dip', `${dip}px`);
		});
	}
	private spreadCardsActive(activeElement: HTMLElement): void {
		const entries = Array.from(this.cardElements.values()).filter(
			(el) => !el.classList.contains('discarded')
		);

		const count = entries.length;
		const activeIndex = entries.indexOf(activeElement);

		if (activeIndex === -1 || count < 2) return;

		const containerWidth = this.cardGridEl.clientWidth;
		const containerHeight = this.cardGridEl.clientHeight;

		const firstCard = entries[0];
		const secondCard = entries[1];

		const scale = getNumericCssVar(activeElement, '--active-size', 1) || 1;

		const cardWidth = Math.min(firstCard?.offsetWidth, secondCard?.offsetWidth) || 220;
		const cardHeight = Math.min(firstCard?.offsetHeight, secondCard?.offsetHeight) || 320;

		const maxStep = cardWidth * 0.72;

		const availableWidth = Math.max(cardWidth, containerWidth - (cardWidth * scale) - 32);
		const step = count > 1 ? Math.min(maxStep, availableWidth / (count - 1)) : 0;
		const baseTop = Math.max(16, (containerHeight - cardHeight) / 2 - 12);
		const maxDip = Math.min(36, containerHeight * 0.08);
		const maxRotation = Math.min(14, 8 + count);
		const spreadAmount = cardWidth * 0.35;

		const centerX = containerWidth / 2 - cardWidth / 2;
		entries.forEach((element, index) => {
			if (index === activeIndex) return;

			const distance = index - activeIndex;
			const direction = Math.sign(distance);
			const absDistance = Math.abs(distance);

			let left = centerX;

			left += distance * step;

			if (absDistance > 0) {
				left += direction * (spreadAmount / absDistance);
			}

			const maxDistance = Math.max(activeIndex, count - 1 - activeIndex) || 1;
			const normalized = distance / maxDistance;

			const dip = Math.abs(normalized) ** 2 * maxDip;
			const top = baseTop + dip;
			const rotate = normalized * maxRotation;

			const zIndex = String(100 - absDistance);

			element.style.left = `${left}px`;
			element.style.top = `${top}px`;
			element.style.zIndex = zIndex;
			element.style.setProperty('--fan-rotate', `${rotate}deg`);
			element.style.setProperty('--fan-dip', `${dip}px`);
		});
	}
}
