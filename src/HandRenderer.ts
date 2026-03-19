import Task from './Task';
import CardController from './CardController';

const cardGrid: HTMLElement = document.getElementById('card-grid') as HTMLElement;
const statusText: HTMLElement = document.getElementById('status-text') as HTMLElement;

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export default class HandRenderer {
	private cardController: CardController;

	constructor(cardController: CardController) {
		this.cardController = cardController;
    
    if (!cardGrid) {
      throw new Error('Missing #card-grid container');
    }
    
    if (statusText) statusText.textContent = 'Loading tasks...';
	}

	async render(tasks: Task[], options: { flipDelayMs?: number; staggerMs?: number } = {}): Promise<void> {
		const flipDelayMs = options.flipDelayMs ?? 3000;
		const staggerMs = options.staggerMs ?? 200;
		const total = tasks.length;
		let renderedCount = 0;

		this.setStatus(`Rendering ${total} cards...`);

		for (const task of tasks) {
			try {
				const card = await task.getCard();
				const cardElement = await card.generateElement();
				card.setFlipped(true);
				cardElement.tabIndex = 0;
				cardElement.setAttribute('role', 'button');
				cardElement.setAttribute('aria-label', `Flip ${task.name}`);

				cardElement.addEventListener('click', () => {
					if (this.cardController.isActive(cardElement)) {
						this.cardController.deactivate();
					} else {
						this.cardController.activate(card, cardElement);
					}
				});

				cardGrid.appendChild(cardElement);
				setTimeout(() => card.setFlipped(false), flipDelayMs);
				renderedCount++;
				this.setStatus(`Rendered ${renderedCount} of ${total} cards...`);

				if (staggerMs > 0) {
					await delay(staggerMs);
				}
			} catch (error) {
				console.warn(`Failed to render card for task ${task.id}:`, error);
			}
		}

		this.setStatus(`Rendered ${renderedCount} cards`);
	}

	private setStatus(message: string): void {
		if (statusText) {
			statusText.textContent = message;
		}
	}
}
