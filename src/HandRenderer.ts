import Task from './Task';
import CardController from './CardController';
import Card from './Card';

const cardGridEl: HTMLElement = document.getElementById('card-grid') as HTMLElement;
const statusTextEl: HTMLElement = document.getElementById('status-text') as HTMLElement;

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export default class HandRenderer {
	cardController: CardController;
	cardsInHand: Map<string, Card> = new Map();

	constructor() {
		this.cardController = new CardController();
		this.cardController.bindResize();
    
    if (!cardGridEl) {
      throw new Error('Missing #card-grid container');
    }
    
    if (statusTextEl) statusTextEl.textContent = 'Loading tasks...';
	}

	async dealCard(task: Task, staggerMs: number = 0): Promise<void> {
		const flipDelayMs = 3000;

		try {
			const card = await task.getCard();
			this.cardsInHand.set(task.id, card);
			const cardElement = await card.getElement();
			card.setFlipped(true);
			cardElement.tabIndex = 0;

			cardElement.addEventListener('click', () => {
				if (this.cardController.isActive(cardElement)) {
					this.cardController.deactivate();
				} else {
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

			await delay(staggerMs);
			cardGridEl.appendChild(cardElement);
			setTimeout(() => card.setFlipped(false), flipDelayMs);

			return card;

		} catch (error) {
			console.warn(`Failed to render card for task ${task.id}:`, error);
		}
	}

	getCard(taskId: string): Card | undefined {
		return this.cardsInHand.get(taskId);
	}

	discardCard(taskId: string): void {
		const card = this.cardsInHand.get(taskId);
		if (!card) return;
		this.cardsInHand.delete(taskId);
		card.getElement().then(el => {
			el.classList.add('discarded');
			setTimeout(() => {
				el.remove();
			}, 2000);
		});
	}
}
