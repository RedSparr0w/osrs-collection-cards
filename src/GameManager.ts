import { TIERS } from './Constants';
import HandRenderer from './HandRenderer';
import Task from './Task';
import TaskManager from './TaskManager';
import { shuffleArray } from './helpers';

const TIER_WEIGHTS: Record<TIERS, number> = {
	[TIERS.EASY]: 1.1,
	[TIERS.MEDIUM]: 0.7,
	[TIERS.HARD]: 0.4,
	[TIERS.ELITE]: 0.2,
	[TIERS.MASTER]: 0.1,
};

export default class GameManager {
	private taskManager: TaskManager;
	private currentHand: Task[] = [];
	handRenderer: HandRenderer;


	constructor(taskManager: TaskManager) {
		this.taskManager = taskManager;
		this.handRenderer = new HandRenderer();
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
		cardsToDeal.forEach(async (task, index) => {
			this.currentHand.push(task);
			await this.handRenderer.dealCard(task, index * 200);
		});
		return cardsToDeal;
	}

	dispose(taskId: string): boolean {
		const index = this.currentHand.findIndex(t => t.id === taskId);
		if (index === -1) return false;
		this.currentHand.splice(index, 1);
		return true;
	}

	getHand(): Task[] {
		return [...this.currentHand];
	}
}
