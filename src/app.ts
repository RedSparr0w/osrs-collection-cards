import TaskManager from "./TaskManager";
import './styles.scss';

window.addEventListener('DOMContentLoaded', async () => {
	const taskManager = new TaskManager();
	const cardGrid = document.getElementById('card-grid');
	const statusText = document.getElementById('status-text');

	if (!cardGrid) {
		console.error('Missing #card-grid container');
		return;
	}

	if (statusText) {
		statusText.textContent = 'Loading tasks...';
	}

	await taskManager.initialize();
	console.log('tasks', taskManager.getTasks());

	const tasks = taskManager.getTasks();
	let activeCard: Awaited<ReturnType<typeof tasks[number]['getCard']>> | null = null;
	let activeCardElement: HTMLElement | null = null;

	const getNumericCssVar = (element: HTMLElement, name: string, fallback = 0): number => {
		const raw = getComputedStyle(element).getPropertyValue(name).trim();
		const value = Number.parseFloat(raw);
		return Number.isFinite(value) ? value : fallback;
	};

	const setActiveSizeForViewport = (element: HTMLElement): void => {
		const currentSize = getNumericCssVar(element, '--active-size', 1) || 1;
		const baseHeight = element.offsetHeight / currentSize;
		if (!baseHeight) {
			return;
		}
		const targetHeight = window.innerHeight * 0.8;
		const nextSize = targetHeight / baseHeight;
		element.style.setProperty('--active-size', `${nextSize}`);
	};

	const clearCenterOffset = (element: HTMLElement): void => {
		element.style.setProperty('--active-x', '0px');
		element.style.setProperty('--active-y', '0px');
		element.style.removeProperty('--active-size');
	};

	const updateCenterOffset = (element: HTMLElement): void => {
		let centerX = element.offsetLeft + element.offsetWidth / 2;
		let centerY = element.offsetTop + element.offsetHeight / 2;
		let parent = element.offsetParent as HTMLElement | null;

		while (parent) {
			centerX += parent.offsetLeft - parent.scrollLeft;
			centerY += parent.offsetTop - parent.scrollTop;
			parent = parent.offsetParent as HTMLElement | null;
		}

		const targetX = window.innerWidth / 2 - centerX;
		const targetY = window.innerHeight / 2 - centerY;
		element.style.setProperty('--active-x', `${targetX}px`);
		element.style.setProperty('--active-y', `${targetY}px`);
	};

	window.addEventListener('resize', () => {
		if (activeCardElement) {
			setActiveSizeForViewport(activeCardElement);
			updateCenterOffset(activeCardElement);
		}
	});

	if (statusText) {
		statusText.textContent = `Rendering ${tasks.length} cards...`;
	}

	let renderedTasks = 0;
	const tasksToRender = 5;
	tasks.sort((a, b) => Math.random() - 0.5); // Shuffle tasks randomly
	tasks.slice(0, tasksToRender).forEach(async (task) => {
		try {
			const card = await task.getCard();
			const cardElement = await card.generateElement();
			card.setFlipped(true);
			cardElement.tabIndex = 0;
			cardElement.setAttribute('role', 'button');
			cardElement.setAttribute('aria-label', `Flip ${task.name}`);
			cardElement.addEventListener('click', () => {
				if (activeCardElement === cardElement) {
					clearCenterOffset(cardElement);
					card.setActive(false);
					activeCard = null;
					activeCardElement = null;
					return;
				}

				if (activeCard && activeCardElement) {
					clearCenterOffset(activeCardElement);
					activeCard.setActive(false);
				}

				setActiveSizeForViewport(cardElement);
				card.setActive(true);
				activeCard = card;
				activeCardElement = cardElement;
				requestAnimationFrame(() => {
					if (activeCardElement === cardElement) {
						updateCenterOffset(cardElement);
						requestAnimationFrame(() => {
							if (activeCardElement === cardElement) {
								updateCenterOffset(cardElement);
							}
						});
					}
				});
			});
			setTimeout(() => cardGrid.appendChild(cardElement), renderedTasks * 200); // Stagger card additions for visual effect
			setTimeout(() =>{
				card.setFlipped(false);
			}, 3000 + renderedTasks * 200); // Stagger card additions for visual effect
			renderedTasks++;
		} catch (error) {
			console.warn(`Failed to render card for task ${task.id}:`, error);
		}
		if (statusText) {
			statusText.textContent = `Rendered ${renderedTasks} of ${tasksToRender} cards...`;
		}
	});


	if (statusText) {
		statusText.textContent = `Rendered ${renderedTasks} cards`;
	}
});
