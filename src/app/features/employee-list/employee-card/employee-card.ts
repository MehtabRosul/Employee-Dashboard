import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Employee, Department, EmployeeStatus } from '../../../core/models/employee.model';

@Component({
  selector: 'app-employee-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './employee-card.html',
  styleUrl: './employee-card.scss',
})
export class EmployeeCard {
  @Input({ required: true }) employee!: Employee;
  @Output() edit = new EventEmitter<Employee>();
  @Output() delete = new EventEmitter<Employee>();

  onEdit(): void {
    this.edit.emit(this.employee);
  }

  onDelete(): void {
    this.delete.emit(this.employee);
  }

  getDepartmentColor(dept: Department): string {
    const colors: Record<Department, string> = {
      [Department.HR]: '#ec4899',
      [Department.Engineering]: '#8b5cf6',
      [Department.Sales]: '#10b981',
      [Department.Marketing]: '#f59e0b',
      [Department.Finance]: '#3b82f6',
      [Department.Operations]: '#6366f1',
      [Department.Design]: '#f43f5e',
      [Department.Support]: '#14b8a6'
    };
    return colors[dept] || '#6366f1';
  }

  getStatusBadgeClass(status: EmployeeStatus): string {
    return status === EmployeeStatus.Active ? 'badge-success' :
      status === EmployeeStatus.OnLeave ? 'badge-warning' :
        'badge-secondary';
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
