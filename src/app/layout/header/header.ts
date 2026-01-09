import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeToggle } from '../../shared/components/theme-toggle/theme-toggle';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, ThemeToggle],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  unreadNotifications = 3;

  onSearch(event: Event): void {
    // Placeholder for global search
    const query = (event.target as HTMLInputElement).value;
    // console.log('Global search:', query);
  }
}
