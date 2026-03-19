import Card from './Card';
import { mapRange } from './helpers';

export default class CardController {
	private activeCard: Card | null = null;
	private activeCardElement: HTMLElement | null = null;

  // When selecting a card, it will be the active card
	activate(card: Card, element: HTMLElement): void {
		if (this.activeCard && this.activeCardElement) {
			this.clearTransforms(this.activeCardElement);
			this.activeCard.setActive(false);
		}

		this.setActiveSizeForViewport(element);
		card.setActive(true);
		this.activeCard = card;
		this.activeCardElement = element;

		requestAnimationFrame(() => {
			if (this.activeCardElement !== element) return;
			this.updateCenterOffset(element);
			requestAnimationFrame(() => {
				if (this.activeCardElement !== element) return;
				this.updateCenterOffset(element);
				this.apply3dTransforms(element);
			});
		});
	}

  // Remove our active state from the currently active card, if it exists
	deactivate(): void {
		if (this.activeCardElement) {
			this.clearTransforms(this.activeCardElement);
		}
		if (this.activeCard) {
			this.activeCard.setActive(false);
		}
		this.activeCard = null;
		this.activeCardElement = null;
	}

	isActive(element: HTMLElement): boolean {
		return this.activeCardElement === element;
	}

	bindResize(): void {
		window.addEventListener('resize', () => {
			if (this.activeCardElement) {
				this.setActiveSizeForViewport(this.activeCardElement);
				this.updateCenterOffset(this.activeCardElement);
			}
		});
	}

	private getNumericCssVar(element: HTMLElement, name: string, fallback = 0): number {
		const raw = getComputedStyle(element).getPropertyValue(name).trim();
		const value = Number.parseFloat(raw);
		return Number.isFinite(value) ? value : fallback;
	}

	private clearTransforms(element: HTMLElement): void {
		element.style.setProperty('--active-x', '0px');
		element.style.setProperty('--active-y', '0px');
		element.style.removeProperty('--active-size');
		element.style.removeProperty('--active-rotate-x');
		element.style.removeProperty('--active-rotate-z');
		element.style.removeProperty('--brightness');
	}

	private setActiveSizeForViewport(element: HTMLElement): void {
		const currentSize = this.getNumericCssVar(element, '--active-size', 1) || 1;
		const baseHeight = element.offsetHeight / currentSize;
		if (!baseHeight) return;
		const targetHeight = window.innerHeight * 0.8;
		const nextSize = targetHeight / baseHeight;
		element.style.setProperty('--active-size', `${nextSize}`);
	}

	private updateCenterOffset(element: HTMLElement): void {
		let centerX = element.offsetLeft + element.offsetWidth / 2;
		let centerY = element.offsetTop + element.offsetHeight / 2;
		let parent = element.offsetParent as HTMLElement | null;

		while (parent) {
			centerX += parent.offsetLeft - parent.scrollLeft;
			centerY += parent.offsetTop - parent.scrollTop;
			parent = parent.offsetParent as HTMLElement | null;
		}

		const targetX = window.innerWidth / 2 - centerX;
		const targetY = window.innerHeight / 2 - centerY;
		element.style.setProperty('--active-x', `${targetX}px`);
		element.style.setProperty('--active-y', `${targetY}px`);
	}

	private apply3dTransforms(element: HTMLElement): void {
		const onPointerMove = (e: PointerEvent) => {
			if (this.activeCardElement !== element) {
				document.body.removeEventListener('pointermove', onPointerMove);
				element.style.removeProperty('--active-rotate-x');
				element.style.removeProperty('--active-rotate-z');
				element.style.removeProperty('--brightness');
				return;
			}

			const maxRotation = 5;
			const rect = element.getBoundingClientRect();
			const deltaX = e.clientX - rect.left;
			const deltaY = e.clientY - rect.top;
			const localX = Math.max(0, Math.min(rect.width, deltaX));
			const localY = Math.max(0, Math.min(rect.height, deltaY));
			const rotateX = mapRange(localY, 0, rect.height, maxRotation / 2, -maxRotation / 2);
			const rotateZ = mapRange(localX, 0, rect.width, -maxRotation / 2, maxRotation / 2);
			element.style.setProperty('--active-rotate-x', `${rotateX}deg`);
			element.style.setProperty('--active-rotate-z', `${rotateZ}deg`);
			const brightness = mapRange(localY, 0, rect.height, 1.1, 0.9);
			element.style.setProperty('--brightness', `${brightness}`);
		};

		document.body.addEventListener('pointermove', onPointerMove);
	}
}
