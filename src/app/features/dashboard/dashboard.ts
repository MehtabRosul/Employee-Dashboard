import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { EmployeeService } from '../../core/services/employee.service';
import { EmployeeStats } from '../../core/models/employee.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard implements OnInit {
  stats$!: Observable<EmployeeStats>;

  constructor(private employeeService: EmployeeService) { }

  ngOnInit(): void {
    this.stats$ = this.employeeService.getStatistics();
  }

  exportCSV(): void {
    this.employeeService.exportToCSV();
  }

  getDepartmentIcon(dept: string): string {
    const icons: { [key: string]: string } = {
      'Engineering': 'terminal-code',
      'Design': 'creative-layers',
      'Marketing': 'dynamic-megaphone',
      'Sales': 'growth-chart',
      'HR': 'heart-people',
      'Finance': 'secure-vault',
      'Operations': 'motion-gears',
      'Support': 'active-support'
    };
    return icons[dept] || 'clipboard-document';
  }
}
