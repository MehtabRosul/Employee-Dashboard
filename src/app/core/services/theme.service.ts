import { Injectable, signal, effect, inject } from '@angular/core';
import { StorageService } from './storage.service';

export type Theme = 'light' | 'dark';

/**
 * Theme service for managing light/dark mode with persistence
 */
@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    private readonly THEME_KEY = 'employee-dashboard-theme';
    private storage = inject(StorageService);

    // Reactive theme signal
    theme = signal<Theme>(this.getInitialTheme());

    constructor() {
        // Apply theme on initialization
        this.applyTheme(this.theme());

        // Load stored theme asynchronously
        this.loadFromStorage();

        // Watch for theme changes and persist
        effect(() => {
            const currentTheme = this.theme();
            this.storage.set(this.THEME_KEY, currentTheme);
            this.applyTheme(currentTheme);
        });
    }

    private async loadFromStorage(): Promise<void> {
        const stored = await this.storage.get<Theme>(this.THEME_KEY);
        if (stored === 'light' || stored === 'dark') {
            this.theme.set(stored);
        }
    }

    /**
     * Toggle between light and dark theme
     */
    toggleTheme(): void {
        this.theme.set(this.theme() === 'light' ? 'dark' : 'light');
    }

    /**
     * Set specific theme
     */
    setTheme(theme: Theme): void {
        this.theme.set(theme);
    }

    /**
     * Get initial theme from system preference
     */
    private getInitialTheme(): Theme {
        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }

        return 'light';
    }

    /**
     * Apply theme to document
     */
    private applyTheme(theme: Theme): void {
        const root = document.documentElement;

        if (theme === 'dark') {
            root.classList.add('dark-theme');
            root.classList.remove('light-theme');
        } else {
            root.classList.add('light-theme');
            root.classList.remove('dark-theme');
        }

        // Update meta theme-color for mobile browsers
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', theme === 'dark' ? '#0f172a' : '#ffffff');
        }
    }
}
