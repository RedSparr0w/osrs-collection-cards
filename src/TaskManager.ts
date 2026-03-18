import { TASK_STATES, TIERS } from './Constants';
import Task, { TaskInformation, TaskRoot } from './Task';

// TODO: Refactor TaskManager to use a Map for faster lookups and to handle state persistence (local storage or backend)
// TODO: Load task states from local storage or backend on initialization and save state changes accordingly

export default class TaskManager {
    tasks: Map<Task['id'], Task> = new Map();

    constructor() {
        this.loadAllTierData().then(data => {
            this.buildTasksFromTierData(data);
        });
    }

    getTask(id: string): Task | undefined {
        return this.tasks.get(id);
    }

    getTasks(): Task[] {
        return Array.from(this.tasks.values());
    }

    getTasksByTier(tier: TIERS): Task[] {
        return this.getTasks().filter(task => task.tier === tier);
    }

    getCompletedCount() {
        return this.getTasks().filter(task => task.state === TASK_STATES.COMPLETE).length;
    }

    async loadAllTierData(): Promise<TaskRoot[]> {
        const promises = Object.values(TIERS).map(name => fetch(`https://raw.githubusercontent.com/OSRS-Taskman/task-list/refs/heads/main/tiers/${name}.json`).then(r => r.json()));
        return Promise.all(promises);
    }

    buildTasksFromTierData(data: TaskRoot[]): void {
        data.forEach((tierObj: TaskRoot) => {
            tierObj.tasks.forEach((task: TaskInformation) => {
                const taskInstance = Task.from({ ...task, tier: tierObj.name, state: TASK_STATES.INCOMPLETE });
                this.tasks.set(taskInstance.id, taskInstance);
            });
        });
    }

    getState(id: string): TASK_STATES {
        return this.getTask(id)?.state || TASK_STATES.INCOMPLETE;
    }

    setState(id: string, state: TASK_STATES, options = {}): boolean {
        if (this.getState(id) === state) {
            return false;
        }

        const task = this.tasks.get(id);
        if (task) {
            task.state = state;
        }

        // TODO: Save task state to local storage or backend here

        return true;
    }
}