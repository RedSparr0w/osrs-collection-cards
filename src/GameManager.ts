import Task from './Task';
import TaskManager from './TaskManager';
import { shuffleArray } from './helpers';

export default class GameManager {
	private taskManager: TaskManager;
	private currentHand: Task[] = [];
	private availableTasks: Task[] = [];

	constructor(taskManager: TaskManager) {
		this.taskManager = taskManager;
    this.reset();
	}

	reset(): void {
		this.availableTasks = this.taskManager.getIncompleteTasks();
	}

	shuffle(): void {
		this.availableTasks = shuffleArray(this.availableTasks);
	}

	deal(count: number): Task[] {
		const dealt = this.availableTasks.splice(0, count);
		this.currentHand.push(...dealt);
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
