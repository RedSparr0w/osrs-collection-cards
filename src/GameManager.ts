import { resolve } from 'path';
import { TIERS } from './Constants';
import HandRenderer from './HandRenderer';
import SaveController from './SaveController';
import Task from './Task';
import TaskManager from './TaskManager';
import UIController, { Sections } from './UIController';
import { delay } from './helpers';
import Wiki, { PlayerData } from './Wiki';

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
	playerData: PlayerData | null = null;

	constructor() {
		this.wiki = new Wiki(this);
		this.taskManager = new TaskManager(this);
		this.handRenderer = new HandRenderer(this);
		this.saveController = new SaveController(this);
		this.ui = new UIController(this);
	}

	async start(): Promise<void> {
		await this.wiki.initialize();
		await this.taskManager.initialize();

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
		if (savedState) {
			if (savedState.hand) {
				this.currentHand = savedState.hand.map((taskID: string) => this.taskManager.getTask(taskID) ?? null).filter((t: Task | null): t is Task => !!t);
			}
		}
		const currentUsername = this.saveController.getCurrentUsername() as string;
		this.playerData = await this.wiki.loadPlayerData(currentUsername);
	}

	saveData(): void {
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
		let verifiedTasks: Task[] = [];
		let rolls = 0
		while (verifiedTasks.length < count) {
			if (rolls >= 10) {
				console.warn('Max rolls reached while trying to get weighted tasks, returning current selection.', { verifiedTasks, rolls });
				// Only allow x rerolls to prevent infinite loops, can adjust as needed
				break;
			}
			let weightedTasks = this.taskManager.getIncompleteTasks().sort((a, b) => {
				const weightA = TIER_WEIGHTS[a.tier] || 0;
				const weightB = TIER_WEIGHTS[b.tier] || 0;
				return (Math.random() * weightB) - (Math.random() * weightA);
			}).slice(0, count - verifiedTasks.length);

			weightedTasks = weightedTasks.map(task => {
				if (task.verification) {
					if (task.verification.itemIds) {
						let relatedTasks = this.taskManager.getIncompleteTasks().filter(t => t.verification?.itemIds?.every(id => task.verification.itemIds?.includes(id)));
						if (relatedTasks.length) {
							relatedTasks = relatedTasks.sort((a, b) => {
								return (a.verification?.count || 1e9) - (b.verification?.count || 1e9);
							});
						}
						return relatedTasks[0] || task;
					}
				}
				return task;
			});

			// Remove duplicates while preserving order
			weightedTasks = Array.from(new Set(weightedTasks));
			verifiedTasks.push(...weightedTasks);
			rolls++;
		}
		return verifiedTasks.slice(0, count);
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
