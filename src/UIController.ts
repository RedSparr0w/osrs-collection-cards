import { delay } from "./helpers";

export const enum Sections {
  Login = 'login',
  CardGrid = 'card-grid',
}

export default class UIController {

  constructor() {}

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
}