import { TASK_STATES, TIERS } from "./Constants"
import GameManager from "./GameManager"
import Wiki from "./Wiki"

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
      const Card = (await import('./Card')).default;
      const { CARD_TYPE } = await import('./Card');
      this.card = new Card({
        type: CARD_TYPE.BASIC,
        category: this.tier.toUpperCase(),
        title: this.name,
        description: this.tip,
        icon: this.gameManager.wiki.getCollectionLogEntry(this.displayItemId)?.imageUrl || this.imageLink.replace(/(_detail|_\d+)?\.png$/, '_detail.png')?.replace(/_icon(_detail)?/, '') || '',
        smallIcons: [this.verification.itemIds ? this.verification.itemIds.map(id => this.gameManager.wiki.getCollectionLogEntry(id)?.iconUrl || '') : []]
          .flat()
          .filter(Boolean),
      });
    }
    return this.card;
  }
}
