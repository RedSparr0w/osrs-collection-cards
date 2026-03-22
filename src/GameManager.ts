import { resolve } from 'path';
import { TIERS } from './Constants';
import HandRenderer from './HandRenderer';
import SaveController from './SaveController';
import Task from './Task';
import TaskManager from './TaskManager';
import UIController, { Sections } from './UIController';
import { delay } from './helpers';
import Wiki from './Wiki';

const TIER_WEIGHTS: Record<TIERS, number> = {
	[TIERS.EASY]: 1.1,
	[TIERS.MEDIUM]: 0.7,
	[TIERS.HARD]: 0.4,
	[TIERS.ELITE]: 0.2,
	[TIERS.MASTER]: 0.1,
};

export default class GameManager {
	taskManager: TaskManager;
	wiki: Wiki;
	private currentHand: Task[] = [];
	handRenderer: HandRenderer;
	ui: UIController;
	saveController: SaveController;

	constructor() {
		this.taskManager = new TaskManager(this);
		this.wiki = new Wiki(this);
		this.handRenderer = new HandRenderer(this);
		this.saveController = new SaveController(this);
		this.ui = new UIController(this);
	}

	async start(): Promise<void> {
		await this.taskManager.initialize();
		await this.wiki.initialize();

		// This will control our basic gameplay flow - login, load data, then play
		await this.login();
		await this.loadData();
		await this.play();
	}

	async login(): Promise<string> {
		const currentUsername = this.saveController.getCurrentUsername();
		if (!currentUsername) {
			await this.ui.showSection(Sections.Login);
			return new Promise((resolve) => {
				const form = document.getElementById('login-form') as HTMLFormElement;
				form.addEventListener('submit', async (e) => {
					e.preventDefault();
					const input = document.getElementById('username') as HTMLInputElement;
					const username = input.value.trim();
					if (username) {
						this.saveController.setCurrentUsername(username);
						await this.ui.hideSection(Sections.Login);
						resolve(username);
					}
				});
			});
		}
		return Promise.resolve(currentUsername);
	}

	async loadData(): Promise<void> {
		const savedState = this.saveController.loadState();
		console.debug('Loaded saved state:', savedState);
		if (savedState) {
			if (savedState.hand) {
				this.currentHand = savedState.hand.map((taskID: string) => this.taskManager.getTask(taskID) ?? null).filter((t: Task | null): t is Task => !!t);
			}
		}
		await this.wiki.loadPlayerData('Zamoraky V');
	}

	saveData(): void {
		console.debug('Saving state:', { hand: this.getHand().map(t => t.id) });
		this.saveController.saveState();
	}

	async play(): Promise<void> {
		await this.ui.showSection(Sections.CardGrid);
		await delay(500);
		this.currentHand = this.currentHand.length ? this.currentHand : this.getWeightedTasks(5);
		this.saveData();
		await this.deal(this.currentHand);
	}

	getWeightedTasks(count: number = 3): Task[] {
		return this.taskManager.getIncompleteTasks().sort((a, b) => {
			const weightA = TIER_WEIGHTS[a.tier] || 0;
			const weightB = TIER_WEIGHTS[b.tier] || 0;
			return (Math.random() * weightB) - (Math.random() * weightA);
		}).slice(0, count);
	}

	async deal(cardsToDeal: Task[]): Promise<Task[]> {
		for (const [index, task] of cardsToDeal.entries()) {
			await this.handRenderer.dealCard(task);

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
		this.saveData();
		return true;
	}

	getHand(): Task[] {
		return [...this.currentHand];
	}
}
