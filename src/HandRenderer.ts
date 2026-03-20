import Task from './Task';
import CardController from './CardController';
import Card from './Card';

const cardGridEl: HTMLElement = document.getElementById('card-grid') as HTMLElement;
const statusTextEl: HTMLElement = document.getElementById('status-text') as HTMLElement;

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export default class HandRenderer {
	cardController: CardController;
	cardsInHand: Card[] = [];

	constructor() {
		this.cardController = new CardController();
		this.cardController.bindResize();
    
    if (!cardGridEl) {
      throw new Error('Missing #card-grid container');
    }
    
    if (statusTextEl) statusTextEl.textContent = 'Loading tasks...';
	}

	async dealCard(task: Task, delay: number): Promise<void> {
		setTimeout(async () => {
			return await this.render([task]);
		}, delay);
	}

	async render(tasks: Task[], options: { flipDelayMs?: number; staggerMs?: number } = {}): Promise<void> {
		const flipDelayMs = options.flipDelayMs ?? 3000;
		const staggerMs = options.staggerMs ?? 200;
		const total = tasks.length;
		let renderedCount = 0;

		for (const task of tasks) {
			try {
				const card = await task.getCard();
				this.cardsInHand.push(card);
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

				cardGridEl.appendChild(cardElement);
				setTimeout(() => card.setFlipped(false), flipDelayMs);
				renderedCount++;

				if (staggerMs > 0) {
					await delay(staggerMs);
				}
			} catch (error) {
				console.warn(`Failed to render card for task ${task.id}:`, error);
			}
		}
	}

	private setStatus(message: string): void {
		if (statusTextEl) {
			statusTextEl.textContent = message;
		}
	}
}
