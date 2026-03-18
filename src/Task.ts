import { TASK_STATES, TIERS } from "./Constants"

export interface TaskRoot {
  name: TIERS,
  tasks: TaskInformation[]
}

export interface TaskInformation {
  id: string
  name: string
  tip: string
  wikiLink: string
  imageLink: string
  displayItemId: number
  verification: Verification
}

export interface Verification {
  method: string
  itemIds?: number[]
  count?: number
  region?: string
  difficulty?: string
}

TIERS

export default class Task implements TaskInformation {
  tier: TIERS  = TIERS.EASY
  id = ''
  name = ''
  tip = ''
  wikiLink = ''
  imageLink = ''
  displayItemId = 0
  verification = { method: '' } as Verification
  state: TASK_STATES = TASK_STATES.INCOMPLETE

  constructor(taskData: Partial<TaskInformation> = {}) {
    Object.assign(this, taskData);
  }

  static from(taskData: TaskInformation | Task = {} as TaskInformation) {
    return taskData instanceof Task ? taskData : new Task(taskData);
  }
}
