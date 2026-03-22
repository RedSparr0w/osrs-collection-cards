import { resolve } from 'path';
import { TIERS } from './Constants';
import HandRenderer from './HandRenderer';
import SaveController from './SaveController';
import Task from './Task';
import TaskManager from './TaskManager';
import UIController, { Sections } from './UIController';
import { delay } from './helpers';

const TIER_WEIGHTS: Record<TIERS, number> = {
	[TIERS.EASY]: 1.1,
	[TIERS.MEDIUM]: 0.7,
	[TIERS.HARD]: 0.4,
	[TIERS.ELITE]: 0.2,
	[TIERS.MASTER]: 0.1,
};

export default class GameManager {
	taskManager: TaskManager;
	private currentHand: Task[] = [];
	handRenderer: HandRenderer;
	ui: UIController;
	saveController: SaveController;

	username: string | null = null;

	constructor() {
		this.taskManager = new TaskManager();
		this.handRenderer = new HandRenderer();
		this.saveController = new SaveController();
		this.ui = new UIController();
	}

	async start(): Promise<void> {
		await this.taskManager.initialize();

		await this.login();
		await this.play();
	}

	async login(): Promise<string> {
		this.username = this.saveController.getCurrentUsername();
		if (!this.username) {
			await this.ui.showSection(Sections.Login);
			return new Promise((resolve) => {
				const form = document.getElementById('login-form') as HTMLFormElement;
				form.addEventListener('submit', (e) => {
					e.preventDefault();
					const input = document.getElementById('username') as HTMLInputElement;
					this.username = input.value.trim();
					if (this.username) {
						this.saveController.setCurrentUsername(this.username);
						resolve(this.username);
					}
				});
			});
		}
		return Promise.resolve(this.username);
	}

	async play(): Promise<void> {
		await this.ui.showSection(Sections.CardGrid);
		await delay(500);
		const tasksToRender = 5;
		await this.deal(tasksToRender);
	}


	getWeightedTasks(): Task[] {
		return this.taskManager.getIncompleteTasks().sort((a, b) => {
			const weightA = TIER_WEIGHTS[a.tier] || 0;
			const weightB = TIER_WEIGHTS[b.tier] || 0;
			return (Math.random() * weightB) - (Math.random() * weightA);
		});
	}

	async deal(count: number): Promise<Task[]> {
		const cardsToDeal = this.getWeightedTasks().splice(0, count);
		for (const [index, task] of cardsToDeal.entries()) {
			this.currentHand.push(task);
			await this.handRenderer.dealCard(task);

			// delay(6000).then(() => {
			// 	this.dispose(task.id);
			// });

			if (index < cardsToDeal.length - 1) {
				await delay(200);
			}
		}
		return cardsToDeal;
	}

	dispose(taskId: string): boolean {
		const index = this.currentHand.findIndex(t => t.id === taskId);
		if (index === -1) return false;
		this.currentHand.splice(index, 1);
		this.handRenderer.discardCard(taskId);
		return true;
	}

	getHand(): Task[] {
		return [...this.currentHand];
	}
}
