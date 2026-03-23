import { resolve } from 'path';
import { TASK_STATES, TIERS } from './Constants';
import HandRenderer from './HandRenderer';
import SaveController from './SaveController';
import Task from './Task';
import TaskManager from './TaskManager';
import UIController, { Sections } from './UIController';
import { delay, xpToLevel } from './helpers';
import Wiki, { defaultPlayerData, PlayerData } from './Wiki';

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
	private selectedTaskId: string | null = null;
	handRenderer: HandRenderer;
	ui: UIController;
	saveController: SaveController;
	playerData: PlayerData = defaultPlayerData;

	constructor() {
		this.wiki = new Wiki(this);
		this.taskManager = new TaskManager(this);
		this.handRenderer = new HandRenderer(this);
		this.saveController = new SaveController(this);
		this.ui = new UIController(this);
	}

	async start(): Promise<void> {
		this.ui.initialize();
		await this.wiki.initialize();
		await this.taskManager.initialize();

		// This will control our basic gameplay flow - login, load data, then play
		await this.login();
		this.ui.loadSettings();
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
		this.applySavedTaskState(savedState.completedTaskIds);
		await this.refreshPlayerTaskCompletionState(!savedState.completionDetectionInitialized);

		if (savedState.hand) {
			this.currentHand = savedState.hand
				.map((taskID: string) => this.taskManager.getTask(taskID) ?? null)
				.filter((task: Task | null): task is Task => !!task && task.state !== TASK_STATES.COMPLETE);
		}

		this.saveData();
	}

	saveData(): void {
		this.saveController.saveState();
		this.ui.refreshTaskBrowser();
	}

	async play(): Promise<void> {
		await this.ui.showSection(Sections.CardGrid);
		await delay(500);
		this.currentHand = this.currentHand.length ? this.currentHand : this.getWeightedTasks(5);
		this.saveData();
		await this.deal(this.currentHand);
		if (this.currentHand.length === 1) {
			this.selectCard(this.currentHand[0].id);
		}
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

	selectCard(taskId: string): void {
		const task = this.currentHand.find(t => t.id === taskId);
		if (!task) {
			console.warn(`Tried to select task with ID ${taskId} but it was not found in the current hand.`);
			return;
		}

		this.selectedTaskId = taskId;
		this.handRenderer.selectCard(taskId);

		const selectedIndex = this.currentHand.findIndex(t => t.id === taskId);
		const cardsToDispose = this.currentHand
			.map((t, index) => ({ task: t, index }))
			.filter(({ task }) => task.id !== taskId)
			.sort((a, b) => Math.abs(b.index - selectedIndex) - Math.abs(a.index - selectedIndex))
			.map(({ task }) => task);

		cardsToDispose.forEach((t, index) => {
				window.setTimeout(() => {
					void this.dispose(t.id);
				}, 350 * (index + 1));
			});
	}

	completeSelectedTask(taskId: string): void {
		if (!this.taskManager.setState(taskId, TASK_STATES.COMPLETE)) {
			return;
		}

		void this.dispose(taskId);
	}

	isTaskSelected(taskId: string): boolean {
		return this.selectedTaskId === taskId;
	}

	async dispose(taskId: string): Promise<boolean> {
		const index = this.currentHand.findIndex(t => t.id === taskId);
		if (index === -1) return false;
		this.currentHand.splice(index, 1);
		if (this.selectedTaskId === taskId) {
			this.selectedTaskId = null;
		}
		this.handRenderer.discardCard(taskId);
		this.saveData();
		if (this.currentHand.length === 0) {
			// If we've discarded all our cards, deal a new hand after a short delay
			await delay(1000);
			await this.refreshPlayerTaskCompletionState(true);
			await this.play();
		}
		return true;
	}

	getHand(): Task[] {
		return [...this.currentHand];
	}

	private applySavedTaskState(completedTaskIds: string[]): void {
		completedTaskIds.forEach((taskId) => {
			this.taskManager.setState(taskId, TASK_STATES.COMPLETE);
		});
	}

	private async refreshPlayerTaskCompletionState(forceRefresh: boolean): Promise<void> {
		const currentUsername = this.saveController.getCurrentUsername();
		if (!currentUsername) {
			return;
		}

		const playerData = await this.wiki.loadPlayerData(currentUsername, { forceRefresh });
		if (!playerData) {
			return;
		}

		this.playerData = playerData;
		const detectedCompletedTaskIds = this.detectCompletedTasksFromPlayerData();
		if (detectedCompletedTaskIds.length > 0) {
			console.debug('Detected completed tasks from collection log', detectedCompletedTaskIds);
		}

		if (forceRefresh) {
			this.currentHand = this.currentHand.filter((task) => task.state !== TASK_STATES.COMPLETE);
		}

		this.saveController.setCompletionDetectionInitialized(true);
	}

	private detectCompletedTasksFromPlayerData(): string[] {
		const achievementDiaries = this.playerData.achievementDiaries;
		const obtainedItemIds = this.playerData.obtainedItemIds;
		const skills = this.playerData.skills;

		return this.taskManager.getIncompleteTasks().reduce<string[]>((completedTaskIds, task) => {
			// Nothing we can verify for this task, skip it
			if (!task.verification || !task.verification.method) {
				return completedTaskIds;
			}

			// Check achievement diary task
			if (task.verification.method === 'achievement_diary' && task.verification.region && task.verification.difficulty) {
				const regionValues = achievementDiaries[this.normalizeAchievementKey(task.verification.region)] ?? {};
				if (!regionValues) {
					console.warn('Player data is missing expected achievement diary region', this.normalizeAchievementKey(task.verification.region), task, { obtainedItemIds, achievementDiaries });
					return completedTaskIds;
				}

				const difficultyValue = regionValues[this.normalizeAchievementKey(task.verification.difficulty)];
				if (!difficultyValue) {
					console.warn('Player data is missing expected achievement diary', this.normalizeAchievementKey(task.verification.region), 'difficulty', this.normalizeAchievementKey(task.verification.difficulty), task, { obtainedItemIds, achievementDiaries });
					return completedTaskIds;
				}

				if (!difficultyValue.complete) {
					return completedTaskIds;
				}

				this.taskManager.setState(task.id, TASK_STATES.COMPLETE);
				completedTaskIds.push(task.id);
				return completedTaskIds;
			}

			// Check item collection task
			if (task.verification.method === 'item_collection' && task.verification.itemIds && task.verification.itemIds.length > 0) {
				const itemIds = task.verification.itemIds;
				const requiredCount = task.verification?.count ?? itemIds.length;
				const obtainedCount = itemIds.filter((itemId) => obtainedItemIds.has(itemId)).length;
				if (obtainedCount < requiredCount) {
					return completedTaskIds;
				}

				if (this.taskManager.setState(task.id, TASK_STATES.COMPLETE)) {
					completedTaskIds.push(task.id);
					return completedTaskIds;
				}
			}

			// Check skill level task
			if (task.verification.method === 'skill' && task.verification.experience) {
				const skillsMet = Object.entries(task.verification.experience).filter(([skill, xp]) => {
					const playerSkillLevel = skills[this.normalizeAchievementKey(skill)] ?? 0;
					const requiredLevel = xpToLevel(xp);
					if (playerSkillLevel < requiredLevel) {
						return false;
					}
					return true;
				});

				// Check how many skills meet requirements, if we meet the count requirement then mark task as complete
				if (skillsMet.length >= (task.verification.count ?? 0)) {
					this.taskManager.setState(task.id, TASK_STATES.COMPLETE);
					completedTaskIds.push(task.id);
					return completedTaskIds;
				}
			}

			return completedTaskIds;
		}, []);
	}

	private normalizeAchievementKey(value: string): string {
		return value
			.toLowerCase()
			.replace(/[-_]+/g, ' ')
			.replace(/\band\b/g, '&');
	}
}
