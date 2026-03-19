import { TASK_STATES, TIERS } from "./Constants"
import Wiki from "./Wiki"
const wikiData = new Wiki();
wikiData.loadCollectionLogItems();
wikiData.loadPlayerData('Zamoraky V');

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
  card: any | null = null  // Card instance, lazily generated

  constructor(taskData: Partial<TaskInformation> = {}) {
    Object.assign(this, taskData);
  }

  static from(taskData: TaskInformation | Task = {} as TaskInformation) {
    return taskData instanceof Task ? taskData : new Task(taskData);
  }

  /**
   * Lazily creates and returns a Card for this Task.
   * The Card is cached for subsequent calls.
   */
  async getCard() {
    await wikiData.loadCollectionLogItems(); // Ensure collection log data is loaded
    await wikiData.loadPlayerData('Zamoraky V');

    if (!this.card) {
      const Card = (await import('./Card')).default;
      const { CARD_TYPE } = await import('./Card');
      this.card = new Card({
        type: CARD_TYPE.BASIC,
        category: this.tier.toUpperCase(),
        title: this.name,
        description: this.tip,
        icon: wikiData.getCollectionLogEntry(this.displayItemId)?.imageUrl || this.imageLink.replace(/(_detail)?\.png$/, '_detail.png')?.replace(/_icon(_detail)?/, '') || '',
        smallIcons: [this.verification.itemIds ? this.verification.itemIds.map(id => wikiData.getCollectionLogEntry(id)?.iconUrl || '') : []]
          .flat()
          .filter(Boolean),
      });
    }
    return this.card;
  }
}
