import { browser } from '$app/environment';

export type Theme = 'light' | 'dark' | 'system';
const KEY = 'clann-theme';

function applyToDom(t: Theme) {
	if (!browser) return;
	const root = document.documentElement;
	// 'system' removes the attribute so prefers-color-scheme takes over.
	if (t === 'system') delete root.dataset.theme;
	else root.dataset.theme = t;
}

class ThemeState {
	current = $state<Theme>('system');

	/** Sync the store with the value the pre-paint script already applied. */
	init() {
		if (!browser) return;
		const saved = localStorage.getItem(KEY);
		this.current = saved === 'light' || saved === 'dark' ? saved : 'system';
	}

	set(t: Theme) {
		this.current = t;
		if (browser) {
			if (t === 'system') localStorage.removeItem(KEY);
			else localStorage.setItem(KEY, t);
		}
		applyToDom(t);
	}
}

export const theme = new ThemeState();
