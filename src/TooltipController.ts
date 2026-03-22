export default class TooltipController {
	private tooltipElement: HTMLDivElement;
	private activeTarget: HTMLElement | null = null;

	constructor() {
		this.tooltipElement = document.createElement('div');
		this.tooltipElement.className = 'item-tooltip';
		this.tooltipElement.setAttribute('role', 'tooltip');
		this.tooltipElement.hidden = true;
		document.body.appendChild(this.tooltipElement);

		document.addEventListener('pointerover', this.handlePointerOver);
		document.addEventListener('pointermove', this.handlePointerMove);
		document.addEventListener('pointerout', this.handlePointerOut);
		document.addEventListener('focusin', this.handleFocusIn);
		document.addEventListener('focusout', this.handleFocusOut);
	}

	private getTooltipTarget(eventTarget: EventTarget | null): HTMLElement | null {
		if (!(eventTarget instanceof Element)) {
			return null;
		}

		const target = eventTarget.closest<HTMLElement>('[data-item-name]');
		if (!target?.dataset.itemName?.trim()) {
			return null;
		}

		return target;
	}

	private showTooltip(target: HTMLElement): void {
		const itemName = target.dataset.itemName?.trim();
		if (!itemName) {
			this.hideTooltip();
			return;
		}

		this.activeTarget = target;
		this.tooltipElement.textContent = itemName;
		this.tooltipElement.hidden = false;
		target.setAttribute('aria-describedby', 'item-tooltip');
		this.tooltipElement.id = 'item-tooltip';
	}

	private hideTooltip(): void {
		if (this.activeTarget) {
			this.activeTarget.removeAttribute('aria-describedby');
		}

		this.activeTarget = null;
		this.tooltipElement.hidden = true;
	}

	private positionTooltip(clientX: number, clientY: number): void {
		if (this.tooltipElement.hidden) {
			return;
		}

		const offset = 14;
		const maxLeft = window.innerWidth - this.tooltipElement.offsetWidth - 12;
		const maxTop = window.innerHeight - this.tooltipElement.offsetHeight - 12;
		const left = Math.min(Math.max(12, clientX + offset), Math.max(12, maxLeft));
		const top = Math.min(Math.max(12, clientY + offset), Math.max(12, maxTop));

		this.tooltipElement.style.left = `${left}px`;
		this.tooltipElement.style.top = `${top}px`;
	}

	private handlePointerOver = (event: PointerEvent): void => {
		const target = this.getTooltipTarget(event.target);
		if (!target) {
			return;
		}

		this.showTooltip(target);
		this.positionTooltip(event.clientX, event.clientY);
	};

	private handlePointerMove = (event: PointerEvent): void => {
		if (!this.activeTarget) {
			return;
		}

		this.positionTooltip(event.clientX, event.clientY);
	};

	private handlePointerOut = (event: PointerEvent): void => {
		if (!this.activeTarget) {
			return;
		}

		const nextTarget = this.getTooltipTarget(event.relatedTarget);
		if (nextTarget === this.activeTarget) {
			return;
		}

		this.hideTooltip();
	};

	private handleFocusIn = (event: FocusEvent): void => {
		const target = this.getTooltipTarget(event.target);
		if (!target) {
			return;
		}

		this.showTooltip(target);
		const rect = target.getBoundingClientRect();
		this.positionTooltip(rect.left + rect.width / 2, rect.top);
	};

	private handleFocusOut = (): void => {
		this.hideTooltip();
	};
}