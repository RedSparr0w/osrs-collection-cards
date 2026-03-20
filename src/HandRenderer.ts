import Task from './Task';
import CardController from './CardController';
import Card from './Card';
import { delay } from './helpers';

export default class HandRenderer {
	private cardController: CardController;
	private cardsInHand: Map<string, Card> = new Map();
	private cardElements: Map<string, HTMLElement> = new Map();
	private cardGridEl: HTMLElement;

	constructor() {
		const cardGridEl = document.getElementById('card-grid');

		if (!cardGridEl) {
			throw new Error('Missing #card-grid container');
		}

		this.cardGridEl = cardGridEl as HTMLElement;
		this.cardController = new CardController();
		this.cardController.bindResize();
		window.addEventListener('resize', () => this.layoutCards());
	}

	async dealCard(task: Task, delayMs: number = 0): Promise<void> {
		const flipDelayMs = 3000;

		try {
			const card = await task.getCard();
			this.cardsInHand.set(task.id, card);
			const cardElement = await card.getElement();
			this.cardElements.set(task.id, cardElement);
			card.setFlipped(true);
			cardElement.tabIndex = 0;
			cardElement.dataset.taskId = task.id;

			cardElement.addEventListener('click', () => {
				if (this.cardController.isActive(cardElement)) {
					this.cardController.deactivate();
				} else {
					card.setFlipped(false);
					this.cardController.activate(card, cardElement);
				}
			});

			cardElement.addEventListener('contextmenu', (e: MouseEvent) => {
				e.preventDefault();
				if (this.cardController.isActive(cardElement)) {
					this.cardController.deactivate();
				}
				card.toggleFlipped();
			});

			cardElement.addEventListener('mousedown', (e: MouseEvent) => {
				if (e.button === 1) { // Middle click to discard
					e.preventDefault();
					this.discardCard(task.id);
				}
			});

			cardElement.addEventListener('mouseenter', () => {
				if (!this.cardController.activeCardElement) {
					this.spreadCardsAwayFrom(cardElement);
				}
			});

			cardElement.addEventListener('mouseleave', () => {
				if (!this.cardController.activeCardElement) {
					this.layoutCards();
				}
			});

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

	discardCard(taskId: string): void {
		const card = this.cardsInHand.get(taskId);
		const element = this.cardElements.get(taskId);
		if (!card || !element) return;

		if (this.cardController.isActive(element)) {
			this.cardController.deactivate();
		}

		this.cardsInHand.delete(taskId);
		this.cardElements.delete(taskId);
		element.classList.add('discarded');
		this.layoutCards();
		setTimeout(() => {
			element.remove();
		}, 1000);
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
		const entries = Array.from(this.cardElements.values()).filter((element) => !element.classList.contains('discarded'));
		const count = entries.length;

		if (count === 0) {
			return;
		}

		const containerWidth = this.cardGridEl.clientWidth;
		const containerHeight = this.cardGridEl.clientHeight;
		const firstCard = entries[0];
		const cardWidth = firstCard.offsetWidth || 220;
		const cardHeight = firstCard.offsetHeight || 320;
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
		const cardWidth = firstCard.offsetWidth || 220;
		const cardHeight = firstCard.offsetHeight || 320;
		const centerIndex = (count - 1) / 2;
		const maxStep = cardWidth * 0.72;
		const availableWidth = Math.max(cardWidth, containerWidth - cardWidth - 32);
		const step = count > 1 ? Math.min(maxStep, availableWidth / (count - 1)) : 0;
		const baseTop = Math.max(16, (containerHeight - cardHeight) / 2 - 12);
		const maxDip = Math.min(36, containerHeight * 0.08);
		const maxRotation = Math.min(14, 8 + count);
		const spreadAmount = cardWidth * 0.35;

		entries.forEach((element, index) => {
			const offsetFromCenter = index - centerIndex;
			const normalized = count > 1 ? offsetFromCenter / centerIndex : 0;
			let left = containerWidth / 2 - cardWidth / 2 + offsetFromCenter * step;
			const dip = Math.abs(normalized) ** 2 * maxDip;
			const top = baseTop + dip;
			const rotate = normalized * maxRotation;
			const zIndex = String(10 + index);

			// Spread immediate neighbors, and cascade the movement to cards beyond them
			if (index < hoveredIndex) {
				left -= spreadAmount / (Math.abs(hoveredIndex - index));
			} else if (index > hoveredIndex) {
				left += spreadAmount / (Math.abs(hoveredIndex - index));
			}

			element.style.left = `${left}px`;
			element.style.top = `${top}px`;
			element.style.zIndex = zIndex;
			element.style.setProperty('--fan-rotate', `${rotate}deg`);
			element.style.setProperty('--fan-dip', `${dip}px`);
		});
	}
}
