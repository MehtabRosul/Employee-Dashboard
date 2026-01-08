import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet, Router, NavigationEnd, RouterLinkActive } from '@angular/router';
import { ThemeToggle } from '../../shared/components/theme-toggle/theme-toggle';
import { filter, map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet, RouterLinkActive, ThemeToggle],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {
  private router = inject(Router);

  sidebarCollapsed = signal(false);

  currentRoute = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(event => event.urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  getPageTitle() {
    const url = this.currentRoute();
    if (url?.includes('/employees')) return 'Employees';
    return 'Dashboard';
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }
}
