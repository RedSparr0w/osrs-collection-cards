import { TASK_STATES, TIERS } from "./Constants"
import GameManager from "./GameManager"
import Card, { CARD_TYPE } from './Card'

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
  tier?: TIERS
  state?: TASK_STATES
}

export interface Verification {
  method: string
  itemIds?: number[]
  count?: number
  region?: string
  difficulty?: string
}

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
  gameManager: GameManager;

  constructor(taskData: TaskInformation, gameManager: GameManager) {
    Object.assign(this, taskData);
    this.gameManager = gameManager;
  }

  /**
   * Lazily creates and returns a Card for this Task.
   * The Card is cached for subsequent calls.
   */
  async getCard() {
    if (!this.card) {
      this.card = new Card({
        taskId: this.id,
        type: CARD_TYPE.BASIC,
        category: this.tier.toUpperCase(),
        title: this.name,
        description: this.tip,
        icon: this.gameManager.wiki.getCollectionLogEntry(this.displayItemId)?.imageUrl || this.imageLink.replace(/(_detail|_\d+)?\.png$/, '_detail.png')?.replace(/_icon(_detail)?/, '') || '',
        smallIcons: this.verification?.itemIds ?? [],
        requiredCount: this.verification?.count || 0,
      }, this.gameManager);
    }
    return this.card;
  }

  clearCard(): void {
    this.card = null;
  }
}
