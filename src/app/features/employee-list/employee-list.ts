import { Component, signal, computed, HostListener, ChangeDetectionStrategy, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EmployeeService } from '../../core/services/employee.service';
import { Employee, Department, EmployeeStatus, EmployeeFilters, SortField } from '../../core/models/employee.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employee-list.html',
  styleUrl: './employee-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeAllMenus()',
    '(document:keydown.escape)': 'onEscapeKey()'
  }
})
export class EmployeeList {
  employees$!: Observable<Employee[]>;
  searchQuery = signal('');
  selectedDepartments = signal<Department[]>([]);
  selectedStatuses = signal<EmployeeStatus[]>([]);
  selectedGenders = signal<string[]>([]);
  sortBy = signal<SortField>('name');
  sortOrder = signal<'asc' | 'desc'>('asc');
  viewMode = signal<'grid' | 'table'>('grid');

  // UI State Signals
  deptMenuOpen = signal(false);
  statusMenuOpen = signal(false);
  sortMenuOpen = signal(false);
  searchActive = false;

  // Edit Dialog State
  editDialogOpen = signal(false);
  selectedEmployee = signal<Employee | null>(null);
  editForm = {
    name: '',
    email: '',
    department: Department.Engineering as Department,
    status: EmployeeStatus.Active as EmployeeStatus,
    performance: 80,
    dateOfJoining: '',
    gender: '' as 'Male' | 'Female' | 'Other' | '',
    age: null as number | null
  };

  // Delete Dialog State
  deleteDialogOpen = signal(false);
  deleteVerification = '';
  employeeToDelete = signal<Employee | null>(null);

  // Add Employee Dialog State
  addDialogOpen = signal(false);
  addForm = {
    name: '',
    email: '',
    department: '' as Department | '',
    dateOfJoining: '',
    gender: '' as 'Male' | 'Female' | 'Other' | '',
    age: null as number | null,
    status: EmployeeStatus.Active as EmployeeStatus,
    performance: 0
  };
  formErrors = signal<{ [key: string]: string }>({});
  genderOptions = ['Male', 'Female', 'Other'];
  todayDate = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
  minDate = new Date(new Date().setFullYear(new Date().getFullYear() - 40)).toLocaleDateString('en-CA'); // 40 years ago

  // Notification State
  notification = signal<{
    show: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    progress: number;
  }>({
    show: false,
    type: 'success',
    title: '',
    message: '',
    progress: 100
  });
  private notificationTimer: number | undefined;
  private progressTimer: number | undefined;

  departments = Object.values(Department);
  statuses: EmployeeStatus[] = [EmployeeStatus.Active, EmployeeStatus.OnLeave, EmployeeStatus.Inactive];
  departmentOptions = Object.values(Department);
  statusOptions = Object.values(EmployeeStatus);

  constructor(public employeeService: EmployeeService) { }

