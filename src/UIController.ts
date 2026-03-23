import GameManager from "./GameManager";
import { delay } from "./helpers";

export const enum Sections {
  Login = 'login',
  CardGrid = 'card-grid',
}

export default class UIController {
  gameManager: GameManager;

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
  }

  async showSection(sectionId: Sections): Promise<void> {
    const visibleSection = document.querySelector<HTMLElement>(`main > section.visible`);
    const targetSection = document.getElementById(sectionId);

    if (!targetSection) {
      console.warn(`Section with ID "${sectionId}" not found.`);
      return;
    }
    if (visibleSection) {
      visibleSection.style.opacity = '0';
      await delay(500).then(() => {
        visibleSection.classList.remove('visible');
      });
    }

    targetSection.classList.add('visible');
    targetSection.style.opacity = '1';
  }

  async hideSection(sectionId: Sections): Promise<void> {
    const targetSection = document.getElementById(sectionId);
    if (!targetSection) {
      console.warn(`Section with ID "${sectionId}" not found.`);
      return;
    } else {
      targetSection.style.opacity = '0';
      await delay(500).then(() => {
        targetSection.classList.remove('visible');
      });
    }
  }
  
  setButtonLinks(wikiLink: string, chooseCardHandler: () => void, discardHandler: () => void): void {
    const wikiButton = document.getElementById('wiki-button') as HTMLButtonElement;
    const chooseCardButton = document.getElementById('choose-card-button') as HTMLButtonElement;
    const discardButton = document.getElementById('discard-button') as HTMLButtonElement;

    // Clone and replace to remove old event listeners
    wikiButton.replaceWith(wikiButton.cloneNode(true) as HTMLButtonElement);
    chooseCardButton.replaceWith(chooseCardButton.cloneNode(true) as HTMLButtonElement);
    discardButton.replaceWith(discardButton.cloneNode(true) as HTMLButtonElement);

    const newWikiButton = document.getElementById('wiki-button') as HTMLButtonElement;
    const newChooseCardButton = document.getElementById('choose-card-button') as HTMLButtonElement;
    const newDiscardButton = document.getElementById('discard-button') as HTMLButtonElement;

    newWikiButton.addEventListener('click', () => {
      window.open(wikiLink, '_blank');
    });

    newChooseCardButton.addEventListener('click', chooseCardHandler);
    newDiscardButton.addEventListener('click', discardHandler);
  }
}