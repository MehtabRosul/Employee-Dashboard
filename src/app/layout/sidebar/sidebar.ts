import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  menuItems = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Employees', icon: 'people', route: '/employees' }
  ];

  secondaryItems = [
    { label: 'Departments', icon: 'work', route: '/dashboard' }, // Placeholder routes
    { label: 'Analytics', icon: 'analytics', route: '/dashboard' },
    { label: 'Settings', icon: 'settings', route: '/dashboard' }
  ];
}
