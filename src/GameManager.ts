import HandRenderer from './HandRenderer';
import Task from './Task';
import TaskManager from './TaskManager';
import { shuffleArray } from './helpers';

export default class GameManager {
	private taskManager: TaskManager;
	private currentHand: Task[] = [];
	private availableTasks: Task[] = [];
	handRenderer: HandRenderer;


	constructor(taskManager: TaskManager) {
		this.taskManager = taskManager;
    this.reset();
		this.handRenderer = new HandRenderer();
	}

	reset(): void {
		this.availableTasks = this.taskManager.getIncompleteTasks();
	}

	shuffle(): void {
		this.availableTasks = shuffleArray(this.availableTasks);
	}

	async deal(count: number): Promise<Task[]> {
		const dealt = this.availableTasks.splice(0, count);
		this.currentHand.push(...dealt);
		await this.handRenderer.render(this.currentHand, {
			staggerMs: 200,
			flipDelayMs: 3000,
		});
		return dealt;
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