  ngOnDestroy(): void {
    if (this.notificationTimer) clearTimeout(this.notificationTimer);
    if (this.progressTimer) clearInterval(this.progressTimer);
  }

  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ngOnInit(): void {
    this.employees$ = this.employeeService.filteredEmployees$;

    // Check for action query param to auto-open add dialog
    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'add') {
        this.openAddDialog();
      }
    });
  }

  isDeptSelected(dept: Department): boolean {
    return this.selectedDepartments().includes(dept);
  }

  isStatusSelected(status: string): boolean {
    return this.selectedStatuses().includes(status as EmployeeStatus);
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
    this.applyFilters();
  }

  toggleDepartment(dept: Department): void {
    const d = dept as Department;
    const current = this.selectedDepartments();
    const index = current.indexOf(d);
    if (index === -1) {
      this.selectedDepartments.set([...current, d]);
    } else {
      this.selectedDepartments.set(current.filter((item: Department) => item !== d));
    }
    this.applyFilters();
  }

  toggleStatus(status: EmployeeStatus): void {
    const s = status as EmployeeStatus;
    const current = this.selectedStatuses();
    const index = current.indexOf(s);
    if (index === -1) {
      this.selectedStatuses.set([...current, s]);
    } else {
      this.selectedStatuses.set(current.filter((item: EmployeeStatus) => item !== s));
    }
    this.applyFilters();
  }

  toggleGender(gender: string): void {
    const current = this.selectedGenders();
    const index = current.indexOf(gender);
    if (index === -1) {
      this.selectedGenders.set([...current, gender]);
    } else {
      this.selectedGenders.set(current.filter((g: string) => g !== gender));
    }
    this.applyFilters();
  }

  getSortLabel(field: SortField): string {
    const currentOrder = this.sortOrder();

    if (field === 'gender') {
      return currentOrder === 'desc' ? 'Male' : 'Female';
    }

    switch (field) {
      case 'name': return 'Name';
      case 'dateOfJoining': return 'Join Date';
      case 'age': return 'Age';
      case 'performance': return 'Performance';
      case 'department': return 'Department';
      case 'email': return 'Email';
      default: return field;
    }
  }

  setSortBy(field: SortField, order?: 'asc' | 'desc'): void {
    if (order) {
      this.sortBy.set(field);
      this.sortOrder.set(order);
    } else if (this.sortBy() === field) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(field);
      this.sortOrder.set('asc');
    }
    this.applyFilters();
  }

  toggleSortOrder(): void {
    this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedDepartments.set([]);
    this.selectedStatuses.set([]);
    this.selectedGenders.set([]);
    this.sortBy.set('name');
    this.sortOrder.set('asc');
    this.applyFilters();
  }

  toggleDeptMenu(event: MouseEvent): void {
    event.stopPropagation();
    const current = this.deptMenuOpen();
    this.closeAllMenus();
    this.deptMenuOpen.set(!current);
  }

  toggleStatusMenu(event: MouseEvent): void {
    event.stopPropagation();
    const current = this.statusMenuOpen();
    this.closeAllMenus();
    this.statusMenuOpen.set(!current);
  }

  toggleSortMenu(event: MouseEvent): void {
    event.stopPropagation();
    const current = this.sortMenuOpen();
    this.closeAllMenus();
    this.sortMenuOpen.set(!current);
  }

  closeAllMenus(): void {
    this.deptMenuOpen.set(false);
    this.statusMenuOpen.set(false);
    this.sortMenuOpen.set(false);
  }

  private applyFilters(): void {
    const filters: EmployeeFilters = {
      searchQuery: this.searchQuery(),
      departments: this.selectedDepartments(),
      status: this.selectedStatuses(),
      genders: this.selectedGenders(), // Ensure gender filter is included
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder()
    };

    this.employeeService.setFilters(filters);
  }

  onEdit(employee: Employee): void {
    this.selectedEmployee.set(employee);
    this.editForm = {
      name: employee.name,
      email: employee.email,
      department: employee.department,
      status: employee.status,
      performance: employee.performance || 80,
      dateOfJoining: new Date(employee.dateOfJoining).toISOString().split('T')[0],
      gender: employee.gender as 'Male' | 'Female' | 'Other',
      age: employee.age
    };
    this.editDialogOpen.set(true);
  }

  closeEditDialog(): void {
    this.editDialogOpen.set(false);
    this.selectedEmployee.set(null);
  }

  saveEmployee(): void {
    const employee = this.selectedEmployee();
    if (!employee) return;

    // Validate form
    if (!this.editForm.name.trim() || !this.editForm.email.trim()) {
      this.showNotification('error', 'Missing Information', 'Please fill in all required fields before saving.');
      return;
    }

    // Standardized Email Validation using RFC 5322 regex (Same as Add Form)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (!emailRegex.test(this.editForm.email)) {
      this.showNotification('error', 'Invalid Email', 'Please enter a valid email address.');
      return;
    }

    // Update employee
    const result = this.employeeService.updateEmployee(employee.id, {
      name: this.editForm.name,
      email: this.editForm.email,
      department: this.editForm.department,
      status: this.editForm.status,
      performance: this.editForm.performance,
      dateOfJoining: new Date(this.editForm.dateOfJoining),
      gender: this.editForm.gender as 'Male' | 'Female' | 'Other',
      age: this.editForm.age as number
    });

    if (result) {
      this.closeEditDialog();
      this.showNotification('success', 'Changes Saved!', `${this.editForm.name}'s information has been updated successfully.`);
    } else {
      this.showNotification('error', 'Update Failed', 'Something went wrong while saving. Please try again or contact support.');
    }
  }

  onDelete(employee: Employee): void {
    this.employeeToDelete.set(employee);
    this.deleteVerification = '';
    this.deleteDialogOpen.set(true);
  }

  closeDeleteDialog(): void {
    this.deleteDialogOpen.set(false);
    this.employeeToDelete.set(null);
    this.deleteVerification = '';
  }

  confirmDelete(): void {
    const employee = this.employeeToDelete();
    if (!employee) return;

    // Verify deletion
    if (this.deleteVerification.toLowerCase() !== 'delete') {
      this.showNotification('warning', 'Verification Required', 'Please type "DELETE" exactly to confirm removal.');
      return;
    }

    const success = this.employeeService.deleteEmployee(employee.id);
    if (success) {
      this.closeDeleteDialog();
      this.showNotification('success', 'Employee Removed', `${employee.name} has been permanently removed from the system.`);
    } else {
      this.showNotification('error', 'Deletion Failed', 'Could not remove this employee. Please refresh and try again.');
    }
  }

  showNotification(type: 'success' | 'error' | 'warning' | 'info', title: string, message: string): void {
    // Clear existing timers
    if (this.notificationTimer) {
      clearTimeout(this.notificationTimer);
    }
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
    }

    // Show notification with full progress
    this.notification.set({ show: true, type, title, message, progress: 100 });

    // Animate progress bar (5 seconds for success/info, 7 seconds for errors/warnings)
    const duration = (type === 'error' || type === 'warning') ? 7000 : 5000;
    const interval = 50;
    const decrement = 100 / (duration / interval);

    this.progressTimer = setInterval(() => {
      const current = this.notification().progress;
      if (current <= 0) {
        clearInterval(this.progressTimer);
      } else {
        this.notification.set({ ...this.notification(), progress: current - decrement });
      }
    }, interval);

    // Auto-dismiss
    this.notificationTimer = setTimeout(() => {
      this.notification.set({ ...this.notification(), show: false });
      if (this.progressTimer) {
        clearInterval(this.progressTimer);
      }
    }, duration);
  }

  dismissNotification(): void {
    if (this.notificationTimer) {
      clearTimeout(this.notificationTimer);
    }
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
    }
    this.notification.set({ ...this.notification(), show: false });
  }

  onEscapeKey(): void {
    if (this.editDialogOpen()) {
      this.closeEditDialog();
    }
    if (this.deleteDialogOpen()) {
      this.closeDeleteDialog();
    }
    if (this.addDialogOpen()) {
      this.closeAddDialog();
    }
  }

  onDialogBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('dialog-overlay')) {
      this.closeEditDialog();
      this.closeDeleteDialog();
      this.closeAddDialog();
    }
  }

  async exportCSV(): Promise<void> {
    try {
      const success = await this.employeeService.exportToCSV();
      // console.log('Export result:', success);

      if (success === true) {
        this.showNotification('success', 'Export Complete!', 'Your employee data has been saved successfully.');
      } else if (success === false) {
        // Check if it was cancelled or if there's no data
        const hasEmployees = (this.employeeService as any).employeesSubject?.value?.length > 0;
        if (!hasEmployees) {
          this.showNotification('error', 'Export Failed', 'No employee data available to export. Please add employees first.');
        }
        // If hasEmployees but success is false, user cancelled - don't show notification
      }
    } catch (error) {
      console.error('Export error:', error);
      this.showNotification('error', 'Export Failed', 'An unexpected error occurred. Please try again.');
    }
  }

  // Add Employee Methods
  openAddDialog(): void {
    this.resetAddForm();
    this.addDialogOpen.set(true);
  }

  closeAddDialog(): void {
    this.addDialogOpen.set(false);
    this.resetAddForm();
    // Clear the query param
    this.router.navigate([], {
      queryParams: { action: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  resetAddForm(): void {
    this.addForm = {
      name: '',
      email: '',
      department: '',
      dateOfJoining: this.todayDate, // Auto-detect present day
      gender: '',
      age: null,
      status: EmployeeStatus.Active,
      performance: 0
    };
    this.formErrors.set({});
  }

  validateAddForm(): boolean {
    const errors: { [key: string]: string } = {};

    // Name validation (Full Name required: at least 2 words, no numbers)
    // Allows letters, spaces, and dots (for initials like "P.").
    const nameRegex = /^[a-zA-Z\s.]+$/;
    const nameParts = this.addForm.name.trim().split(/\s+/);

    if (!this.addForm.name.trim()) {
      errors['name'] = 'Full Name is required';
    } else if (!nameRegex.test(this.addForm.name.trim())) {
      errors['name'] = 'Name must contain only letters, spaces, and dots (no numbers)';
    } else if (nameParts.length < 2) {
      errors['name'] = 'Please enter your full name (First & Last Name)';
    } else if (this.addForm.name.trim().length < 3) {
      errors['name'] = 'Name must be at least 3 characters long';
    }

    // Email validation
    if (!this.addForm.email.trim()) {
      errors['email'] = 'Email is required';
    } else {
      // Stricter email regex: requires local part, @, domain, dot, and TLD (min 2 chars)
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(this.addForm.email)) {
        errors['email'] = 'Please enter a valid, verified email address';
      } else if (this.employeeService.emailExists(this.addForm.email)) {
        errors['email'] = 'This email is already registered';
      }
    }

    // Department validation
    if (!this.addForm.department) {
      errors['department'] = 'Please select a department';
    }

    // Date of Joining validation (cannot be future)
    if (!this.addForm.dateOfJoining) {
      errors['dateOfJoining'] = 'Date of joining is required';
    } else {
      const [year, month, day] = this.addForm.dateOfJoining.split('-').map(Number);
      const joinDate = new Date(year, month - 1, day); // Create local date object
      joinDate.setHours(0, 0, 0, 0); // Normalize to midnight

      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize today to midnight

      if (joinDate > today) {
        errors['dateOfJoining'] = 'Date cannot be in the future';
      }
    }

    // Gender validation
    if (!this.addForm.gender) {
      errors['gender'] = 'Please select a gender';
    }

    // Age validation (18-100)
    if (this.addForm.age === null || this.addForm.age === undefined) {
      errors['age'] = 'Age is required';
    } else if (this.addForm.age < 18) {
      errors['age'] = 'Age must be at least 18';
    } else if (this.addForm.age > 100) {
      errors['age'] = 'Age must be less than 100';
    }

    // Performance is optional, no validation needed (defaults to 0)

    this.formErrors.set(errors);
    return Object.keys(errors).length === 0;
  }

  submitAddEmployee(): void {
    if (!this.validateAddForm()) {
      this.showNotification('warning', 'Form Incomplete', 'Please review and fill in all required fields correctly.');
      return;
    }

    try {
      const newEmployee = this.employeeService.addEmployee({
        name: this.addForm.name.trim(),
        email: this.addForm.email.trim().toLowerCase(),
        department: this.addForm.department as Department,
        dateOfJoining: new Date(this.addForm.dateOfJoining),
        gender: this.addForm.gender as 'Male' | 'Female' | 'Other',
        age: this.addForm.age as number,
        status: this.addForm.status,
        performance: this.addForm.performance
      });

      this.closeAddDialog();
      this.showNotification('success', 'Employee Added!', `${newEmployee.name} has been successfully added to the team.`);
    } catch (error) {
      this.showNotification('error', 'Failed to Add Employee', 'An unexpected error occurred. Please try again or contact support.');
    }
  }

  addEmployee(): void {
    this.openAddDialog();
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  formatDate(date: Date): string {
    const d = new Date(date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }
}

