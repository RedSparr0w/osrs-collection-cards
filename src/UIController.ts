import { LOCAL_STORAGE_BASE_KEY } from "./Constants";
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

  initialize(): void {
    this.setupSettingsMenu();
  }

  private setupSettingsMenu(): void {
    const settingsButton = document.getElementById('settings-button') as HTMLButtonElement;
    const settingsMenu = document.getElementById('settings-menu') as HTMLElement;
    const backgroundButton = document.getElementById('background-button') as HTMLButtonElement;
    const backgroundSubmenu = document.getElementById('background-submenu') as HTMLElement;
    const backgroundDisplay = document.getElementById('background-display') as HTMLElement;
    const logoutButton = document.getElementById('logout-button') as HTMLButtonElement;

    if (!settingsButton || !settingsMenu) return;

    // Toggle main menu on button click
    settingsButton.addEventListener('click', (e) => {
      e.stopPropagation();
      settingsMenu.classList.toggle('hidden');
      if (backgroundSubmenu) {
        backgroundSubmenu.classList.add('hidden');
      }
    });

    // Close menu when clicking outside
    document.addEventListener('click', () => {
      settingsMenu.classList.add('hidden');
      if (backgroundSubmenu) {
        backgroundSubmenu.classList.add('hidden');
      }
    });

    // Prevent menu close when clicking inside menu
    settingsMenu.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Background submenu trigger
    if (backgroundButton && backgroundSubmenu) {
      backgroundButton.addEventListener('click', (e) => {
        e.stopPropagation();

        const menuRect = settingsMenu.getBoundingClientRect();
        const buttonRect = backgroundButton.getBoundingClientRect();
        const offsetTop = buttonRect.top - menuRect.top - 40; // 10px offset for better alignment
        backgroundSubmenu.style.top = `${offsetTop}px`;
        backgroundSubmenu.style.right = '100%';

        backgroundSubmenu.classList.toggle('hidden');
      });

      backgroundSubmenu.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      const backgroundItems = backgroundSubmenu.querySelectorAll('.menu-item');
      backgroundItems.forEach((item) => {
        item.addEventListener('click', () => {
          const background = (item as HTMLButtonElement).textContent || '';
          if (backgroundDisplay) backgroundDisplay.textContent = background;
          console.debug(`Background changed to: ${background}`);
          // TODO: Apply background styling
          backgroundSubmenu.classList.add('hidden');
        });
      });
    }

    // Logout button
    if (logoutButton) {
      logoutButton.addEventListener('click', () => {
        this.logout();
      });
    }
  }

  private logout(): void {
    try {
      localStorage.removeItem(`${LOCAL_STORAGE_BASE_KEY}:current_username`);
      window.location.reload();
    } catch (error) {
      console.error('Error during logout:', error);
    }
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
  
  setButtonLinks(wikiLink: string, chooseCardHandler: () => void, discardHandler: () => void, isSelected: boolean = false): void {
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
    newChooseCardButton.textContent = isSelected ? 'Complete' : 'Choose card';

    newWikiButton.addEventListener('click', () => {
      window.open(wikiLink, '_blank');
    });

    newChooseCardButton.addEventListener('click', chooseCardHandler);
    newDiscardButton.addEventListener('click', discardHandler);
  }
}