import { TASK_STATES, TIERS } from './Constants';
import GameManager from './GameManager';
import Task, { TaskInformation, TaskRoot } from './Task';

// TODO: Refactor TaskManager to use a Map for faster lookups and to handle state persistence (local storage or backend)
// TODO: Load task states from local storage or backend on initialization and save state changes accordingly

export default class TaskManager {
    tasks: Map<Task['id'], Task> = new Map();
    private isLoaded = false;
    private loadPromise: Promise<void> | null = null;
    gameManager: GameManager;

    constructor(gameManager: GameManager) {
        this.gameManager = gameManager;
    }

    // TODO: Store our tasks locally in the repo and auto update every now and then
    async initialize(): Promise<void> {
        if (this.isLoaded) return;
        if (this.loadPromise) return this.loadPromise;
        
        this.loadPromise = this.loadAllTierData()
            .then(data => this.buildTasksFromTierData(data))
            .then(() => { this.isLoaded = true; })
            .catch(error => {
                console.error('Failed to load tasks:', error);
                this.isLoaded = false;
                throw error;
            });
        
        return this.loadPromise;
    }

    isReady(): boolean {
        return this.isLoaded;
    }

    getTask(id: string): Task | undefined {
        return this.tasks.get(id);
    }

    getAllTasks(): Task[] {
        return Array.from(this.tasks.values());
    }

    getIncompleteTasks(): Task[] {
        return this.getAllTasks().filter(task => task.state === TASK_STATES.INCOMPLETE);
    }

    getCompletedTasks(): Task[] {
        return this.getAllTasks().filter(task => task.state === TASK_STATES.COMPLETE);
    }

    async loadAllTierData(): Promise<TaskRoot[]> {
        const promises = Object.values(TIERS).map(name => fetch(`https://raw.githubusercontent.com/OSRS-Taskman/task-list/refs/heads/main/tiers/${name}.json`).then(r => r.json()));
        return Promise.all(promises);
    }

    buildTasksFromTierData(data: TaskRoot[]): void {
        data.forEach((tierObj: TaskRoot) => {
            tierObj.tasks.forEach((task: TaskInformation) => {
                const taskInstance = new Task({ ...task, tier: tierObj.name, state: TASK_STATES.INCOMPLETE }, this.gameManager);
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