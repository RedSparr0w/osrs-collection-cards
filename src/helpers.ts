/**
 * Maps a value from one numeric range to another.
 */
export const mapRange = (value: number, inMin: number, inMax: number, outMin: number, outMax: number): number => {
	return outMin + ((value - inMin) * (outMax - outMin)) / (inMax - inMin);
};

/**
 * Returns a new array with elements shuffled in a random order (Fisher-Yates).
 */
export const shuffleArray = <T>(array: T[]): T[] => {
	const result = [...array];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
};

export const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export const getNumericCssVar = (element: HTMLElement, name: string, fallback = 0): number => {
  const raw = getComputedStyle(element).getPropertyValue(name).trim();
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : fallback;
}

export const formatUsername = (input: string): string => {
	return input.trim().replace(/\s+/g, '_').toLowerCase();
};
