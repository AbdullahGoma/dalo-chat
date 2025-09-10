import { inject, Injectable, signal } from '@angular/core';
import { LocalStorage } from './local-storage';

@Injectable({
  providedIn: 'root',
})
export class Theme {
  private readonly THEME_KEY = 'theme-preference';
  private localStorage = inject(LocalStorage);

  isDarkMode = signal(false);

  constructor() {
    this.initializeTheme();
  }

  private initializeTheme(): void {
    let savedTheme: 'dark' | 'light' | null = null;

    try {
      savedTheme = this.localStorage.getItem<'dark' | 'light'>(this.THEME_KEY);
    } catch (e) {
      console.warn('Corrupted theme data detected. Auto-clearing...');
      this.localStorage.removeItem(this.THEME_KEY);
    }

    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;
    const shouldUseDark = savedTheme === 'dark' || (!savedTheme && prefersDark);

    this.isDarkMode.set(shouldUseDark);
    this.applyTheme(shouldUseDark);

    // Listen for system theme changes
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', (e) => {
        if (!this.localStorage.getItem(this.THEME_KEY)) {
          this.isDarkMode.set(e.matches);
          this.applyTheme(e.matches);
        }
      });
  }

  toggleTheme(): void {
    const newTheme = !this.isDarkMode();
    this.isDarkMode.set(newTheme);
    this.applyTheme(newTheme);

    this.localStorage.setItem(this.THEME_KEY, newTheme ? 'dark' : 'light');
  }

  private applyTheme(isDark: boolean): void {
    const html = document.documentElement;

    if (isDark) {
      html.classList.add('dark');
      html.setAttribute('data-theme', 'dark');
    } else {
      html.classList.remove('dark');
      html.setAttribute('data-theme', 'light');
    }
  }

  setTheme(theme: 'light' | 'dark' | 'system'): void {
    if (theme === 'system') {
      this.localStorage.removeItem(this.THEME_KEY);
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;
      this.isDarkMode.set(prefersDark);
      this.applyTheme(prefersDark);
    } else {
      const isDark = theme === 'dark';
      this.isDarkMode.set(isDark);
      this.applyTheme(isDark);
      this.localStorage.setItem(this.THEME_KEY, theme);
    }
  }
}
