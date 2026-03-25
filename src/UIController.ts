import { LOCAL_STORAGE_BASE_KEY } from "./Constants";
import { TASK_STATES, TIERS } from "./Constants";
import GameManager from "./GameManager";
import { delay } from "./helpers";
import type { Settings } from "./SaveController";
import Task from "./Task";

type DeferredInstallPromptEvent = Event & {
  prompt: () => Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type FlameAnchorData = {
  flameX: number;
  flameY: number;
  flameWidth: number;
};

type FlameConfigChangeDetail = {
  background: string;
  flamesEnabled: boolean;
  flameX?: number;
  flameY?: number;
  flameWidth?: number;
};

const FLAME_ANCHOR_EVENT = 'background-flame-anchor-change';

export const enum Sections {
  Login = 'login',
  CardGrid = 'card-grid',
}

export default class UIController {
  gameManager: GameManager;
  private taskStatusFilter: 'all' | TASK_STATES.COMPLETE | TASK_STATES.INCOMPLETE = 'all';
  private taskTierFilter: 'all' | TIERS = 'all';
  private installPrompt: DeferredInstallPromptEvent | null = null;

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
  }

  initialize(): void {
    this.setupSettingsMenu();
    this.setupTaskBrowser();
    this.setupInstallButton();
  }

  private setupInstallButton(): void {
    const installButton = document.getElementById('install') as HTMLButtonElement | null;
    if (!installButton) {
      return;
    }

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.installPrompt = event as DeferredInstallPromptEvent;
      installButton.hidden = false;
    });

    installButton.addEventListener('click', async () => {
      if (!this.installPrompt) {
        return;
      }

      await this.installPrompt.prompt();
      this.installPrompt = null;
      installButton.hidden = true;
    });
  }

  private setupSettingsMenu(): void {
    const settingsButton = document.getElementById('settings-button') as HTMLButtonElement;
    const settingsMenu = document.getElementById('settings-menu') as HTMLElement;
    const backgroundButton = document.getElementById('background-button') as HTMLButtonElement;
    const backgroundSubmenu = document.getElementById('background-submenu') as HTMLElement;
    const backgroundDisplay = document.getElementById('background-display') as HTMLElement;
    const flamesToggleButton = document.getElementById('flames-toggle-button') as HTMLButtonElement;
    const flamesToggleDisplay = document.getElementById('flames-toggle-display') as HTMLElement;
    const logoutButton = document.getElementById('logout-button') as HTMLButtonElement;
    const taskBrowserPanel = document.getElementById('task-browser-panel') as HTMLElement;

    if (!settingsButton || !settingsMenu) return;

    // Toggle main menu on button click
    settingsButton.addEventListener('click', (e) => {
      e.stopPropagation();
      settingsMenu.classList.toggle('hidden');
      if (taskBrowserPanel) {
        taskBrowserPanel.classList.add('hidden');
      }
      if (backgroundSubmenu) {
        backgroundSubmenu.classList.add('hidden');
      }
    });

    // Close menu when clicking outside
    document.addEventListener('click', () => {
      settingsMenu.classList.add('hidden');
      if (taskBrowserPanel) {
        taskBrowserPanel.classList.add('hidden');
      }
      if (backgroundSubmenu) {
        backgroundSubmenu.classList.add('hidden');
      }
    });

    // Prevent menu close when clicking inside menu
    settingsMenu.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    if (taskBrowserPanel) {
      taskBrowserPanel.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    if (flamesToggleButton) {
      flamesToggleButton.addEventListener('click', () => {
        const nextEnabled = document.body.dataset.flamesEnabled !== 'false';
        this.applyFlamesEnabled(!nextEnabled, flamesToggleDisplay);
        this.gameManager.saveController.saveSettings({ flamesEnabled: !nextEnabled });
      });
    }

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
          const btn = item as HTMLButtonElement;
          const value = btn.dataset.background || '';
          const label = btn.textContent || '';
          this.applyBackground(value, label, this.getFlameAnchorData(btn));
          this.gameManager.saveController.saveSettings({ background: value });
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

  private setupTaskBrowser(): void {
    const taskBrowserButton = document.getElementById('task-browser-button') as HTMLButtonElement;
    const taskBrowserPanel = document.getElementById('task-browser-panel') as HTMLElement;
    const taskStatusFilter = document.getElementById('task-status-filter') as HTMLSelectElement;
    const taskTierFilter = document.getElementById('task-tier-filter') as HTMLSelectElement;
    const settingsMenu = document.getElementById('settings-menu') as HTMLElement;
    const backgroundSubmenu = document.getElementById('background-submenu') as HTMLElement;

    if (!taskBrowserButton || !taskBrowserPanel || !taskStatusFilter || !taskTierFilter) {
      return;
    }

    taskBrowserButton.addEventListener('click', (e) => {
      e.stopPropagation();
      taskBrowserPanel.classList.toggle('hidden');
      if (!taskBrowserPanel.classList.contains('hidden')) {
        this.refreshTaskBrowser();
      }
      if (settingsMenu) {
        settingsMenu.classList.add('hidden');
      }
      if (backgroundSubmenu) {
        backgroundSubmenu.classList.add('hidden');
      }
    });

    taskStatusFilter.addEventListener('change', () => {
      this.taskStatusFilter = taskStatusFilter.value as 'all' | TASK_STATES.COMPLETE | TASK_STATES.INCOMPLETE;
      this.refreshTaskBrowser();
    });

    taskTierFilter.addEventListener('change', () => {
      this.taskTierFilter = taskTierFilter.value as 'all' | TIERS;
      this.refreshTaskBrowser();
    });
  }

  refreshTaskBrowser(): void {
    const listElement = document.getElementById('task-browser-list');
    const viewingSummaryElement = document.getElementById('task-browser-summary-viewing');
    const incompleteSummaryElement = document.getElementById('task-browser-summary-incomplete');
    const completeSummaryElement = document.getElementById('task-browser-summary-complete');
    if (!listElement || !viewingSummaryElement || !incompleteSummaryElement || !completeSummaryElement) {
      return;
    }

    const tasks = this.gameManager.taskManager.getAllTasks();
    const filteredTasks = tasks
      .filter((task) => {
        if (this.taskStatusFilter !== 'all' && task.state !== this.taskStatusFilter) {
          return false;
        }
        if (this.taskTierFilter !== 'all' && task.tier !== this.taskTierFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => this.compareTasks(a, b));

    const completed = tasks.filter((task) => task.state === TASK_STATES.COMPLETE).length;
    const incomplete = tasks.filter((task) => task.state === TASK_STATES.INCOMPLETE).length;
    viewingSummaryElement.textContent = `Viewing ${filteredTasks.length}/${tasks.length}`;
    incompleteSummaryElement.textContent = `Incomplete: ${incomplete}`;
    completeSummaryElement.textContent = `Complete: ${completed}`;

    if (filteredTasks.length === 0) {
      listElement.innerHTML = '<div class="task-browser-empty">No tasks match your filters.</div>';
      return;
    }

    listElement.innerHTML = filteredTasks.map((task) => {
      const statusClass = task.state === TASK_STATES.COMPLETE ? 'is-complete' : 'is-incomplete';
      const statusText = task.state === TASK_STATES.COMPLETE ? 'Complete' : 'Incomplete';
      return `
        <div class="task-browser-item ${statusClass}">
          <span class="task-browser-item-tier">${task.tier.toUpperCase()}</span>
          <span class="task-browser-item-name">${task.name}</span>
          <span class="task-browser-item-status">${statusText}</span>
        </div>
      `;
    }).join('');
  }

  private compareTasks(a: Task, b: Task): number {
    const tierOrder: Record<TIERS, number> = {
      [TIERS.EASY]: 0,
      [TIERS.MEDIUM]: 1,
      [TIERS.HARD]: 2,
      [TIERS.ELITE]: 3,
      [TIERS.MASTER]: 4,
      [TIERS.PETS]: 5,
    };

    if (tierOrder[a.tier] !== tierOrder[b.tier]) {
      return tierOrder[a.tier] - tierOrder[b.tier];
    }

    return a.name.localeCompare(b.name);
  }

  loadSettings(): void {
    const settings = this.gameManager.saveController.getSettings();
    if (!settings) return;
    this.applyFlamesEnabled(settings.flamesEnabled);
    if (settings.background) {
      this.applyBackground(settings.background);
    }
  }

  private applyBackground(value: string, label?: string, flameAnchor?: FlameAnchorData | null): void {
    console.debug('Applying background:', encodeURI(value)
  .replace(/\(/g, "%28")
  .replace(/\)/g, "%29"));
    document.body.style.backgroundImage = `url(${encodeURI(value).replace(/\(/g, "%28").replace(/\)/g, "%29")})`;
    const backgroundDisplay = document.getElementById('background-display');
    let resolvedBackgroundButton: HTMLButtonElement | null = null;

    if (backgroundDisplay) {
      if (label) {
        backgroundDisplay.textContent = label;
      } else {
        const match = document.querySelector<HTMLButtonElement>(`#background-submenu .menu-item[data-background="${value}"]`);
        if (match) {
          backgroundDisplay.textContent = match.textContent;
          resolvedBackgroundButton = match;
        }
      }

      if (!resolvedBackgroundButton && label) {
        resolvedBackgroundButton = Array
          .from(document.querySelectorAll<HTMLButtonElement>('#background-submenu .menu-item'))
          .find((button) => (button.textContent || '').trim() === label.trim()) ?? null;
      }
    }

    const anchor = flameAnchor ?? this.getFlameAnchorData(resolvedBackgroundButton);
    if (anchor) {
      document.body.dataset.flameX = `${anchor.flameX}`;
      document.body.dataset.flameY = `${anchor.flameY}`;
      document.body.dataset.flameWidth = `${anchor.flameWidth}`;
    } else {
      delete document.body.dataset.flameX;
      delete document.body.dataset.flameY;
      delete document.body.dataset.flameWidth;
    }

    const detail: FlameConfigChangeDetail = {
      background: value,
      flamesEnabled: document.body.dataset.flamesEnabled !== 'false',
    };

    if (anchor) {
      detail.flameX = anchor.flameX;
      detail.flameY = anchor.flameY;
      detail.flameWidth = anchor.flameWidth;
    }

    document.body.dispatchEvent(new CustomEvent(FLAME_ANCHOR_EVENT, { detail }));
  }

  private getFlameAnchorData(button?: HTMLButtonElement | null): FlameAnchorData | null {
    if (!button) {
      return null;
    }

    const x = Number.parseFloat(button.dataset.flameX ?? '');
    const y = Number.parseFloat(button.dataset.flameY ?? '');
    const width = Number.parseFloat(button.dataset.flameWidth ?? '');

    if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(width)) {
      return null;
    }

    return {
      flameX: x,
      flameY: y,
      flameWidth: width,
    };
  }

  private applyFlamesEnabled(enabled: boolean, display?: HTMLElement | null): void {
    document.body.dataset.flamesEnabled = enabled ? 'true' : 'false';

    const targetDisplay = display ?? document.getElementById('flames-toggle-display');
    if (targetDisplay) {
      targetDisplay.textContent = enabled ? 'On' : 'Off';
    }

    const background = this.gameManager.saveController.getSettings().background;
    const currentButton = document.querySelector<HTMLButtonElement>(`#background-submenu .menu-item[data-background="${background}"]`);
    const anchor = this.getFlameAnchorData(currentButton);
    const detail: FlameConfigChangeDetail = {
      background,
      flamesEnabled: enabled,
    };

    if (anchor) {
      detail.flameX = anchor.flameX;
      detail.flameY = anchor.flameY;
      detail.flameWidth = anchor.flameWidth;
    }

    document.body.dispatchEvent(new CustomEvent(FLAME_ANCHOR_EVENT, { detail }));
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